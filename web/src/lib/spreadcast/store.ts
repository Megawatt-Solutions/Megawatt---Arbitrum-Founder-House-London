// ── Data layer ───────────────────────────────────────────────────
// Prototype store: a JSON file in game/.data/, shaped 1:1 like the eventual
// Supabase schema (users / rounds / predictions / anchors) so the swap is a
// drop-in. Auto-seeds ~75 days of settled history + demo players on first
// run so leaderboards, streaks and the audit archive are alive immediately.

import fs from "fs";
import path from "path";
import { randomBytes, createHash } from "crypto";
import {
  addDays,
  isMonday,
  isoWeek,
  localTime,
  latestSettleableDelivery,
  openDeliveryDay,
  CLOSE_MIN,
  OPEN_MIN,
  localMomentUtc,
} from "./time";
import { STATIC_BOUNDARIES, bandOf, quintileBoundaries, MIN_HISTORY_FOR_QUINTILES } from "./bands";
import { pointsFor, multiplierFor } from "./scoring";
import { simulateDay, getDayPrices, type DayPrices } from "./prices";
import { commitHash, merkleRoot } from "./merkle";

export interface User {
  id: string;
  email: string;
  name: string;
  wallet: string | null; // XRPL r-address once connected via Xaman
  verified: boolean;
  createdAt: string;
  demo?: boolean;
}

export interface Prediction {
  userId: string;
  day: string;
  band: number;
  exact: number | null; // optional exact-spread tiebreaker guess
  salt: string;
  hash: string; // commit hash (salted) — what verified players sign on-chain
  txHash: string | null; // XRPL commit tx (verified players)
  submittedAt: string;
  // settlement results
  correct?: boolean;
  streak?: number;
  multiplier?: number;
  points?: number;
  absError?: number | null;
}

export interface Round {
  day: string; // delivery day
  opensAt: number; // epoch ms
  closesAt: number;
  boundaries: number[]; // snapshot at open — audit trail
  status: "scheduled" | "open" | "closed" | "settled";
  source?: DayPrices["source"];
  resolution?: DayPrices["resolution"];
  values?: number[];
  hourly?: number[];
  spread?: number;
  outcomeBand?: number;
  settledAt?: string;
}

export interface Anchor {
  week: string;
  root: string;
  leaves: number;
  txHash: string;
  simulated: boolean;
  createdAt: string;
}

interface DB {
  users: User[];
  rounds: Record<string, Round>;
  predictions: Record<string, Record<string, Prediction>>; // day → userId → P
  anchors: Anchor[];
  meta: { boundaries: number[]; lastRecalc: string | null; seededAt: string };
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

let db: DB | null = null;

function persist() {
  if (!db) return;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(db));
}

export function getDb(): DB {
  if (db) return db;
  if (fs.existsSync(DATA_FILE)) {
    db = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) as DB;
  } else {
    db = seed();
    persist();
  }
  // Keep the clock moving between requests/restarts.
  advance();
  return db;
}

export function saveDb() {
  persist();
}

const newId = () => randomBytes(8).toString("hex");
const newSalt = () => randomBytes(16).toString("hex");

// ── round lifecycle ──────────────────────────────────────────────

function makeRound(day: string, boundaries: number[]): Round {
  return {
    day,
    opensAt: localMomentUtc(addDays(day, -2), OPEN_MIN),
    closesAt: localMomentUtc(addDays(day, -1), CLOSE_MIN),
    boundaries: boundaries.slice(),
    status: "open",
  };
}

function recalibrateIfMonday(d: DB, day: string) {
  if (!isMonday(day) || d.meta.lastRecalc === day) return;
  const spreads = Object.values(d.rounds)
    .filter((r) => r.status === "settled" && r.day < day && r.day >= addDays(day, -60))
    .sort((a, b) => (a.day < b.day ? -1 : 1))
    .map((r) => r.spread!)
    .slice(-60);
  const q = quintileBoundaries(spreads);
  if (q) {
    d.meta.boundaries = q;
    d.meta.lastRecalc = day;
  }
}

