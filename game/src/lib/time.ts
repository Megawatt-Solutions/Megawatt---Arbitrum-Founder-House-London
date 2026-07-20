// ── Market-clock model ───────────────────────────────────────────
// All game times live in Europe/Ljubljana (CET/CEST), matching the
// SDAC day-ahead auction. For a delivery day D:
//   predictions OPEN  at 15:00 on D-2 (right after the previous settlement)
//   predictions CLOSE at 11:45 on D-1 (before the 12:00 SDAC gate closure)
//   auction results publish ~13:00 on D-1; SETTLEMENT runs 15:00 on D-1.
// So between 11:45 and 15:00 local there is a short dead window with no
// round open — the UI counts down to the next open.

export const TZ = "Europe/Ljubljana";

export interface LocalTime {
  day: string; // YYYY-MM-DD in TZ
  hh: number;
  mm: number;
  minutes: number; // minutes since local midnight
}

const dtf = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function localTime(date: Date = new Date()): LocalTime {
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) parts[p.type] = p.value;
  const hh = Number(parts.hour === "24" ? "0" : parts.hour);
  const mm = Number(parts.minute);
  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    hh,
    mm,
    minutes: hh * 60 + mm,
  };
}

/** Add n days to a YYYY-MM-DD string (calendar arithmetic, TZ-safe). */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

export const CLOSE_MIN = 11 * 60 + 45; // 11:45
export const OPEN_MIN = 15 * 60; //       15:00
export const SETTLE_MIN = 15 * 60; //     15:00

/** Delivery day of the round currently open for predictions, or null in the
 * daily dead window (11:45–15:00). */
export function openDeliveryDay(now: LocalTime): string | null {
  if (now.minutes < CLOSE_MIN) return addDays(now.day, 1);
  if (now.minutes >= OPEN_MIN) return addDays(now.day, 2);
  return null;
}

/** Latest delivery day whose settlement time has passed.
 * Settlement for delivery D runs at 15:00 on D-1. */
export function latestSettleableDelivery(now: LocalTime): string {
  return now.minutes >= SETTLE_MIN ? addDays(now.day, 1) : now.day;
}

export function isoWeek(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function isMonday(day: string): boolean {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 1;
}

/** Epoch ms of a local wall-clock moment (minute precision is enough here). */
export function localMomentUtc(day: string, minutes: number): number {
  const [y, m, d] = day.split("-").map(Number);
  // Start from the naive UTC guess, then correct by the zone offset at that
  // instant. One iteration is sufficient for CET/CEST.
  let guess = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
  for (let i = 0; i < 2; i++) {
    const lt = localTime(new Date(guess));
    const gotMin = lt.minutes + (lt.day === day ? 0 : lt.day > day ? 1440 : -1440);
    guess -= (gotMin - minutes) * 60000;
  }
  return guess;
}
