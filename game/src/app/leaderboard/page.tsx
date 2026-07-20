"use client";

import { useEffect, useState } from "react";

interface Row {
  rank: number;
  name: string;
  verified: boolean;
  wallet: string | null;
  points: number;
  played: number;
  correct: number;
  streak: number;
  absError: number | null;
  isDemo: boolean;
}

export default function LeaderboardPage() {
  const [scope, setScope] = useState<"week" | "season">("week");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    setRows(null);
    fetch(`/api/leaderboard?scope=${scope}${verifiedOnly ? "&verified=1" : ""}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setRows(d.rows));
  }, [scope, verifiedOnly]);

  return (
    <>
      <h1>Leaderboard</h1>
      <p className="page-sub">
        10 points per correct band · streak multiplier up to ×3 · ties broken by cumulative exact-guess error.
      </p>
      <div className="lb-controls">
        <div className="seg">
          <button className={scope === "week" ? "on" : ""} onClick={() => setScope("week")}>
            This week
          </button>
          <button className={scope === "season" ? "on" : ""} onClick={() => setScope("season")}>
            Season
          </button>
        </div>
        <div className="seg">
          <button className={!verifiedOnly ? "on" : ""} onClick={() => setVerifiedOnly(false)}>
            Everyone
          </button>
          <button className={verifiedOnly ? "on" : ""} onClick={() => setVerifiedOnly(true)}>
            Verified · prize-eligible
          </button>
        </div>
      </div>
      <div className="panel" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>PLAYER</th>
              <th>WALLET</th>
              <th className="num">POINTS</th>
              <th className="num">PLAYED</th>
              <th className="num">HIT RATE</th>
              <th className="num">STREAK</th>
              <th className="num">TIEBREAK ERR</th>
            </tr>
          </thead>
          <tbody>
            {rows == null ? (
              <tr>
                <td colSpan={8} className="muted">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="muted">
                  Nothing here yet this period.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.rank}>
                  <td className={r.rank === 1 ? "rank-1" : "mono"}>{r.rank}</td>
                  <td>
                    {r.name} {r.verified && <span className="tag v">V</span>}{" "}
                    {r.isDemo && <span className="tag">demo</span>}
                  </td>
                  <td className="mono muted">{r.wallet ?? "—"}</td>
                  <td className="num" style={{ fontWeight: 700 }}>{r.points}</td>
                  <td className="num">{r.played}</td>
                  <td className="num">{r.played ? Math.round((r.correct / r.played) * 100) : 0}%</td>
                  <td className="num">{r.streak > 0 ? <span className="streak-flame">🔥{r.streak}</span> : "—"}</td>
                  <td className="num muted">{r.absError == null ? "—" : r.absError.toFixed(1)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
        Verified = XRPL wallet connected. Prize-eligibility requires verified status; awards are promotional and
        occasional, announced per cycle. Demo rows are seeded players for the prototype.
      </p>
    </>
  );
}
