import { NextResponse } from "next/server";
import { getDb, getRound, getPrediction, getUser, settledRounds, currentBoundaries } from "@/lib/spreadcast/store";
import { sessionUserId } from "@/lib/spreadcast/session";
import { localTime, openDeliveryDay, addDays, OPEN_MIN, localMomentUtc } from "@/lib/spreadcast/time";
import { bandLabel, BAND_NAMES } from "@/lib/spreadcast/bands";

export const dynamic = "force-dynamic";

export async function GET() {
  getDb(); // advances world state (close/settle/open)
  const now = localTime();
  const uid = await sessionUserId();
  const user = uid ? getUser(uid) : null;

  const openDay = openDeliveryDay(now);
  const round = openDay ? getRound(openDay) : null;
  const latest = settledRounds()[0] ?? null;
  const boundaries = round?.boundaries ?? currentBoundaries();

  const mine = uid && openDay ? getPrediction(uid, openDay) : null;
  const myLatest = uid && latest ? getPrediction(uid, latest.day) : null;

  return NextResponse.json({
    now: { day: now.day, hh: now.hh, mm: now.mm },
    user: user ? { id: user.id, name: user.name, email: user.email, verified: user.verified, wallet: user.wallet } : null,
    open: round
      ? {
          day: round.day,
          closesAt: round.closesAt,
          boundaries: round.boundaries,
          bands: round.boundaries && [0, 1, 2, 3, 4].map((i) => ({ i, name: BAND_NAMES[i], label: bandLabel(i, round.boundaries) })),
          participants: Object.keys((getDb().predictions[round.day] ?? {})).length,
        }
      : {
          nextOpensAt: localMomentUtc(now.day, OPEN_MIN),
          nextDay: addDays(now.day, 2),
        },
    mine: mine ? { band: mine.band, exact: mine.exact, hash: mine.hash, txHash: mine.txHash } : null,
    latest: latest
      ? {
          day: latest.day,
          spread: latest.spread,
          outcomeBand: latest.outcomeBand,
          outcomeLabel: `${BAND_NAMES[latest.outcomeBand!]} · ${bandLabel(latest.outcomeBand!, latest.boundaries)}`,
          source: latest.source,
          hourly: latest.hourly,
          mine: myLatest
            ? { band: myLatest.band, correct: myLatest.correct, points: myLatest.points, streak: myLatest.streak }
            : null,
        }
      : null,
    boundaries,
  });
}
