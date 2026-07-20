import { NextResponse } from "next/server";
import { settleWithLiveData } from "@/lib/spreadcast/store";

// Manual settlement trigger (prototype). Production runs this as a Supabase
// scheduled function at 15:00 CET with retries + the BSP SouthPool fallback
// check. With ENTSOE_TOKEN set it re-settles the day from real A44 data.
export async function POST(req: Request) {
  const adminKey = process.env.ADMIN_KEY;
  if (adminKey && req.headers.get("x-admin-key") !== adminKey) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const body = (await req.json().catch(() => null)) as { day?: string } | null;
  if (!body?.day) return NextResponse.json({ error: "day required." }, { status: 400 });
  const round = await settleWithLiveData(body.day);
  if (!round) return NextResponse.json({ error: "No such round." }, { status: 404 });
  return NextResponse.json({
    day: round.day,
    source: round.source,
    spread: round.spread,
    outcomeBand: round.outcomeBand,
  });
}
