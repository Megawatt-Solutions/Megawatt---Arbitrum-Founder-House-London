// ─────────────────────────────────────────────────────────────
// Seed vault data. Two off-chain "showcase" vaults mirror our real
// operational BESS sites; the rest are on-chain investable vaults
// (ERC-4626 + async redeem). `bess-koper-01` reproduces the product
// screenshot so the design is instantly recognisable.
//
// Addresses on on-chain vaults are PLACEHOLDERS until the contracts
// are deployed — the live adapter will overwrite them.
// ─────────────────────────────────────────────────────────────
import type { Vault } from "./types";

export const DEPLOYER = "0x30cA4f7E57B8a4b057f5F358d6697e8b81541a76";

export const VAULTS: Vault[] = [
  // ─── Showcase #1 — Ljubljana (real, operational, off-chain) ───
  {
    id: "bess-ljubljana-01",
    kind: "showcase",
    status: "operational",
    name: "BESS Ljubljana 01",
    shortName: "Ljubljana 01",
    location: "Ljubljana, Slovenia",
    country: "Slovenia",
    flag: "🇸🇮",
    currency: "EUR",
    symbol: "mwLJU01",
    apyBps: 2170, // gross yield on capex (showcase headline)
    split: { depositorBps: 1080, protocolFeeBps: 380, sinkingFundBps: 460, reserveBps: 250 },
    spec: { powerKw: 300, energyKwh: 600, chemistry: "LFP", hasSolar: true, solarKwp: 250, units: 8 },
    metrics: {
      socPct: 64,
      healthPct: 99.5,
      roundTripEff: 0.931,
      lifetimeCycles: 542,
      chargedMwh: 118.4,
      dischargedMwh: 110.2,
      activations: 96,
      grossYtd: 23920,
      netYtd: 19850,
    },
    capex: 240000,
    raised: 240000,
    totalShares: 240000,
    sinkingFundBalance: 9820,
    annualRevenue: 52000,
    annualRevenueRange: [45000, 60000],
    commissioned: "2024-05-01",
    description:
      "Co-located 300 kW / 600 kWh battery + 250 kWp rooftop solar in Ljubljana. Peak-shaving and intraday arbitrage on the Slovenian market. Owned and operated by Megawatt.",
    seed: 101,
  },

  // ─── Showcase #2 — Metlika (real, operational, off-chain) ─────
  {
    id: "bess-metlika-01",
    kind: "showcase",
    status: "operational",
    name: "BESS Metlika 01",
    shortName: "Metlika 01",
    location: "Metlika, Slovenia",
    country: "Slovenia",
    flag: "🇸🇮",
    currency: "USD",
    symbol: "mwMET01",
    apyBps: 3600, // gross yield on capex
    split: { depositorBps: 1800, protocolFeeBps: 600, sinkingFundBps: 750, reserveBps: 450 },
    spec: { powerKw: 3200, energyKwh: 6400, chemistry: "LFP", hasSolar: false, units: 16 },
    metrics: {
      socPct: 73.5,
      healthPct: 99.2,
      roundTripEff: 0.924,
      lifetimeCycles: 1284,
      chargedMwh: 1483.6,
      dischargedMwh: 1364.9,
      activations: 612,
      grossYtd: 414000,
      netYtd: 343200,
    },
    capex: 2500000,
    raised: 2500000,
    totalShares: 2500000,
    sinkingFundBalance: 156000,
    annualRevenue: 900000,
    annualRevenueRange: [820000, 960000],
    commissioned: "2023-09-01",
    description:
      "Utility-scale 3.2 MW / 6.4 MWh lithium battery in Metlika providing frequency regulation (FCR/aFRR) and wholesale arbitrage. Megawatt's flagship operational site.",
    seed: 202,
  },

  // ─── On-chain #1 — Koper 01 (active) — mirrors the screenshot ──
  {
    id: "bess-koper-01",
    kind: "onchain",
    status: "active",
    name: "BESS Koper 01",
    shortName: "Koper 01",
    location: "Koper, Slovenia",
    country: "Slovenia",
    flag: "🇸🇮",
    currency: "EUR",
    symbol: "mwKOP01",
    apyBps: 1200,
    split: { depositorBps: 1200, protocolFeeBps: 450, sinkingFundBps: 550, reserveBps: 350 },
    spec: { powerKw: 3200, energyKwh: 6400, chemistry: "LFP", hasSolar: false, units: 16 },
    metrics: {
      socPct: 73.5,
      healthPct: 99.2,
      roundTripEff: 0.924,
      lifetimeCycles: 1284,
      chargedMwh: 221.84,
      dischargedMwh: 187.07,
      activations: 227,
      grossYtd: 179.53,
      netYtd: 160.47,
    },
    capex: 2200000,
    raised: 2200000,
    totalShares: 2200000,
    sinkingFundBalance: 44.12,
    annualRevenue: 561000,
    yieldDistributed: 76.8,
    yieldClaimed: 27.15,
    commissioned: "2025-11-01",
    addresses: {
      vault: "0x60c22e075d2ce091B1dCD7F01a9e454553a6846A",
      receiptToken: "0xAa045dA85C64E1EF7dB51F90108993EF1F93f91A",
      dataStore: "0x70d7a583Ae844cFA7a2470b0f5173A1d16fD2B6F",
    },
    description:
      "On-chain investable vault backing a 3.2 MW / 6.4 MWh battery in Koper. Yield is distributed to depositors and (fast-follow) ZK-verified against on-chain BESS telemetry.",
    seed: 303,
  },

  // ─── On-chain #2 — Graz 01 (active, more mature) ──────────────
  {
    id: "bess-graz-01",
    kind: "onchain",
    status: "active",
    name: "BESS Graz 01",
    shortName: "Graz 01",
    location: "Graz, Austria",
    country: "Austria",
    flag: "🇦🇹",
    currency: "EUR",
    symbol: "mwGRZ01",
    apyBps: 1150,
    split: { depositorBps: 1150, protocolFeeBps: 450, sinkingFundBps: 600, reserveBps: 350 },
    spec: { powerKw: 2000, energyKwh: 4000, chemistry: "LFP", hasSolar: false, units: 12 },
    metrics: {
      socPct: 58,
      healthPct: 98.7,
      roundTripEff: 0.918,
      lifetimeCycles: 890,
      chargedMwh: 142.1,
      dischargedMwh: 130.4,
      activations: 168,
      grossYtd: 142.88,
      netYtd: 121.3,
    },
    capex: 1400000,
    raised: 1400000,
    totalShares: 1400000,
    sinkingFundBalance: 118.4,
    annualRevenue: 357000,
    yieldDistributed: 1840.5,
    yieldClaimed: 980.0,
    commissioned: "2025-07-15",
    addresses: {
      vault: "0x1bda0E4A69879fdeA8762f4E50452Ec8D43b7420",
      receiptToken: "0x99C552e2218C184EBdebd5f6Fd5d3Ff934358c40",
      dataStore: "0x0FF8cF2C8535A9Dc63b64C2c52dc06ECd8f0291C",
    },
    description:
      "On-chain investable vault backing a 2 MW / 4 MWh battery in Graz, trading on the Austrian balancing market.",
    seed: 404,
  },

  // ─── On-chain #3 — Zagreb 01 (fundraising) ────────────────────
  {
    id: "bess-zagreb-01",
    kind: "onchain",
    status: "fundraising",
    name: "BESS Zagreb 01",
    shortName: "Zagreb 01",
    location: "Zagreb, Croatia",
    country: "Croatia",
    flag: "🇭🇷",
    currency: "EUR",
    symbol: "mwZAG01",
    apyBps: 1250,
    split: { depositorBps: 1250, protocolFeeBps: 450, sinkingFundBps: 550, reserveBps: 350 },
    spec: { powerKw: 2500, energyKwh: 5000, chemistry: "LFP", hasSolar: false, units: 12 },
    metrics: {
      socPct: 0,
      healthPct: 100,
      roundTripEff: 0.93,
      lifetimeCycles: 0,
      chargedMwh: 0,
      dischargedMwh: 0,
      activations: 0,
      grossYtd: 0,
      netYtd: 0,
    },
    capex: 1800000,
    raised: 742000,
    totalShares: 742000,
    sinkingFundBalance: 0,
    annualRevenue: 459000,
    addresses: {
      vault: "0xed1721d50847b59fe80175CE76b9FcA478C08aC9",
      receiptToken: "0xDa977f43C419bD83d7d6a4C933872f011122e3D5",
    },
    description:
      "Fundraising for a 2.5 MW / 5 MWh battery in Zagreb. Capital is drawn down to fund construction once the target is reached.",
    seed: 505,
  },

  // ─── On-chain #4 — Trieste 01 (fundraising, nearly full) ──────
  {
    id: "bess-trieste-01",
    kind: "onchain",
    status: "fundraising",
    name: "BESS Trieste 01",
    shortName: "Trieste 01",
    location: "Trieste, Italy",
    country: "Italy",
    flag: "🇮🇹",
    currency: "EUR",
    symbol: "mwTRS01",
    apyBps: 1180,
    split: { depositorBps: 1180, protocolFeeBps: 450, sinkingFundBps: 520, reserveBps: 350 },
    spec: { powerKw: 1000, energyKwh: 2000, chemistry: "LFP", hasSolar: false, units: 8 },
    metrics: {
      socPct: 0,
      healthPct: 100,
      roundTripEff: 0.927,
      lifetimeCycles: 0,
      chargedMwh: 0,
      dischargedMwh: 0,
      activations: 0,
      grossYtd: 0,
      netYtd: 0,
    },
    capex: 700000,
    raised: 588000,
    totalShares: 588000,
    sinkingFundBalance: 0,
    annualRevenue: 178500,
    addresses: {
      vault: "0xC0fFEe254729296a45a3885639AC7E10F9d54979",
      receiptToken: "0x9A8c4F1B2e3D5a6789012345678901234567aBcD",
    },
    description:
      "Fundraising for a 1 MW / 2 MWh battery in Trieste, targeting intraday arbitrage on the Italian market.",
    seed: 606,
  },

  // ─── On-chain #5 — Belgrade 01 (coming soon) ──────────────────
  {
    id: "bess-belgrade-01",
    kind: "onchain",
    status: "coming_soon",
    name: "BESS Belgrade 01",
    shortName: "Belgrade 01",
    location: "Belgrade, Serbia",
    country: "Serbia",
    flag: "🇷🇸",
    currency: "EUR",
    symbol: "mwBEL01",
    apyBps: 1300,
    split: { depositorBps: 1300, protocolFeeBps: 450, sinkingFundBps: 550, reserveBps: 350 },
    spec: { powerKw: 5000, energyKwh: 10000, chemistry: "LFP", hasSolar: false, units: 20 },
    metrics: {
      socPct: 0,
      healthPct: 100,
      roundTripEff: 0.93,
      lifetimeCycles: 0,
      chargedMwh: 0,
      dischargedMwh: 0,
      activations: 0,
      grossYtd: 0,
      netYtd: 0,
    },
    capex: 3200000,
    raised: 0,
    totalShares: 0,
    sinkingFundBalance: 0,
    annualRevenue: 832000,
    description:
      "Pipeline — a 5 MW / 10 MWh battery in Belgrade. Opens for fundraising next quarter.",
    seed: 707,
  },
];

