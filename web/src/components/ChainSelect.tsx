"use client";
// Header chain indicator — XRPL mainnet is the protocol's home chain.
// (Single chain by design; the old Arbitrum/Robinhood selector is gone.)

function XrplMark({ size = 16 }: { size?: number }) {
  // Simplified XRPL "X" mark on a dark roundel.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#111418" />
      <path
        d="M6 6.6h2.4l2.5 2.6c.6.6 1.6.6 2.2 0l2.5-2.6H18l-3.9 4c-1.2 1.2-3 1.2-4.2 0L6 6.6Zm0 10.8 3.9-4c1.2-1.2 3-1.2 4.2 0l3.9 4h-2.4l-2.5-2.6a1.55 1.55 0 0 0-2.2 0l-2.5 2.6H6Z"
        fill="#fff"
      />
    </svg>
  );
}

export function ChainSelect() {
  return (
    <div className="chain-select">
      <span className="chain-btn" style={{ cursor: "default" }} title="XRP Ledger · Mainnet">
        <XrplMark size={16} />
        <span className="chain-btn-name">XRPL</span>
        <span className="chain-net">MAINNET</span>
      </span>
    </div>
  );
}
