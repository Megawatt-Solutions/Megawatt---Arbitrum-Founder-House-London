import { NextResponse } from "next/server";
import { getDb, getRound, revealDay } from "@/lib/spreadcast/store";
import { BAND_NAMES, bandLabel } from "@/lib/spreadcast/bands";

export const dynamic = "force-dynamic";

// Full audit record for one delivery day: raw published values, the hourly
// aggregation, spread, band outcome, and the post-settlement reveal (every
// commitment with its salt, recomputable against on-chain memos).
export async function GET(_req: Request, ctx: { params: Promise<{ day: string }> }) {
  getDb();
  const { day } = await ctx.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return NextResponse.json({ error: "Bad day." }, { status: 400 });
  const r = getRound(day);
  if (!r || r.status !== "settled") return NextResponse.json({ error: "Not settled." }, { status: 404 });
  return NextResponse.json({
    day: r.day,
    source: r.source,
    resolution: r.resolution,
    values: r.values,
    hourly: r.hourly,
    spread: r.spread,
    boundaries: r.boundaries,
    outcomeBand: r.outcomeBand,
    outcomeName: BAND_NAMES[r.outcomeBand!],
    outcomeLabel: bandLabel(r.outcomeBand!, r.boundaries),
    settledAt: r.settledAt,
    reveal: revealDay(day),
  });
}