// ─── Helpers ──────────────────────────────────────────────────

export function getVault(id: string): Vault | undefined {
  return VAULTS.find((v) => v.id === id);
}

export function vaultsByStatus(...statuses: Vault["status"][]): Vault[] {
  return VAULTS.filter((v) => statuses.includes(v.status));
}

export const investableVaults = () => VAULTS.filter((v) => v.kind === "onchain");
export const showcaseVaults = () => VAULTS.filter((v) => v.kind === "showcase");

/** Fundraising progress 0..1 */
export function raiseProgress(v: Vault): number {
  return v.capex > 0 ? Math.min(1, v.raised / v.capex) : 0;
}

/** Gross project yield (sum of the split contributions), in bps. */
export function grossYieldBps(v: Vault): number {
  const s = v.split;
  return s.depositorBps + s.protocolFeeBps + s.sinkingFundBps + s.reserveBps;
}

export interface DashboardMetrics {
  tvl: number;
  replacementFund: number;
  vaultCount: number;
  totalMw: number;
  activeCount: number;
  fundraisingCount: number;
}

/** Aggregate dashboard metrics (mixed currencies treated 1:1 for the headline). */
export function dashboardMetrics(): DashboardMetrics {
  const tvl = VAULTS.reduce(
    (s, v) => s + (v.status === "fundraising" || v.status === "coming_soon" ? v.raised : v.capex),
    0
  );
  return {
    tvl,
    replacementFund: VAULTS.reduce((s, v) => s + v.sinkingFundBalance, 0),
    vaultCount: VAULTS.length,
    totalMw: VAULTS.reduce((s, v) => s + v.spec.powerKw, 0) / 1000,
    activeCount: VAULTS.filter((v) => v.status === "active" || v.status === "operational").length,
    fundraisingCount: VAULTS.filter((v) => v.status === "fundraising").length,
  };
}
