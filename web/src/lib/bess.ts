// ─────────────────────────────────────────────────────────────
// BESS simulator — deterministic, pure functions of (vault, tick).
// No Date.now()/Math.random() so server and client render identically;
// the client drives "live" motion by incrementing `t` on an interval.
// Ported in spirit from the hackathon's bess_simulator.py.
// ─────────────────────────────────────────────────────────────
import type { Vault, BessSnapshot, BatteryUnit, MarketMode } from "./types";

/** Fraction of the year elapsed (≈ mid-June) — keeps YTD figures current
 *  without calling Date during render. */
export const YTD_FRACTION = 0.46;
const TICK_SECONDS = 10; // simulated seconds per tick (like the on-chain poster)

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Produce a live snapshot. `t` is a monotonic tick index (starts at 0 on the
 * server, increments on the client). Everything is a smooth/deterministic
 * function of (seed, t) so values animate without hydration mismatches.
 */
export function simulate(vault: Vault, t: number): BessSnapshot {
  const m = vault.metrics;
  const rnd = mulberry32(vault.seed + Math.floor(t));
  const phase = vault.seed % 7;

  // Smooth state-of-charge oscillation around the baseline.
  const wave = Math.sin(t * 0.045 + phase);
  const socPct = clamp(m.socPct + wave * 11 + (rnd() - 0.5) * 2.5, 8, 98);

  // Slope of the wave → charging vs discharging.
  const slope = Math.cos(t * 0.045 + phase);
  let mode: MarketMode = slope > 0.12 ? "charging" : slope < -0.12 ? "discharging" : "idle";

  const intensity = Math.abs(slope) * (0.55 + rnd() * 0.5);
  const powerKw =
    mode === "charging"
      ? vault.spec.powerKw * intensity
      : mode === "discharging"
      ? -vault.spec.powerKw * intensity
      : vault.spec.powerKw * 0.05;

  // Merchant price: richer during discharge (peak), cheaper while charging.
  const pricePerMwh =
    62 + (mode === "discharging" ? 70 : mode === "charging" ? -18 : 12) + wave * 14 + rnd() * 8;

  // Cumulative counters drift up slowly with t.
  const drift = (t * TICK_SECONDS) / (365 * 24 * 3600); // year-fraction of elapsed sim time
  const chargedMwh = m.chargedMwh * (1 + drift * 1.1);
  const dischargedMwh = m.dischargedMwh * (1 + drift * 1.1);
  const grossYtd = m.grossYtd * (1 + drift * 1.4);
  const netYtd = m.netYtd * (1 + drift * 1.4);
  const activations = m.activations + Math.floor(t / 9);
  const cycles = m.lifetimeCycles + Math.floor((t * TICK_SECONDS) / 3600 / 6);

  // Per-module breakdown for the battery grid viz.
  const units: BatteryUnit[] = [];
  const perUnitRevenue = netYtd / vault.spec.units;
  for (let i = 0; i < vault.spec.units; i++) {
    const v = Math.sin(i * 2.4 + t * 0.04 + phase) * 7;
    units.push({
      id: i + 1,
      socPct: clamp(socPct + v, 5, 100),
      healthPct: clamp(m.healthPct + Math.sin(i * 1.3) * 1.4, 88, 100),
      revenue: perUnitRevenue * (0.9 + (i % 5) * 0.05),
    });
  }

  return {
    t,
    mode,
    socPct,
    healthPct: m.healthPct,
    powerKw,
    pricePerMwh: Math.max(8, pricePerMwh),
    roundTripEff: m.roundTripEff,
    cycles,
    chargedMwh,
    dischargedMwh,
    activations,
    grossYtd,
    netYtd,
    updatedAgoSec: (t % 6) * 2 + 1,
    units,
  };
}

/** Deterministic SoC series for a sparkline / chart. */
export function socSeries(vault: Vault, points = 40): number[] {
  return Array.from({ length: points }, (_, i) => simulate(vault, i * 1.6).socPct);
}

/** Time-to-next-distribution in seconds (deterministic per vault). */
export function nextDistributionSec(vault: Vault): number {
  // ~weekly cadence, offset per vault so they don't all line up.
  const periodSec = 7 * 24 * 3600;
  const offset = (vault.seed % 5) * 24 * 3600 + 12 * 3600;
  return periodSec - offset;
}
