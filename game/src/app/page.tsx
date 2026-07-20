"use client";
// Play page: daily band pick → optional exact-spread tiebreaker → submit.
// Verified players additionally get the 1-drop commit transaction to sign
// (simulated locally until Xaman credentials are configured).

import { useCallback, useEffect, useMemo, useState } from "react";

const BAND_VARS = ["--b0", "--b1", "--b2", "--b3", "--b4"];

interface RoundState {
  now: { day: string; hh: number; mm: number };
  user: { id: string; name: string; email: string; verified: boolean; wallet: string | null } | null;
  open:
    | { day: string; closesAt: number; boundaries: number[]; bands: { i: number; name: string; label: string }[]; participants: number }
    | { nextOpensAt: number; nextDay: string };
  mine: { band: number; exact: number | null; hash: string; txHash: string | null } | null;
  latest: {
    day: string;
    spread: number;
    outcomeLabel: string;
    outcomeBand: number;
    source: string;
    hourly: number[];
    mine: { band: number; correct: boolean; points: number; streak: number } | null;
  } | null;
  boundaries: number[];
}

function useCountdown(target: number | null) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!target) return;
    const tick = () => setLeft(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  if (left == null) return "—";
  const s = Math.floor(left / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export default function PlayPage() {
  const [state, setState] = useState<RoundState | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [exact, setExact] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [wallet, setWallet] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "err" | "ok"; text: string } | null>(null);
  // Account-side messages (join / wallet connect) render next to those forms.
  const [acctMsg, setAcctMsg] = useState<{ kind: "err" | "ok"; text: string } | null>(null);
  const [commit, setCommit] = useState<{ hash: string; signed: boolean } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/round", { cache: "no-store" });
    const data = (await res.json()) as RoundState;
    setState(data);
    if (data.mine) {
      setSel(data.mine.band);
      setExact(data.mine.exact != null ? String(data.mine.exact) : "");
      setCommit((c) => c ?? { hash: data.mine!.hash, signed: !!data.mine!.txHash });
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const isOpen = state?.open && "day" in state.open;
  const closesAt = isOpen ? (state!.open as { closesAt: number }).closesAt : null;
  const opensAt = !isOpen && state?.open ? (state.open as { nextOpensAt: number }).nextOpensAt : null;
  const countdown = useCountdown(isOpen ? closesAt : opensAt);

  const join = async () => {
    setBusy(true);
    setAcctMsg(null);
    const res = await fetch("/api/join", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, name }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setAcctMsg({ kind: "err", text: data.error });
    load();
  };

  const connect = async () => {
    setBusy(true);
    setAcctMsg(null);
    const res = await fetch("/api/wallet", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ address: wallet }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setAcctMsg({ kind: "err", text: data.error });
    setAcctMsg({ kind: "ok", text: data.note ?? "Wallet connected — you're verified." });
    load();
  };

  const submit = async () => {
    if (sel == null) return setMsg({ kind: "err", text: "Pick a band first." });
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/predict", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ band: sel, exact: exact.trim() === "" ? null : Number(exact) }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setMsg({ kind: "err", text: data.error });
    setCommit({ hash: data.prediction.hash, signed: false });
    setMsg({ kind: "ok", text: "Forecast locked in. You can change it until close." });
    load();
  };

  // Demo-mode stand-in for the Xaman sign flow: reports a simulated tx hash.
  const simulateSign = async () => {
    if (!commit || !state?.mine) return;
    setBusy(true);
    const day = (state.open as { day: string }).day;
    const fakeTx = `SIMULATED-${commit.hash.slice(0, 16).toUpperCase()}`;
    await fetch("/api/predict", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ day, txHash: fakeTx }),
    });
    setBusy(false);
    setCommit({ ...commit, signed: true });
    setMsg({ kind: "ok", text: "Commit signature recorded (simulated — Xaman signing arrives with API keys)." });
  };

  if (!state) return <p className="muted">Loading the market…</p>;

  const bands = isOpen
    ? (state.open as { bands: { i: number; name: string; label: string }[] }).bands
    : null;
  const latest = state.latest;
  const hourlyMin = latest ? Math.min(...latest.hourly) : 0;
  const hourlyMax = latest ? Math.max(...latest.hourly) : 1;

  return (
    <>
      <div className="play-top">
        <div>
          <h1>
            Call tomorrow&apos;s <span style={{ color: "var(--volt)" }}>spread</span>.
          </h1>
          <p className="page-sub" style={{ marginBottom: 0 }}>
            Which band does the SI day-ahead daily price spread (max − min hourly, €/MWh) land in
            {isOpen ? ` for ${(state.open as { day: string }).day}?` : "?"} Free to play, every day.
          </p>
        </div>
        <div className="countdown">
          {countdown}
          <small>{isOpen ? "UNTIL CLOSE · 11:45 CET" : "NEXT ROUND OPENS · 15:00 CET"}</small>
        </div>
      </div>

      <div className="play-grid">
        <div>
          {isOpen && bands ? (
            <div className="panel">
              <span className="tick tl" />
              <span className="tick tr" />
              <span className="tick bl" />
              <span className="tick br" />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <h2 style={{ marginBottom: 0 }}>Delivery day {(state.open as { day: string }).day}</h2>
                <span className="pill">
                  {(state.open as { participants: number }).participants} forecasts in
                </span>
              </div>
              <div className="bands">
                {bands.map((b) => (
                  <div
                    key={b.i}
                    className={`band-card${sel === b.i ? " sel" : ""}`}
                    style={{ "--bc": `var(${BAND_VARS[b.i]})` } as React.CSSProperties}
                    onClick={() => setSel(b.i)}
                  >
                    <span className="band-bar" />
                    <div className="band-name">{b.name}</div>
                    <div className="band-range">{b.label}</div>
                    <div className="band-unit">€/MWh</div>
                  </div>
                ))}
              </div>
              <div className="exact-row">
                <label className="muted" style={{ fontSize: 13 }}>
                  Exact spread (optional tiebreaker):
                </label>
                <input
                  className="field mono"
                  placeholder="e.g. 92.5"
                  inputMode="decimal"
                  value={exact}
                  onChange={(e) => setExact(e.target.value)}
                />
                <span className="muted" style={{ fontSize: 12 }}>€/MWh</span>
              </div>
              {state.user ? (
                <button className="btn" onClick={submit} disabled={busy || sel == null}>
                  {state.mine ? "Update forecast" : "Lock in forecast"}
                </button>
              ) : (
                <p className="notice">Join with your email below to play — it takes five seconds.</p>
              )}
              {msg && <p className={msg.kind === "err" ? "err" : "notice"} style={{ marginTop: 10 }}>{msg.text}</p>}

              {commit && state.user && (
                <div className="commit-box">
                  COMMIT HASH (sha256, salted — published before close, revealed after settlement)
                  <br />
                  {commit.hash}
                  {state.user.verified && (
                    <div style={{ marginTop: 8 }}>
                      {commit.signed ? (
                        <span style={{ color: "var(--ok)" }}>✓ 1-drop commit signature recorded</span>
                      ) : (
                        <button className="btn ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={simulateSign} disabled={busy}>
                          Sign daily commit (1 drop · simulated)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="panel">
              <h2>Between rounds</h2>
              <p className="notice">
                Today&apos;s auction is running. Forecasts for {(state.open as { nextDay: string }).nextDay} open at
                15:00 CET — right after today&apos;s settlement.
              </p>
            </div>
          )}

          {latest && (
            <div className="panel" style={{ marginTop: 16 }}>
              <h2>Latest settlement · {latest.day}</h2>
              <div className="result-strip">
                <div>
                  <div className="result-num">{latest.spread.toFixed(2)} €</div>
                  <div className="muted" style={{ fontSize: 12 }}>daily spread</div>
                </div>
                <span
                  className="band-chip"
                  style={{ "--bc": `var(${BAND_VARS[latest.outcomeBand]})` } as React.CSSProperties}
                >
                  {latest.outcomeLabel}
                </span>
                <span className="pill">{latest.source === "entsoe" ? "ENTSO-E A44" : "SIMULATED FEED"}</span>
                {latest.mine &&
                  (latest.mine.correct ? (
                    <span className="pill ok">
                      ✓ you called it · +{latest.mine.points} pts · streak {latest.mine.streak}
                    </span>
                  ) : (
                    <span className="pill">your pick missed — streak reset</span>
                  ))}
              </div>
              <div className="spark">
                {latest.hourly.map((v, i) => {
                  const t = (v - hourlyMin) / (hourlyMax - hourlyMin || 1);
                  return (
                    <span
                      key={i}
                      title={`${String(i).padStart(2, "0")}:00 · ${v.toFixed(2)} €/MWh`}
                      style={{
                        height: `${6 + t * 92}%`,
                        background: v < 0 ? "var(--b0)" : `color-mix(in srgb, var(--b4) ${Math.round(t * 100)}%, var(--b1))`,
                      }}
                    />
                  );
                })}
              </div>
              <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>
                hourly means, 00–23 CET · negative hours shown blue · full audit in the archive
              </p>
            </div>
          )}
        </div>

        <div className="side-stack">
          {!state.user ? (
            <div className="panel">
              <h2>Join free</h2>
              <p className="notice" style={{ marginBottom: 12 }}>
                Email only — instant play. No purchase, no deposits, ever.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input className="field" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                <input className="field" placeholder="display name" value={name} onChange={(e) => setName(e.target.value)} />
                <button className="btn" onClick={join} disabled={busy}>
                  Start playing
                </button>
                {acctMsg && <p className={acctMsg.kind === "err" ? "err" : "notice"}>{acctMsg.text}</p>}
              </div>
            </div>
          ) : (
            <div className="panel">
              <h2>
                {state.user.name} {state.user.verified && <span className="tag v">VERIFIED</span>}
              </h2>
              <p className="notice">{state.user.email}</p>
              {!state.user.verified ? (
                <>
                  <p className="notice" style={{ margin: "10px 0" }}>
                    Connect an XRPL wallet to join the verified leaderboard and become prize-eligible. Your daily
                    forecast is then committed on-chain with a 1-drop signature.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <input className="field mono" placeholder="rYourXrplAddress…" value={wallet} onChange={(e) => setWallet(e.target.value)} />
                    <button className="btn ghost" onClick={connect} disabled={busy}>
                      Connect wallet (Xaman in prod)
                    </button>
                    {acctMsg && <p className={acctMsg.kind === "err" ? "err" : "notice"}>{acctMsg.text}</p>}
                  </div>
                </>
              ) : (
                <p className="notice" style={{ marginTop: 8 }}>
                  <span className="mono">{state.user.wallet}</span>
                  <br />
                  Daily commits are signed as 1-drop payments to the platform anchor.
                </p>
              )}
            </div>
          )}

          <div className="panel">
            <h2>This week&apos;s bands</h2>
            <p className="notice" style={{ marginBottom: 10 }}>
              Recalibrated every Monday from trailing 60-day quintiles — each band ≈ 20% base chance. Skill is
              reading weather, solar and demand.
            </p>
            {[0, 1, 2, 3, 4].map((i) => {
              const b = state.boundaries;
              const label = i === 0 ? `< ${b[0]}` : i === 4 ? `≥ ${b[3]}` : `${b[i - 1]} – ${b[i]}`;
              const names = ["Calm", "Steady", "Lively", "Swingy", "Wild"];
              return (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
                  <span style={{ color: `var(${BAND_VARS[i]})`, fontWeight: 700 }}>{names[i]}</span>
                  <span className="mono muted">{label} €/MWh</span>
                </div>
              );
            })}
          </div>

          <div className="panel">
            <h2>Prizes</h2>
            <p className="notice">
              Top verified ranks occasionally receive sponsored <b>RLUSD promotional awards</b> and future{" "}
              <b>protocol boosts</b>. Entry is always free — prizes are marketing awards from the sponsor, never a
              return on anything you paid.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
