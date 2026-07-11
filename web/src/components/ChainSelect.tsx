"use client";
// Header chain selector. Arbitrum Sepolia is the live network; Robinhood
// Chain is a demo-only option (visual switch, no wiring) so the deck shows
// a multichain story.
import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, CheckIcon } from "./Icons";

function ArbitrumMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#213147" />
      <path d="M11 5 L17 16 L14.8 19.5 L8.6 8.9 Z" fill="#12AAFF" />
      <path d="M8.6 10.5 L12.6 17.6 L10.4 21 L5.2 12 Z" fill="#9DCCED" />
    </svg>
  );
}

function RobinhoodMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#0E120D" />
      <path
        d="M17.8 4.2c-4.9.7-8.3 3.4-10.2 8.1-.7 1.8-1.2 3.9-1.4 6.3l-.1 1.2 2.5-1.6c.3-2.7 1-5 2.1-7 1.5-2.7 3.9-4.9 7.1-6.6l.9-.5z"
        fill="#00C805"
      />
    </svg>
  );
}

const CHAINS = [
  { id: "arbitrum", name: "Arbitrum", sub: "Sepolia Testnet", Mark: ArbitrumMark },
  { id: "robinhood", name: "Robinhood", sub: "Robinhood Chain", Mark: RobinhoodMark },
] as const;

type ChainId = (typeof CHAINS)[number]["id"];

export function ChainSelect() {
  const [selected, setSelected] = useState<ChainId>("arbitrum");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const current = CHAINS.find((c) => c.id === selected)!;

  return (
    <div className="chain-select" ref={wrapRef}>
      <button className="chain-btn" onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open}>
        <current.Mark size={16} />
        <span className="chain-btn-name">{current.name}</span>
        <ChevronDownIcon size={13} style={{ color: "var(--muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {open && (
        <div className="chain-menu" role="listbox">
          {CHAINS.map((c) => (
            <button
              key={c.id}
              className="chain-opt"
              role="option"
              aria-selected={selected === c.id}
              onClick={() => {
                setSelected(c.id);
                setOpen(false);
              }}
            >
              <c.Mark size={20} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="chain-opt-name">{c.name}</span>
                <span className="chain-opt-sub">{c.sub}</span>
              </span>
              {selected === c.id && <CheckIcon size={14} style={{ color: "var(--accent)" }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
