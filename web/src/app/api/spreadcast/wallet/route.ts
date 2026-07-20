import { NextResponse } from "next/server";
import { connectWallet } from "@/lib/spreadcast/store";
import { sessionUserId } from "@/lib/spreadcast/session";

// Prototype wallet connect: accepts an r-address directly and marks the
// player verified. Production replaces this with a Xaman sign-in payload
// (XUMM_API_KEY) so ownership of the address is cryptographically proven.
export async function POST(req: Request) {
  const uid = await sessionUserId();
  if (!uid) return NextResponse.json({ error: "Join first." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { address?: string } | null;
  const address = body?.address?.trim() ?? "";
  if (!/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(address)) {
    return NextResponse.json({ error: "That doesn't look like an XRPL r-address." }, { status: 400 });
  }
  const user = connectWallet(uid, address);
  if (!user) return NextResponse.json({ error: "Session expired — join again." }, { status: 401 });
  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, verified: user.verified, wallet: user.wallet },
    note: process.env.XUMM_API_KEY
      ? undefined
      : "Prototype mode: address accepted without a Xaman signature. Production requires Xaman sign-in.",
  });
}
