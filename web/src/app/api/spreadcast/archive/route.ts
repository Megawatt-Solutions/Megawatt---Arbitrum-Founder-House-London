import { NextResponse } from "next/server";
import { settledRounds, anchors } from "@/lib/spreadcast/store";
import { BAND_NAMES, bandLabel } from "@/lib/spreadcast/bands";

export const dynamic = "force-dynamic";

// Public settlement archive — anyone can audit every delivery day.
export async function GET() {
  return NextResponse.json({
    rounds: settledRounds().map((r) => ({
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
    anchors: anchors(),
  });
}
