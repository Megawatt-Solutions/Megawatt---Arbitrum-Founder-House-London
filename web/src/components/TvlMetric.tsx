"use client";
// Live TVL hero value: on-chain vault deposits (read from Arbitrum Sepolia)
// plus the value of the operational showcase systems. SSR renders the
// fallback; the live read replaces it client-side and refreshes periodically.
import { useEffect, useState } from "react";
import { readOnchainTvl } from "@/lib/web3";
import { fmtMoney, fmtCompact } from "@/lib/format";

export function TvlMetric({ operational, fallbackOnchain }: { operational: number; fallbackOnchain: number }) {
  const [onchain, setOnchain] = useState(fallbackOnchain);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const v = await readOnchainTvl();
        if (alive) setOnchain(v);
      } catch {
        // transient RPC failure — keep the last value
      }
    };
    load();
    const iv = setInterval(load, 45000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  return (
    <>
      <div className="v2-metric-value num">{fmtMoney(operational + onchain, "USD", 0)}</div>
      <div className="v2-metric-sub">
        {fmtCompact(onchain, "USD")} on-chain deposits · {fmtCompact(operational, "USD")} operational sites
      </div>
    </>
  );
}
