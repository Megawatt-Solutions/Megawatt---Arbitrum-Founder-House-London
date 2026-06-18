"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@/lib/wallet";
import { fmtAddress } from "@/lib/format";
import { WalletModal } from "./WalletModal";
import { BoltIcon, GridIcon, BriefcaseIcon, StoreIcon, WalletIcon } from "./Icons";

const LINKS = [
  { href: "/", label: "Dashboard", icon: GridIcon },
  { href: "/portfolio", label: "Portfolio", icon: BriefcaseIcon },
  { href: "/marketplace", label: "Marketplace", icon: StoreIcon },
];

export function TopNav() {
  const pathname = usePathname();
  const { connected, connecting, profile, connect } = useWallet();
  const [modal, setModal] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" || pathname.startsWith("/vault") : pathname.startsWith(href);

  return (
    <>
      <nav className="nav">
        <Link href="/" className="nav-brand">
          <span className="nav-logo"><BoltIcon size={17} /></span>
          Megawatt
        </Link>

        <div className="nav-links">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={`nav-link ${isActive(l.href) ? "active" : ""}`}>
              {l.label}
            </Link>
          ))}
        </div>

        <div className="nav-spacer" />

        {connected && profile ? (
          <button className="wallet-pill" onClick={() => setModal(true)}>
            <span className="wallet-avatar" />
            <span className="num">{fmtAddress(profile.address)}</span>
            <span className="wallet-dot" />
          </button>
        ) : (
          <button className="connect-btn" onClick={connect} disabled={connecting}>
            <WalletIcon size={16} />
            {connecting ? "Connecting…" : "Connect Wallet"}
          </button>
        )}
      </nav>

      {modal && <WalletModal onClose={() => setModal(false)} />}
    </>
  );
}
