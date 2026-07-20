// ── Scoring ──────────────────────────────────────────────────────
// 10 points for the correct band, multiplied by a streak multiplier:
//   streak 1 → ×1.0, 2 → ×1.5, 3 → ×2.0, 4 → ×2.5, 5+ → ×3.0 (cap).
// A wrong pick — or a skipped day — resets the streak. The optional exact
// spread guess is the tiebreaker: lower cumulative absolute error wins ties.

export const BASE_POINTS = 10;
export const MULTIPLIER_CAP = 3;

export function multiplierFor(streak: number): number {
  if (streak <= 1) return 1;
  return Math.min(1 + 0.5 * (streak - 1), MULTIPLIER_CAP);
}

export function pointsFor(streak: number): number {
  return Math.round(BASE_POINTS * multiplierFor(streak));
}
