"use client";
// Public settlement archive — every delivery day auditable: published
// values → hourly means → spread → band, plus the commit-reveal record and
// weekly Merkle anchors.

import { useEffect, useState } from "react";

const BAND_VARS = ["--b0", "--b1", "--b2", "--b3", "--b4"];

interface ArchRound {
  day: string;
  spread: number;
  outcomeBand: number;
  outcomeName: string;
  outcomeLabel: string;
  boundaries: number[];
  source: string;
  resolution: string;
  settledAt: string;
}

interface Anchor {
  week: string;
  root: string;
  leaves: number;
  txHash: string;
  simulated: boolean;
}

interface Detail {
  hourly: number[];
  values: number[];
  resolution: string;
  reveal: { user: string; verified: boolean; band: number; salt: string; hash: string; txHash: string | null; correct: boolean | null; points: number }[];
}

export default function ArchivePage() {
  const [rounds, setRounds] = useState<ArchRound[] | null>(null);
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, Detail>>({});

  useEffect(() => {
    fetch("/api/archive", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setRounds(d.rounds);
        setAnchors(d.anchors);
      });
  }, []);

  const toggle = async (day: string) => {
    if (openDay === day) return setOpenDay(null);
    setOpenDay(day);
    if (!detail[day]) {
      const d = await fetch(`/api/archive/${day}`, { cache: "no-store" }).then((r) => r.json());
      setDetail((prev) => ({ ...prev, [day]: d }));
    }
  };

  return (
    <>
      <h1>Settlement archive</h1>
      <p className="page-sub">
        Official published day-ahead prices are final. Values are aggregated to hourly means, spread = max − min.
        Click a day for the full audit trail including the commit-reveal record.
      </p>

      <div className="panel" style={{ padding: 0, overflowX: "auto", marginBottom: 20 }}>
        <table>
          <thead>
            <tr>
              <th>DELIVERY DAY</th>
              <th className="num">SPREAD €/MWh</th>
              <th>BAND</th>
              <th>BOUNDARIES</th>
              <th>SOURCE</th>
            </tr>
          </thead>
          <tbody>
            {rounds == null ? (
              <tr>
                <td colSpan={5} className="muted">
                  Loading…
                </td>
              </tr>
            ) : (
              rounds.map((r) => (
                <RowGroup key={r.day} r={r} open={openDay === r.day} detail={detail[r.day]} onToggle={() => toggle(r.day)} />
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2>Weekly Merkle anchors</h2>
      <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
        One XRPL transaction per week carries the Merkle root of all predictions and outcomes, so email-only
        players are auditable too. {anchors.some((a) => a.simulated) && "Simulated in the prototype."}
      </p>
      <div className="panel" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>WEEK</th>
              <th>MERKLE ROOT</th>
              <th className="num">LEAVES</th>
              <th>TX</th>
            </tr>
          </thead>
          <tbody>
            {anchors.map((a) => (
              <tr key={a.week}>
                <td className="mono">{a.week}</td>
                <td className="mono muted" style={{ fontSize: 11 }}>{a.root}</td>
                <td className="num">{a.leaves}</td>
                <td className="mono muted" style={{ fontSize: 11 }}>{a.txHash}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function RowGroup({ r, open, detail, onToggle }: { r: ArchRound; open: boolean; detail?: Detail; onToggle: () => void }) {
  const min = detail ? Math.min(...detail.hourly) : 0;
  const max = detail ? Math.max(...detail.hourly) : 1;
  return (
    <>
      <tr className="arch-row" onClick={onToggle}>
        <td className="mono">{open ? "▾ " : "▸ "}{r.day}</td>
        <td className="num" style={{ fontWeight: 700 }}>{r.spread.toFixed(2)}</td>
        <td>
          <span className="band-chip" style={{ "--bc": `var(${BAND_VARS[r.outcomeBand]})` } as React.CSSProperties}>
            {r.outcomeName} · {r.outcomeLabel}
          </span>
        </td>
        <td className="mono muted" style={{ fontSize: 11 }}>{r.boundaries.join(" / ")}</td>
        <td>
          <span className="tag">{r.source === "entsoe" ? "ENTSO-E A44" : "SIMULATED"}</span>{" "}
          <span className="tag">{r.resolution}</span>
        </td>
      </tr>
      {open && (
        <tr className="arch-detail">
          <td colSpan={5}>
            {!detail ? (
              <span className="muted">Loading audit trail…</span>
            ) : (
              <>
                <div className="hourly-grid">
                  {detail.hourly.map((v, i) => {
                    const t = (v - min) / (max - min || 1);
                    return (
                      <div
                        key={i}
                        className="hr"
                        title={`${String(i).padStart(2, "0")}:00 · ${v.toFixed(2)} €/MWh`}
                        style={{
                          height: `${8 + t * 88}%`,
                          alignSelf: "flex-end",
                          background: v < 0 ? "var(--b0)" : `color-mix(in srgb, var(--b4) ${Math.round(t * 100)}%, var(--b1))`,
                        }}
                      />
                    );
                  })}
                </div>
                <p className="muted" style={{ fontSize: 11, margin: "4px 0 12px" }}>
                  {detail.values.length} published values ({detail.resolution}) → 24 hourly means · min{" "}
                  {min.toFixed(2)} / max {max.toFixed(2)} €/MWh
                </p>
                <div style={{ overflowX: "auto" }}>
                  <table>
                    <thead>
                      <tr>
                        <th>PLAYER</th>
                        <th className="num">BAND</th>
                        <th>COMMIT HASH</th>
                        <th>SALT (REVEALED)</th>
                        <th>COMMIT TX</th>
                        <th className="num">PTS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.reveal.slice(0, 12).map((p, i) => (
                        <tr key={i}>
                          <td>
                            {p.user} {p.verified && <span className="tag v">V</span>}
                          </td>
                          <td className="num" style={{ color: p.correct ? "var(--ok)" : "var(--muted)" }}>
                            {p.band}
                            {p.correct ? " ✓" : ""}
                          </td>
                          <td className="mono muted" style={{ fontSize: 10 }}>{p.hash.slice(0, 20)}…</td>
                          <td className="mono muted" style={{ fontSize: 10 }}>{p.salt.slice(0, 16)}…</td>
                          <td className="mono muted" style={{ fontSize: 10 }}>{p.txHash ? `${p.txHash.slice(0, 18)}…` : "—"}</td>
                          <td className="num">{p.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {detail.reveal.length > 12 && (
                    <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>
                      + {detail.reveal.length - 12} more — full record at{" "}
                      <span className="mono">/api/archive/{r.day}</span>
                    </p>
                  )}
                </div>
              </>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
