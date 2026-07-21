import { NextResponse } from "next/server";
import { connectWallet, isRpcError } from "@/lib/spreadcast/store";
import { sessionUserId } from "@/lib/spreadcast/session";

// Prototype wallet connect: accepts an r-address directly and marks the
// player verified. Production replaces this with a Xaman sign-in payload
// so ownership of the address is cryptographically proven.
export async function POST(req: Request) {
  const uid = await sessionUserId();
  if (!uid) return NextResponse.json({ error: "Join first." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { address?: string } | null;
  try {
    const result = await connectWallet(uid, body?.address?.trim() ?? "");
    if (!result.user) return NextResponse.json({ error: result.error ?? "Connect failed." }, { status: 400 });
    const user = result.user;
    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, verified: user.verified, wallet: user.wallet },
      note: process.env.XUMM_API_KEY
        ? undefined
        : "Prototype mode: address accepted without a Xaman signature. Production requires Xaman sign-in.",
    });
  } catch (e) {
    return NextResponse.json({ error: isRpcError(e) ? e.message : "Game API unreachable." }, { status: 502 });
  }
}
