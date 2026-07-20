import { NextResponse } from "next/server";
import { findOrCreateUser } from "@/lib/spreadcast/store";
import { sessionToken, COOKIE } from "@/lib/spreadcast/session";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: string; name?: string } | null;
  const email = body?.email?.trim() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  const user = findOrCreateUser(email, body?.name ?? "");
  const res = NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, verified: user.verified, wallet: user.wallet },
  });
  res.cookies.set(COOKIE, sessionToken(user.id), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return res;
}
