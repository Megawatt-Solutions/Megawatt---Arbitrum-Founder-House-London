// ── Price sources ────────────────────────────────────────────────
// Primary: ENTSO-E Transparency Platform REST API, documentType A44
// (day-ahead prices), bidding zone SI (EIC 10YSI-ELES-----O). Free token.
// Fallback / demo mode: a deterministic simulator that produces realistic
// SI-shaped curves (solar duck curve, evening peak, occasional negative
// midday prices) at 15-minute granularity — so the hourly-mean aggregation
// rule is exercised even without a token.
// TODO(production): add the BSP SouthPool publication cross-check.

import { toHourlyMeans } from "./spread";

export const SI_EIC = "10YSI-ELES-----O";

export interface DayPrices {
  source: "entsoe" | "simulated";
  resolution: "PT15M" | "PT60M";
  values: number[]; // as published (96 or 24)
  hourly: number[]; // aggregated hourly means
}

// Deterministic PRNG per delivery day so the demo archive is stable.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function daySeed(day: string): number {
  let h = 2166136261;
  for (const c of day) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function simulateDay(day: string): DayPrices {
  const rnd = mulberry32(daySeed(day));
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = date.getUTCDay();
  const weekend = dow === 0 || dow === 6;
  const month = m - 1;

  // Seasonal base level and solar strength.
  const winter = Math.cos(((month + 0.5) / 12) * 2 * Math.PI); // 1 in Jan, -1 in Jul
  const base = 78 + winter * 18 + (rnd() - 0.5) * 30 - (weekend ? 14 : 0);
  const sunny = Math.max(0, Math.min(1, 0.35 - winter * 0.3 + (rnd() - 0.35) * 0.9));
  const tight = rnd() < 0.12; // scarcity evenings → wild spreads
  const vol = 6 + rnd() * 10;

  const values: number[] = [];
  for (let q = 0; q < 96; q++) {
    const h = q / 4;
    // Morning and evening peaks, night trough.
    let p = base;
    p += 24 * Math.exp(-((h - 8.2) ** 2) / 4);
    p += (tight ? 95 : 34) * Math.exp(-((h - 19.6) ** 2) / 3.2);
    p -= 26 * Math.exp(-((h - 3.5) ** 2) / 9);
    // Solar dip mid-day — can push negative on bright weekends.
    p -= sunny * (weekend ? 105 : 82) * Math.exp(-((h - 12.8) ** 2) / 7);
    p += (rnd() - 0.5) * vol;
    values.push(Math.round(p * 100) / 100);
  }
  return { source: "simulated", resolution: "PT15M", values, hourly: toHourlyMeans(values) };
}

// ── ENTSO-E client ───────────────────────────────────────────────

function extractPoints(xml: string): { resolution: string; points: Map<number, number> }[] {
  const series: { resolution: string; points: Map<number, number> }[] = [];
  const periodRe = /<Period>([\s\S]*?)<\/Period>/g;
  let pm: RegExpExecArray | null;
  while ((pm = periodRe.exec(xml))) {
    const block = pm[1];
    const resolution = /<resolution>(.*?)<\/resolution>/.exec(block)?.[1] ?? "PT60M";
    const points = new Map<number, number>();
    const pointRe = /<Point>[\s\S]*?<position>(\d+)<\/position>[\s\S]*?<price\.amount>(-?[\d.]+)<\/price\.amount>[\s\S]*?<\/Point>/g;
    let m: RegExpExecArray | null;
    while ((m = pointRe.exec(block))) points.set(Number(m[1]), Number(m[2]));
    series.push({ resolution, points });
  }
  return series;
}

/** Fetch published day-ahead prices for a delivery day (YYYY-MM-DD, CET).
 * Returns null when the token is missing or the data is not published yet —
 * callers fall back to the simulator in demo mode. */
export async function fetchEntsoeDay(day: string): Promise<DayPrices | null> {
  const token = process.env.ENTSOE_TOKEN;
  if (!token) return null;
  const compact = day.replaceAll("-", "");
  // 22:00/23:00 UTC boundaries wobble with DST; over-fetch and trim server-side.
  const url =
    `https://web-api.tp.entsoe.eu/api?securityToken=${token}` +
    `&documentType=A44&in_Domain=${SI_EIC}&out_Domain=${SI_EIC}` +
    `&periodStart=${compact}0000&periodEnd=${compact}2300`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const xml = await res.text();
    if (xml.includes("<Acknowledgement_MarketDocument")) return null; // no data yet
    const series = extractPoints(xml);
    if (series.length === 0) return null;
    // ENTSO-E omits repeated values (curve type A03): forward-fill positions.
    const best = series.reduce((a, b) => (b.points.size > a.points.size ? b : a));
    const quarter = best.resolution === "PT15M";
    const slots = quarter ? 96 : 24;
    const values: number[] = [];
    let last = 0;
    for (let i = 1; i <= slots; i++) {
      if (best.points.has(i)) last = best.points.get(i)!;
      values.push(last);
    }
    return {
      source: "entsoe",
      resolution: quarter ? "PT15M" : "PT60M",
      values,
      hourly: toHourlyMeans(values),
    };
  } catch {
    return null;
  }
}

export async function getDayPrices(day: string): Promise<DayPrices> {
  return (await fetchEntsoeDay(day)) ?? simulateDay(day);
}
