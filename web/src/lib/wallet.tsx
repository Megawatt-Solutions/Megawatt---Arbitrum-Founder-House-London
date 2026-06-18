"use client";
// ─────────────────────────────────────────────────────────────
// Wallet + toast providers. Wallet state is mocked for the design-first
// build (defaults to connected so the populated UI is visible), but the
// shape matches what an ethers BrowserProvider integration will expose:
// swap `connect()` to request accounts and read the chain.
// ─────────────────────────────────────────────────────────────
import { createContext, useContext, useState, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import type { UserProfile } from "./types";
import { CURRENT_USER } from "./user";

interface WalletState {
  connected: boolean;
  connecting: boolean;
  profile: UserProfile | null;
  connect: () => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState | null>(null);

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

export function AppProviders({ children }: { children: ReactNode }) {
  // Default connected so the populated dashboard/portfolio is visible.
  const [connected, setConnected] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(CURRENT_USER);

  const connect = useCallback(() => {
    setConnecting(true);
    // Mock connect — replace with ethers `eth_requestAccounts` + chain check.
    setTimeout(() => {
      setProfile(CURRENT_USER);
      setConnected(true);
      setConnecting(false);
    }, 450);
  }, []);

  const disconnect = useCallback(() => {
    setConnected(false);
    setProfile(null);
  }, []);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(1);
  const notify = useCallback((message: string, type: Toast["type"] = "default") => {
    const id = idRef.current++;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  return (
    <WalletContext.Provider value={{ connected, connecting, profile, connect, disconnect }}>
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
