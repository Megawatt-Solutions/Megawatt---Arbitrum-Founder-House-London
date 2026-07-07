"use client";
// Casino/odometer-style rolling counter. Each digit is a vertical reel; the
// value accrues live via requestAnimationFrame, so the cents spin and carries
// roll up the higher digits — like a mechanical odometer.
//
// Math: for digit place p, offset = digit + roll-in during the lower place's
// last 10%. The reel has a duplicate "0" at the end so the 9→0 wrap is seamless
// (position 10 ≡ position 0 visually). Transforms are driven imperatively each
// frame (no React re-render), and the initial transform is computed in render
// so SSR and first client paint match.
import { useEffect, useMemo, useRef } from "react";

interface Props {
  startValue: number;
  ratePerSecond?: number;
  prefix?: string;
  decimals?: number;
}

const CELLS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

function offsetFor(value: number, place: number, animate: boolean): number {
  const v = value / Math.pow(10, place);
  const floor = Math.floor(v);
  const digit = ((floor % 10) + 10) % 10;
  // Only the last (rightmost) digit rolls; every other digit snaps crisply to
  // its value so the number stays readable (never caught between digits).
  if (!animate) return digit;
  const frac = v - floor;
  return digit + frac; // smooth continuous roll
}

type Token = { type: "reel"; place: number } | { type: "sep"; ch: string };

export function Odometer({ startValue, ratePerSecond = 0.2, prefix = "$", decimals = 2 }: Props) {
  const intLen = Math.max(1, Math.floor(Math.abs(startValue)).toString().length);

  const tokens = useMemo<Token[]>(() => {
    const toks: Token[] = [];
    if (prefix) toks.push({ type: "sep", ch: prefix });
    for (let p = intLen - 1; p >= 0; p--) {
      if (p !== intLen - 1 && (p + 1) % 3 === 0) toks.push({ type: "sep", ch: "," });
      toks.push({ type: "reel", place: p });
    }
    if (decimals > 0) {
      toks.push({ type: "sep", ch: "." });
      for (let d = 1; d <= decimals; d++) toks.push({ type: "reel", place: -d });
    }
    return toks;
  }, [intLen, prefix, decimals]);

  const reelPlaces = useMemo(
    () => tokens.filter((t): t is Extract<Token, { type: "reel" }> => t.type === "reel").map((t) => t.place),
    [tokens]
  );
  const stripRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    let raf = 0;
    let t0 = 0;
    const loop = (ts: number) => {
      if (!t0) t0 = ts;
      const value = startValue + ((ts - t0) / 1000) * ratePerSecond;
      const last = reelPlaces.length - 1;
      for (let i = 0; i < reelPlaces.length; i++) {
        const el = stripRefs.current[i];
        if (el) el.style.transform = `translateY(-${offsetFor(value, reelPlaces[i], i === last)}em)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [startValue, ratePerSecond, reelPlaces]);

  let reelIdx = 0;
  return (
    <span className="odometer">
      {tokens.map((t, i) => {
        if (t.type === "sep") {
          return (
            <span key={i} className={`odo-sep${t.ch === "." || t.ch === "," ? " odo-punct" : ""}`}>
              {t.ch}
            </span>
          );
        }
        const idx = reelIdx++;
        const init = offsetFor(startValue, t.place, idx === reelPlaces.length - 1);
        return (
          <span key={i} className="odo-reel">
            <span
              className="odo-strip"
              ref={(el) => {
                stripRefs.current[idx] = el;
              }}
              style={{ transform: `translateY(-${init}em)` }}
            >
              {CELLS.map((c, j) => (
                <span key={j} className="odo-cell">{c}</span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}