function settleRoundWith(d: DB, round: Round, prices: DayPrices) {
  round.source = prices.source;
  round.resolution = prices.resolution;
  round.values = prices.values;
  round.hourly = prices.hourly.map((v) => Math.round(v * 100) / 100);
  round.spread = Math.round((Math.max(...round.hourly) - Math.min(...round.hourly)) * 100) / 100;
  round.outcomeBand = bandOf(round.spread, round.boundaries);
  round.status = "settled";
  round.settledAt = new Date().toISOString();

  const preds = d.predictions[round.day] ?? {};
  for (const p of Object.values(preds)) {
    p.correct = p.band === round.outcomeBand;
    if (p.correct) {
      const prev = previousStreak(d, p.userId, round.day);
      p.streak = prev + 1;
      p.multiplier = multiplierFor(p.streak);
      p.points = pointsFor(p.streak);
    } else {
      p.streak = 0;
      p.multiplier = 0;
      p.points = 0;
    }
    p.absError = p.exact == null ? null : Math.round(Math.abs(p.exact - round.spread!) * 100) / 100;
  }
}

/** Streak carried INTO `day`: consecutive correct picks on the immediately
 * preceding delivery days. A skipped day breaks it. */
function previousStreak(d: DB, userId: string, day: string): number {
  let streak = 0;
  let cursor = addDays(day, -1);
  while (true) {
    const p = d.predictions[cursor]?.[userId];
    if (!p || !p.correct) break;
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Advance the world to now: close/settle due rounds (simulator in demo
 * mode, ENTSO-E asynchronously via the jobs route), open the next round,
 * write due weekly anchors. Synchronous on purpose — demo settles must not
 * race page renders. */
export function advance() {
  const d = db!;
  const now = localTime();
  let dirty = false;

  // Settle every delivery day whose settlement moment passed.
  const lastSettleable = latestSettleableDelivery(now);
  const firstDay = d.meta.seededAt;
  for (let day = firstDay; day <= lastSettleable; day = addDays(day, 1)) {
    const r = d.rounds[day];
    if (r && r.status !== "settled") {
      recalibrateIfMonday(d, day);
      settleRoundWith(d, r, simulateDay(day)); // demo path; jobs route re-settles with ENTSO-E
      dirty = true;
    }
  }

  // Close rounds whose gate passed, open the current one.
  const nowMs = Date.now();
  for (const r of Object.values(d.rounds)) {
    if (r.status === "open" && nowMs >= r.closesAt) {
      r.status = "closed";
      dirty = true;
    }
  }
  const openDay = openDeliveryDay(now);
  if (openDay && !d.rounds[openDay]) {
    recalibrateIfMonday(d, openDay);
    d.rounds[openDay] = makeRound(openDay, d.meta.boundaries);
    dirty = true;
  }

  // Weekly anchor: Merkle root over last week's commit hashes, due Sunday 15:00.
  const lastWeekAnySettled = Object.values(d.rounds).some((r) => r.status === "settled");
  if (lastWeekAnySettled) dirty = anchorDueWeeks(d) || dirty;

  if (dirty) persist();
}

function anchorDueWeeks(d: DB): boolean {
  const done = new Set(d.anchors.map((a) => a.week));
  const weeks = new Map<string, string[]>();
  for (const [day, preds] of Object.entries(d.predictions)) {
    if (d.rounds[day]?.status !== "settled") continue;
    const wk = isoWeek(day);
    if (!weeks.has(wk)) weeks.set(wk, []);
    for (const p of Object.values(preds)) weeks.get(wk)!.push(p.hash);
  }
  const currentWeek = isoWeek(localTime().day);
  let dirty = false;
  for (const [wk, leaves] of weeks) {
    if (done.has(wk) || wk >= currentWeek) continue; // anchor once the week is over
    d.anchors.push({
      week: wk,
      root: merkleRoot(leaves),
      leaves: leaves.length,
      txHash: `SIMULATED-${merkleRoot(leaves).slice(0, 16).toUpperCase()}`,
      simulated: true,
      createdAt: new Date().toISOString(),
    });
    dirty = true;
  }
  if (dirty) d.anchors.sort((a, b) => (a.week < b.week ? -1 : 1));
  return dirty;
}

/** Used by the jobs route to re-settle a demo-settled day with real
 * ENTSO-E data (when a token is configured). */
export async function settleWithLiveData(day: string): Promise<Round | null> {
  const d = getDb();
  const r = d.rounds[day];
  if (!r) return null;
  const prices = await getDayPrices(day);
  settleRoundWith(d, r, prices);
  // Downstream streaks may shift — recompute every later settled day.
  let cursor = addDays(day, 1);
  while (d.rounds[cursor]?.status === "settled") {
    settleRoundWith(d, d.rounds[cursor], {
      source: d.rounds[cursor].source!,
      resolution: d.rounds[cursor].resolution!,
      values: d.rounds[cursor].values!,
      hourly: d.rounds[cursor].hourly!,
    });
    cursor = addDays(cursor, 1);
  }
  persist();
  return r;
}

// ── user + prediction API ────────────────────────────────────────

export function findOrCreateUser(email: string, name: string): User {
  const d = getDb();
  const norm = email.trim().toLowerCase();
  let u = d.users.find((x) => x.email === norm);
  if (!u) {
    u = {
      id: newId(),
      email: norm,
      name: name.trim().slice(0, 24) || norm.split("@")[0],
      wallet: null,
      verified: false,
      createdAt: new Date().toISOString(),
    };
    d.users.push(u);
    persist();
  }
  return u;
}

export function getUser(id: string): User | null {
  return getDb().users.find((u) => u.id === id) ?? null;
}

export function connectWallet(userId: string, address: string): User | null {
  const d = getDb();
  const u = d.users.find((x) => x.id === userId);
  if (!u) return null;
  u.wallet = address;
  u.verified = true; // prototype; production verifies via Xaman sign-in
  persist();
  return u;
}

export function submitPrediction(
  userId: string,
  band: number,
  exact: number | null
): { ok: true; prediction: Prediction; commitTxNeeded: boolean } | { ok: false; error: string } {
  const d = getDb();
  const now = localTime();
  const day = openDeliveryDay(now);
  if (!day) return { ok: false, error: "Predictions are closed right now — the next round opens at 15:00." };
  const round = d.rounds[day];
  if (!round || round.status !== "open" || Date.now() >= round.closesAt) {
    return { ok: false, error: "This round just closed." };
  }
  if (!Number.isInteger(band) || band < 0 || band > 4) return { ok: false, error: "Pick one of the five bands." };
  if (exact != null && (!Number.isFinite(exact) || exact < 0 || exact > 4000)) {
    return { ok: false, error: "Exact spread guess must be between 0 and 4000 €/MWh." };
  }
  const user = d.users.find((u) => u.id === userId);
  if (!user) return { ok: false, error: "Sign in first." };

  const salt = newSalt();
  const p: Prediction = {
    userId,
    day,
    band,
    exact,
    salt,
    hash: commitHash(day, band, exact, salt),
    txHash: null,
    submittedAt: new Date().toISOString(),
  };
  if (!d.predictions[day]) d.predictions[day] = {};
  d.predictions[day][userId] = p; // re-submitting before close replaces the pick
  persist();
  return { ok: true, prediction: p, commitTxNeeded: user.verified };
}

export function attachCommitTx(userId: string, day: string, txHash: string): boolean {
  const d = getDb();
  const p = d.predictions[day]?.[userId];
  if (!p) return false;
  p.txHash = txHash.slice(0, 80);
  persist();
  return true;
}

// ── queries ──────────────────────────────────────────────────────

export interface LeaderRow {
  rank: number;
  name: string;
  verified: boolean;
  wallet: string | null;
  points: number;
  played: number;
  correct: number;
  streak: number; // current live streak
  absError: number | null; // cumulative tiebreak error
  isDemo: boolean;
}

export function leaderboard(scope: "week" | "season", verifiedOnly: boolean): LeaderRow[] {
  const d = getDb();
  const week = isoWeek(localTime().day);
  const acc = new Map<string, { points: number; played: number; correct: number; absError: number; guesses: number }>();
  for (const [day, preds] of Object.entries(d.predictions)) {
    if (d.rounds[day]?.status !== "settled") continue;
    if (scope === "week" && isoWeek(day) !== week) continue;
    for (const p of Object.values(preds)) {
      const a = acc.get(p.userId) ?? { points: 0, played: 0, correct: 0, absError: 0, guesses: 0 };
      a.points += p.points ?? 0;
      a.played++;
      if (p.correct) a.correct++;
      if (p.absError != null) {
        a.absError += p.absError;
        a.guesses++;
      }
      acc.set(p.userId, a);
    }
  }
  const lastSettled = Object.values(d.rounds)
    .filter((r) => r.status === "settled")
    .map((r) => r.day)
    .sort()
    .pop();
  const rows: LeaderRow[] = [];
  for (const [userId, a] of acc) {
    const u = d.users.find((x) => x.id === userId);
    if (!u) continue;
    if (verifiedOnly && !u.verified) continue;
    const live = lastSettled ? (d.predictions[lastSettled]?.[userId]?.streak ?? 0) : 0;
    rows.push({
      rank: 0,
      name: u.name,
      verified: u.verified,
      wallet: u.wallet ? `${u.wallet.slice(0, 6)}…${u.wallet.slice(-4)}` : null,
      points: a.points,
      played: a.played,
      correct: a.correct,
      streak: live,
      absError: a.guesses > 0 ? Math.round(a.absError * 100) / 100 : null,
      isDemo: !!u.demo,
    });
  }
  rows.sort((x, y) => y.points - x.points || (x.absError ?? Infinity) - (y.absError ?? Infinity) || y.correct - x.correct);
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows.slice(0, 100);
}

export function getRound(day: string): Round | null {
  return getDb().rounds[day] ?? null;
}

export function settledRounds(): Round[] {
  return Object.values(getDb().rounds)
    .filter((r) => r.status === "settled")
    .sort((a, b) => (a.day > b.day ? -1 : 1));
}

export function getPrediction(userId: string, day: string): Prediction | null {
  return getDb().predictions[day]?.[userId] ?? null;
}

/** Post-settlement reveal: every commitment for the day with its salt, so
 * anyone can recompute hashes and check them against on-chain memos. */
export function revealDay(day: string): { user: string; verified: boolean; band: number; exact: number | null; salt: string; hash: string; txHash: string | null; correct: boolean | null; points: number }[] | null {
  const d = getDb();
  if (d.rounds[day]?.status !== "settled") return null;
  return Object.values(d.predictions[day] ?? {}).map((p) => {
    const u = d.users.find((x) => x.id === p.userId);
    return {
      user: u?.name ?? "?",
      verified: !!u?.verified,
      band: p.band,
      exact: p.exact,
      salt: p.salt,
      hash: p.hash,
      txHash: p.txHash,
      correct: p.correct ?? null,
      points: p.points ?? 0,
    };
  });
}

export function anchors(): Anchor[] {
  return getDb().anchors.slice().reverse();
}

export function currentBoundaries(): number[] {
  return getDb().meta.boundaries;
}

// ── demo seed ────────────────────────────────────────────────────

const DEMO_NAMES = [
  "Tesla_Nikola", "duckcurve", "SolarSince2019", "gridfox", "MWh_hunter", "negativeprices",
  "Ljubljanka", "windguru_si", "peakshaver", "BalkanVolt", "sunrise_trader", "elektrarna",
  "TerawattTim", "koroska_kw", "ELESwatcher", "stormfront", "primorska_sun", "hydro_hana",
  "fifteenminutes", "basepeak", "MariborMW", "cloudy_mind", "voltjeva", "spread_eagle",
  "krsko_neutron", "alpineflow", "SavaRiverRat", "watt_now",
];

function seed(): DB {
  const now = localTime();
  const start = addDays(now.day, -75);
  const d: DB = {
    users: [],
    rounds: {},
    predictions: {},
    anchors: [],
    meta: { boundaries: STATIC_BOUNDARIES.slice(), lastRecalc: null, seededAt: start },
  };

  // Demo players — a mix of verified (wallet) and email-only, varied skill.
  const seededRnd = (() => {
    let s = 42;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  })();
  DEMO_NAMES.forEach((name, i) => {
    const verified = seededRnd() < 0.55;
    d.users.push({
      id: `demo${i.toString().padStart(2, "0")}`,
      email: `${name.toLowerCase()}@demo.spreadcast`,
      name,
      wallet: verified ? `r${createHash("sha1").update(name).digest("hex").slice(0, 24)}` : null,
      verified,
      createdAt: new Date(Date.now() - 80 * 86400000).toISOString(),
      demo: true,
    });
  });
  const skill = new Map(d.users.map((u) => [u.id, 0.22 + seededRnd() * 0.33]));
  const zeal = new Map(d.users.map((u) => [u.id, 0.45 + seededRnd() * 0.5]));

  // Walk history chronologically: recalibrate Mondays, run the round, settle.
  const lastSettleable = latestSettleableDelivery(now);
  for (let day = start; day <= lastSettleable; day = addDays(day, 1)) {
    recalibrateIfMonday(d, day);
    const round = makeRound(day, d.meta.boundaries);
    d.rounds[day] = round;
    const prices = simulateDay(day);
    const outcome = bandOf(
      Math.max(...prices.hourly) - Math.min(...prices.hourly),
      round.boundaries
    );
    d.predictions[day] = {};
    for (const u of d.users) {
      if (seededRnd() > zeal.get(u.id)!) continue;
      // Skill-weighted pick: chance of nailing the band, else near-miss.
      let band: number;
      if (seededRnd() < skill.get(u.id)!) band = outcome;
      else {
        const off = seededRnd() < 0.6 ? 1 : 2;
        band = Math.max(0, Math.min(4, outcome + (seededRnd() < 0.5 ? -off : off)));
        if (band === outcome) band = Math.max(0, Math.min(4, band + (band === 4 ? -1 : 1)));
      }
      const exact = seededRnd() < 0.6 ? Math.round((round.boundaries[Math.min(band, 3)] ?? 200) * (0.7 + seededRnd() * 0.7)) : null;
      const salt = newSalt();
      d.predictions[day][u.id] = {
        userId: u.id,
        day,
        band,
        exact,
        salt,
        hash: commitHash(day, band, exact, salt),
        txHash: u.verified ? `SIMULATED-${createHash("sha1").update(u.id + day).digest("hex").slice(0, 16).toUpperCase()}` : null,
        submittedAt: new Date(localMomentUtc(addDays(day, -1), 9 * 60)).toISOString(),
      };
    }
    settleRoundWith(d, round, prices);
  }

  // Open round for live play (+ demo picks so close feels busy).
  const openDay = openDeliveryDay(now);
  if (openDay && !d.rounds[openDay]) {
    recalibrateIfMonday(d, openDay);
    d.rounds[openDay] = makeRound(openDay, d.meta.boundaries);
    d.predictions[openDay] = {};
    for (const u of d.users) {
      if (seededRnd() > zeal.get(u.id)! * 0.7) continue;
      const band = Math.floor(seededRnd() * 5);
      const salt = newSalt();
      d.predictions[openDay][u.id] = {
        userId: u.id,
        day: openDay,
        band,
        exact: null,
        salt,
        hash: commitHash(openDay, band, null, salt),
        txHash: null,
        submittedAt: new Date().toISOString(),
      };
    }
  }

  db = d;
  anchorDueWeeks(d);
  return d;
}
