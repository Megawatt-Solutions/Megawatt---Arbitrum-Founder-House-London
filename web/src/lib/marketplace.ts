import type { MarketListing, Vault } from "./types";
import { getVault } from "./vaults";

/** Open secondary-market listings (MPT receipt-token shares).
 * The order book opens with the first vault tokenized on XRPL mainnet. */
export const LISTINGS: MarketListing[] = [];

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
    totalVolume: 0, // opens with the first XRPL-tokenized vault
    avgPremiumBps,
  };
}
