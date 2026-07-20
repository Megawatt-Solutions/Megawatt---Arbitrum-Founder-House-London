import type { Position } from "./types";
import { getVault } from "./vaults";

/** The connected user's positions (MPT receipt-token holdings).
 * Empty until vault tokenization opens on XRPL mainnet. */
export const POSITIONS: Position[] = [];

export interface PortfolioMetrics {
  totalDeposited: number;
  totalClaimable: number;
  totalClaimed: number;
  lifetimeYield: number;
  avgApyBps: number;
  positionsCount: number;
  currentValue: number;
}

export function portfolioMetrics(): PortfolioMetrics {
  const totalDeposited = POSITIONS.reduce((s, p) => s + p.deposited, 0);
  const totalClaimable = POSITIONS.reduce((s, p) => s + p.claimable, 0);
  const totalClaimed = POSITIONS.reduce((s, p) => s + p.claimed, 0);
  const weightedApy = POSITIONS.reduce((s, p) => {
    const v = getVault(p.vaultId);
    return s + (v ? v.apyBps * p.deposited : 0);
  }, 0);
  return {
    totalDeposited,
    totalClaimable,
    totalClaimed,
    lifetimeYield: totalClaimable + totalClaimed,
    avgApyBps: totalDeposited > 0 ? Math.round(weightedApy / totalDeposited) : 0,
    positionsCount: POSITIONS.length,
    currentValue: totalDeposited + totalClaimable,
  };
}

export interface GrowthPoint {
  month: string;
  principal: number;
  interest: number;
}

/**
 * Illustrative principal + projected-yield growth at the blended APY.
 * Deposit events align with each vault's commissioning date; interest
 * compounds monthly on active principal. Labelled as projected on the page.
 */
export function growthSeries(): GrowthPoint[] {
  const labels = [
    "Jul '25", "Aug '25", "Sep '25", "Oct '25", "Nov '25", "Dec '25",
    "Jan '26", "Feb '26", "Mar '26", "Apr '26", "May '26", "Jun '26",
    "Jul '26", "Aug '26", "Sep '26", "Oct '26", "Nov '26", "Dec '26",
  ];
  // month index → deposit added that month (none until XRPL fundraising opens)
  const deposits: Record<number, number> = {};
  const monthlyRate = 0.12 / 12;

  let principal = 0;
  let interest = 0;
  return labels.map((month, i) => {
    if (deposits[i]) principal += deposits[i];
    if (i > 0) interest += principal * monthlyRate;
    return { month, principal, interest: Math.round(interest) };
  });
}
