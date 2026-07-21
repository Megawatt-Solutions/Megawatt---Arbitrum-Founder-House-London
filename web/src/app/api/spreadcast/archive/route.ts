import { NextResponse } from "next/server";
import { archive, isRpcError } from "@/lib/spreadcast/store";
import { BAND_NAMES, bandLabel } from "@/lib/spreadcast/bands";

export const dynamic = "force-dynamic";

// Public settlement archive — anyone can audit every delivery day.
export async function GET() {
  try {
    const { rounds, anchors } = await archive();
    return NextResponse.json({
      rounds: rounds.map((r) => ({
        day: r.day,
        spread: r.spread,
        outcomeBand: r.outcomeBand,
        outcomeName: BAND_NAMES[r.outcomeBand!],
        outcomeLabel: bandLabel(r.outcomeBand!, r.boundaries),
        boundaries: r.boundaries,
        source: r.source,
        resolution: r.resolution,
        settledAt: r.settledAt,
      })),
      anchors,
    });
  } catch (e) {
    return NextResponse.json({ error: isRpcError(e) ? e.message : "Game API unreachable." }, { status: 502 });
  }
}
