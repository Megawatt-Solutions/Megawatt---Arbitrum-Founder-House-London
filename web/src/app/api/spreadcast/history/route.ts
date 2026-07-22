import { NextResponse } from "next/server";
import { swingHistory, isRpcError } from "@/lib/spreadcast/store";

export const dynamic = "force-dynamic";

// Recent real daily price swings (SI market, ENTSO-E data via Energy-Charts)
// — the Play-tab helper so players can calibrate their prediction.
export async function GET() {
  try {
    return NextResponse.json({ days: await swingHistory() });
  } catch (e) {
    return NextResponse.json({ error: isRpcError(e) ? e.message : "Game API unreachable." }, { status: 502 });
  }
}
