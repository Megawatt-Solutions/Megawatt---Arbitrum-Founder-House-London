import type { MarketListing, Vault } from "./types";
import { getVault } from "./vaults";

/** Open secondary-market listings (receipt-token shares of on-chain vaults). */
export const LISTINGS: MarketListing[] = [
  { id: "lst-1", vaultId: "bess-zagreb-01", seller: "0x7A23f9C1e4B8d0a5F6c2E91b3D4a8C7e1F0b9D22", shares: 150000, pricePerShare: 1.035, listedAtDaysAgo: 12, estApyBps: 0 },
  { id: "lst-2", vaultId: "bess-trieste-01", seller: "0x3F8b1D6e2A9c4f7B0E5a8C1d2F3e4A5b6C7d8E90", shares: 50000, pricePerShare: 1.045, listedAtDaysAgo: 3, estApyBps: 0 },
  { id: "lst-3", vaultId: "bess-trieste-01", seller: "0x9C2e5A8f1B4d7C0a3E6b9D2c5F8a1B4e7C0d3F66", shares: 40000, pricePerShare: 0.985, listedAtDaysAgo: 6, estApyBps: 0 },
  { id: "lst-4", vaultId: "bess-zagreb-01", seller: "0x1D4a7B0e3C6f9A2b5E8d1C4f7A0b3E6d9C2f5A88", shares: 80000, pricePerShare: 1.01, listedAtDaysAgo: 1, estApyBps: 0 },
  { id: "lst-5", vaultId: "bess-trieste-01", seller: "0x5E8b2C5f8A1d4B7e0C3a6F9b2D5e8A1c4F7b0D33", shares: 120000, pricePerShare: 1.025, listedAtDaysAgo: 20, estApyBps: 0 },
  { id: "lst-6", vaultId: "bess-zagreb-01", seller: "0x8B1e4D7a0C3f6B9e2A5d8C1f4B7e0A3d6C9f2B55", shares: 95000, pricePerShare: 1.02, listedAtDaysAgo: 4, estApyBps: 0 },
];

export interface ListingView {
  listing: MarketListing;
  vault: Vault;
  faceValue: number; // shares × 1.00
  askTotal: number; // shares × pricePerShare
  premiumBps: number; // (pricePerShare − 1) × 10000
  estApyBps: number; // effective APY to buyer at this price
}

export function listingView(l: MarketListing): ListingView | null {
  const vault = getVault(l.vaultId);
  if (!vault) return null;
  const faceValue = l.shares * 1.0;
  const askTotal = l.shares * l.pricePerShare;
  return {
    listing: l,
    vault,
    faceValue,
    askTotal,
    premiumBps: Math.round((l.pricePerShare - 1) * 10000),
    estApyBps: Math.round(vault.apyBps / l.pricePerShare),
  };
}

export function listingViews(): ListingView[] {
  return LISTINGS.map(listingView).filter((v): v is ListingView => v !== null);
}

export interface MarketplaceMetrics {
  openPositions: number;
  listedFaceValue: number;
  totalVolume: number; // cumulative traded to date
  avgPremiumBps: number;
}

export function marketplaceMetrics(): MarketplaceMetrics {
  const views = listingViews();
  const avgPremiumBps =
    views.length > 0
      ? Math.round(views.reduce((s, v) => s + v.premiumBps, 0) / views.length)
      : 0;
  return {
    openPositions: views.length,
    listedFaceValue: views.reduce((s, v) => s + v.faceValue, 0),
    totalVolume: 4623500, // illustrative cumulative secondary volume
    avgPremiumBps,
  };
}
