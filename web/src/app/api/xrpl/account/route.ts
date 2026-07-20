import { NextResponse } from "next/server";
import { XRPL_CHAIN, RLUSD, isXrplAddress, type XrplAccountSnapshot } from "@/lib/xrpl";

// Live XRPL mainnet account lookup: XRP balance (account_info) and RLUSD
// trustline balance (account_lines). Server-side so the browser never talks
// to public XRPL nodes directly (CORS + endpoint hygiene).

async function lookup(address: string): Promise<XrplAccountSnapshot> {
  const { Client } = await import("xrpl");
  let lastErr: unknown = new Error("no endpoint reachable");
  for (const wss of XRPL_CHAIN.wss) {
    const client = new Client(wss, { connectionTimeout: 8000 });
    try {
      await client.connect();
      try {
        const info = await client.request({
          command: "account_info",
          account: address,
          ledger_index: "validated",
        });
        const drops = Number(info.result.account_data.Balance ?? 0);
        let rlusdBalance = 0;
        let rlusdTrustline = false;
        try {
          const lines = await client.request({
            command: "account_lines",
            account: address,
            peer: RLUSD.issuer,
            ledger_index: "validated",
          });
          for (const line of lines.result.lines ?? []) {
            if (line.currency === RLUSD.currencyHex || line.currency === RLUSD.symbol) {
              rlusdTrustline = true;
              rlusdBalance += Math.max(0, Number(line.balance));
            }
          }
        } catch {
          // no lines / peer unknown — treated as no trustline
        }
        return { address, funded: true, xrpBalance: drops / 1_000_000, rlusdBalance, rlusdTrustline };
      } finally {
        await client.disconnect();
      }
    } catch (e) {
      // "Account not found" means a valid, just unfunded address.
      if (e instanceof Error && /actNotFound|Account not found/i.test(e.message)) {
        return { address, funded: false, xrpBalance: 0, rlusdBalance: 0, rlusdTrustline: false };
      }
      lastErr = e;
      try {
        await client.disconnect();
      } catch {}
    }
  }
  throw lastErr;
}

export async function GET(req: Request) {
  const address = new URL(req.url).searchParams.get("address")?.trim() ?? "";
  if (!isXrplAddress(address)) {
    return NextResponse.json({ error: "Not a valid XRPL r-address." }, { status: 400 });
  }
  try {
    return NextResponse.json(await lookup(address));
  } catch {
    return NextResponse.json(
      { error: "Could not reach XRPL mainnet right now — try again in a moment." },
      { status: 502 }
    );
  }
}
