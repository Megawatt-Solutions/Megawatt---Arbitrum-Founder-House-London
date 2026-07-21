import { NextResponse } from "next/server";
import { archiveDay, isRpcError } from "@/lib/spreadcast/store";
import { BAND_NAMES, bandLabel } from "@/lib/spreadcast/bands";

export const dynamic = "force-dynamic";

// Full audit record for one delivery day: raw published values, the hourly
// aggregation, spread, band outcome, and the post-settlement reveal (every
// commitment with its salt, recomputable against on-chain memos).
export async function GET(_req: Request, ctx: { params: Promise<{ day: string }> }) {
  const { day } = await ctx.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return NextResponse.json({ error: "Bad day." }, { status: 400 });
  try {
    const { round, reveal, error } = await archiveDay(day);
    if (!round) return NextResponse.json({ error: error ?? "Not settled." }, { status: 404 });
    return NextResponse.json({
      day: round.day,
      source: round.source,
      resolution: round.resolution,
      values: round.values,
      hourly: round.hourly,
      spread: round.spread,
      boundaries: round.boundaries,
      outcomeBand: round.outcomeBand,
      outcomeName: BAND_NAMES[round.outcomeBand!],
      outcomeLabel: bandLabel(round.outcomeBand!, round.boundaries),
      settledAt: round.settledAt,
      reveal,
    });
  } catch (e) {
    return NextResponse.json({ error: isRpcError(e) ? e.message : "Game API unreachable." }, { status: 502 });
  }
}
