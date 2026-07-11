"use client";
// ─────────────────────────────────────────────────────────────
// Wallet + toast providers. Connects to the injected wallet
// (MetaMask et al.), switches it to Arbitrum Sepolia, and keeps a
// live MockUSDC balance on the profile. KYC level is presented as
// verified — the on-chain CredentialOracle runs in open mode.
// ─────────────────────────────────────────────────────────────
import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import type { UserProfile } from "./types";
import { injected, ensureChain, readUsdcBalance, fromUsdc6, errMessage } from "./web3";

interface WalletState {
  connected: boolean;
  connecting: boolean;
  profile: UserProfile | null;
  connect: () => void;
  disconnect: () => void;
  /** Re-read on-chain balances for the connected account. */
  refresh: () => Promise<void>;
}

const WalletContext = createContext<WalletState | null>(null);

/** Set when the user explicitly disconnects; blocks silent auto-reconnect. */
const DISCONNECTED_KEY = "mw.walletDisconnected";

export interface Toast {
  id: number;
  message: string;
  type: "default" | "success";
}
interface ToastState {
  toasts: Toast[];
  notify: (message: string, type?: Toast["type"]) => void;
}
const ToastContext = createContext<ToastState | null>(null);

function buildProfile(address: string, usdcBalance: number): UserProfile {
  return {
    address,
    kycLevel: 2,
    kycIssuer: "Megawatt Compliance · CredentialOracle",
    kycIssuedAt: "2026-07-10",
    usdcBalance,
  };
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(1);
  const notify = useCallback((message: string, type: Toast["type"] = "default") => {
    const id = idRef.current++;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const adopt = useCallback(async (address: string) => {
    let balance = 0;
    try {
      balance = fromUsdc6(await readUsdcBalance(address));
    } catch {
      // RPC hiccup — profile still connects; balance refreshes later.
    }
    setProfile(buildProfile(address, balance));
    setConnected(true);
  }, []);

  const connect = useCallback(async () => {
    const eth = injected();
    if (!eth) {
      notify("No wallet found — install MetaMask to connect");
      return;
    }
    setConnecting(true);
    try {
      localStorage.removeItem(DISCONNECTED_KEY);
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      if (!accounts?.length) throw new Error("No account authorized");
      await ensureChain(eth);
      await adopt(accounts[0]);
    } catch (e) {
      notify(errMessage(e));
    } finally {
      setConnecting(false);
    }
  }, [adopt, notify]);

  const disconnect = useCallback(() => {
    localStorage.setItem(DISCONNECTED_KEY, "1");
    setConnected(false);
    setProfile(null);
    // Ask the wallet to forget the site permission entirely so the next
    // connect re-prompts; older wallets without revoke just fall back to
    // the local flag above.
    injected()
      ?.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] })
      .catch(() => {});
  }, []);

  const refresh = useCallback(async () => {
    const address = profile?.address;
    if (!address) return;
    try {
      const balance = fromUsdc6(await readUsdcBalance(address));
      setProfile((p) => (p && p.address === address ? { ...p, usdcBalance: balance } : p));
    } catch {
      // keep the stale balance on RPC failure
    }
  }, [profile?.address]);

  // Silent reconnect for already-authorized accounts + wallet event wiring.
  useEffect(() => {
    const eth = injected();
    if (!eth) return;

    if (!localStorage.getItem(DISCONNECTED_KEY)) {
      (eth.request({ method: "eth_accounts" }) as Promise<string[]>)
        .then((accounts) => {
          if (accounts?.length) void adopt(accounts[0]);
        })
        .catch(() => {});
    }

    const onAccounts = (...args: unknown[]) => {
      if (localStorage.getItem(DISCONNECTED_KEY)) return;
      const accounts = args[0] as string[];
      if (accounts?.length) void adopt(accounts[0]);
      else {
        setConnected(false);
        setProfile(null);
      }
    };
    const onChain = () => window.location.reload();
    eth.on?.("accountsChanged", onAccounts);
    eth.on?.("chainChanged", onChain);
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, [adopt]);

  return (
    <WalletContext.Provider value={{ connected, connecting, profile, connect, disconnect, refresh }}>
      <ToastContext.Provider value={{ toasts, notify }}>
        {children}
        <ToastViewport />
      </ToastContext.Provider>
    </WalletContext.Provider>
  );
}

function ToastViewport() {
  const ctx = useContext(ToastContext);
  if (!ctx) return null;
  return (
    <div className="toasts">
      {ctx.toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type === "success" ? "toast-success" : ""}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within AppProviders");
  return ctx;
}

export function useToast(): ToastState {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within AppProviders");
  return ctx;
}
