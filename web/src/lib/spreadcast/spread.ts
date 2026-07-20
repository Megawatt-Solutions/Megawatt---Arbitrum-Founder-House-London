// ── Settlement math ──────────────────────────────────────────────
// Since SDAC moved to 15-minute MTUs (late 2025) the published feed may be
// quarter-hourly. Rule: aggregate published values to HOURLY MEANS first,
// then spread = max(hourly) − min(hourly), EUR/MWh. Negative prices are
// normal on sunny days; max−min handles them.

export function toHourlyMeans(values: number[]): number[] {
  if (values.length === 24) return values.slice();
  if (values.length === 96) {
    const out: number[] = [];
    for (let h = 0; h < 24; h++) {
      const q = values.slice(h * 4, h * 4 + 4);
      out.push(q.reduce((a, b) => a + b, 0) / 4);
    }
    return out;
  }
  // Odd-length days (DST switch) or partial data: bucket by position.
  const per = values.length / 24;
  const out: number[] = [];
  for (let h = 0; h < 24; h++) {
    const seg = values.slice(Math.round(h * per), Math.max(Math.round((h + 1) * per), Math.round(h * per) + 1));
    out.push(seg.reduce((a, b) => a + b, 0) / seg.length);
  }
  return out;
}

export function computeSpread(hourly: number[]): number {
  const max = Math.max(...hourly);
  const min = Math.min(...hourly);
  return Math.round((max - min) * 100) / 100;
}
