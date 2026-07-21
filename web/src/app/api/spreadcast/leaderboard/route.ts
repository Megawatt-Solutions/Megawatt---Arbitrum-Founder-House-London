import { NextResponse } from "next/server";
import { leaderboard, isRpcError } from "@/lib/spreadcast/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") === "week" ? "week" : "season";
  const verifiedOnly = url.searchParams.get("verified") === "1";
  try {
    return NextResponse.json({ scope, verifiedOnly, rows: await leaderboard(scope, verifiedOnly) });
  } catch (e) {
    return NextResponse.json({ error: isRpcError(e) ? e.message : "Game API unreachable." }, { status: 502 });
  }
}
