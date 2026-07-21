import { NextResponse } from "next/server";
import { sessionUserId } from "@/lib/spreadcast/session";
import { getUser, getPrediction, attachCommitTx } from "@/lib/spreadcast/store";
import { localTime, openDeliveryDay } from "@/lib/spreadcast/time";
import { buildCommitTx, ANCHOR_ADDRESS } from "@/lib/spreadcast/xrplink";

// Real daily-commit signing via Xaman: POST creates a payload wrapping the
// 1-drop Payment (anchor destination, Make Waves SourceTag, salted-hash
// memo) for the player's wallet; GET polls it and, once signed, attaches
// the on-ledger tx hash to the prediction server-side (we never trust a
// client-reported hash). Falls back to 501 when XUMM keys are absent —
// the client then keeps the simulated-signing demo path.

const KEY = process.env.XUMM_API_KEY;
const SECRET = process.env.XUMM_API_SECRET;

async function sdk() {
  const { XummSdk } = await import("xumm-sdk");
  return new XummSdk(KEY!, SECRET!);
}

export async function POST() {
  const uid = await sessionUserId();
  if (!uid) return NextResponse.json({ error: "Join first." }, { status: 401 });
  if (!KEY || !SECRET) {
    return NextResponse.json({ configured: false, error: "Xaman signing not configured." }, { status: 501 });
  }
  if (!ANCHOR_ADDRESS) {
    return NextResponse.json({ error: "Anchor account not configured." }, { status: 503 });
  }
  const user = getUser(uid);
  if (!user?.verified || !user.wallet) {
    return NextResponse.json({ error: "Connect an XRPL wallet first." }, { status: 400 });
  }
  const day = openDeliveryDay(localTime());
  if (!day) return NextResponse.json({ error: "No round is open right now." }, { status: 400 });
  const prediction = getPrediction(uid, day);
  if (!prediction) return NextResponse.json({ error: "Lock in a forecast first." }, { status: 400 });
  if (prediction.txHash && !prediction.txHash.startsWith("SIMULATED-")) {
    return NextResponse.json({ error: "Today's commit is already signed." }, { status: 409 });
  }
  try {
    const payload = await (await sdk()).payload.create({
      txjson: buildCommitTx(user.wallet, day, prediction.hash) as unknown as Record<string, unknown> as never,
      options: { expire: 5 },
      custom_meta: { identifier: `commit-${day}-${uid}`.slice(0, 40), instruction: `Spreadcast daily commit for ${day}` },
    });
    if (!payload) throw new Error("payload creation returned null");
    return NextResponse.json({ uuid: payload.uuid, qrPng: payload.refs.qr_png, deeplink: payload.next.always, day });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? `Xaman error: ${e.message}` : "Could not reach Xaman." },
      { status: 502 }
    );
  }
}

export async function GET(req: Request) {
  const uid = await sessionUserId();
  if (!uid) return NextResponse.json({ error: "Join first." }, { status: 401 });
  if (!KEY || !SECRET) return NextResponse.json({ error: "Not configured." }, { status: 501 });
  const url = new URL(req.url);
  const uuid = url.searchParams.get("uuid") ?? "";
  const day = url.searchParams.get("day") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(uuid) || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  try {
    const payload = await (await sdk()).payload.get(uuid);
    if (!payload) return NextResponse.json({ error: "Unknown payload." }, { status: 404 });
    const txid = payload.response.txid ?? null;
    if (payload.meta.signed && txid) {
      attachCommitTx(uid, day, txid); // server-observed hash, not client-claimed
    }
    return NextResponse.json({
      opened: payload.meta.app_opened,
      signed: payload.meta.signed,
      cancelled: payload.meta.cancelled,
      expired: payload.meta.expired,
      txHash: payload.meta.signed ? txid : null,
    });
  } catch {
    return NextResponse.json({ error: "Could not reach Xaman." }, { status: 502 });
  }
}
