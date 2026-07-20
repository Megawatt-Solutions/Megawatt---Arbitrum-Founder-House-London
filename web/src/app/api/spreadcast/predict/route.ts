import { NextResponse } from "next/server";
import { submitPrediction, attachCommitTx, getUser } from "@/lib/spreadcast/store";
import { sessionUserId } from "@/lib/spreadcast/session";
import { buildCommitTx } from "@/lib/spreadcast/xrplink";

export async function POST(req: Request) {
  const uid = await sessionUserId();
  if (!uid) return NextResponse.json({ error: "Join with your email first." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { band?: number; exact?: number | null } | null;
  if (body?.band == null) return NextResponse.json({ error: "Pick a band." }, { status: 400 });

  const result = submitPrediction(uid, body.band, body.exact ?? null);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const user = getUser(uid)!;
  const p = result.prediction;
  return NextResponse.json({
    prediction: { day: p.day, band: p.band, exact: p.exact, hash: p.hash },
    // Verified players sign this 1-drop payment in Xaman — the daily
    // on-chain commitment. In demo mode the client can "simulate signing".
    commitTx: result.commitTxNeeded && user.wallet ? buildCommitTx(user.wallet, p.day, p.hash) : null,
  });
}

// Client reports the signed commit tx hash back (Xaman callback in prod).
export async function PUT(req: Request) {
  const uid = await sessionUserId();
  if (!uid) return NextResponse.json({ error: "Join first." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { day?: string; txHash?: string } | null;
  if (!body?.day || !body?.txHash) return NextResponse.json({ error: "day and txHash required." }, { status: 400 });
  const ok = attachCommitTx(uid, body.day, body.txHash);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "No prediction found." }, { status: 404 });
}
