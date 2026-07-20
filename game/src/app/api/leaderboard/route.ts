import { NextResponse } from "next/server";
import { leaderboard } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") === "week" ? "week" : "season";
  const verifiedOnly = url.searchParams.get("verified") === "1";
  return NextResponse.json({ scope, verifiedOnly, rows: leaderboard(scope, verifiedOnly) });
}
