"use client";
// Spreadcast play view: daily band pick → optional exact-spread tiebreaker →
// submit. Verified players additionally get the 1-drop commit transaction to
// sign (simulated locally until Xaman credentials are configured).

import { useCallback, useEffect, useState } from "react";

const BAND_VARS = ["--sc-b0", "--sc-b1", "--sc-b2", "--sc-b3", "--sc-b4"];

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

export function PlayView() {
  const [state, setState] = useState<RoundState | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [exact, setExact] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [wallet, setWallet] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "err" | "ok"; text: string } | null>(null);
  const [acctMsg, setAcctMsg] = useState<{ kind: "err" | "ok"; text: string } | null>(null);
  const [commit, setCommit] = useState<{ hash: string; signed: boolean; txHash?: string | null } | null>(null);
  // Live Xaman signing of the daily commit (QR / deep link + polling).
  const [signFlow, setSignFlow] = useState<{ uuid: string; qrPng: string; deeplink: string; opened: boolean } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/spreadcast/round", { cache: "no-store" });
    const data = (await res.json()) as RoundState;
    setState(data);
    if (data.mine) {
      setSel(data.mine.band);
      setExact(data.mine.exact != null ? String(data.mine.exact) : "");
      // Simulated (demo-era) signatures don't count as signed — the real
      // Xaman flow can replace them until close.
      const realTx = data.mine!.txHash && !data.mine!.txHash.startsWith("SIMULATED-");
      setCommit((c) => c ?? { hash: data.mine!.hash, signed: !!realTx, txHash: data.mine!.txHash });
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
    const res = await fetch("/api/spreadcast/join", {
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
    const res = await fetch("/api/spreadcast/wallet", {
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
    const res = await fetch("/api/spreadcast/predict", {
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

  // Real Xaman signing: server wraps the 1-drop commit Payment (anchor
  // destination, Make Waves SourceTag, hash memo) in a Xaman payload.
  const startSign = async () => {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/spreadcast/commit-sign", { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (res.status === 501) return simulateSign(); // no XUMM keys → demo path
    if (!res.ok) return setMsg({ kind: "err", text: data.error });
    setSignFlow({ uuid: data.uuid, qrPng: data.qrPng, deeplink: data.deeplink, opened: false });
  };

  const signUuid = signFlow?.uuid;
  const signDay = isOpen ? (state!.open as { day: string }).day : null;
  useEffect(() => {
    if (!signUuid || !signDay) return;
    let alive = true;
    const iv = setInterval(async () => {
      try {
        const res = await fetch(`/api/spreadcast/commit-sign?uuid=${signUuid}&day=${signDay}`, { cache: "no-store" });
        if (!res.ok) return;
        const s = await res.json();
        if (!alive) return;
        if (s.signed && s.txHash) {
          clearInterval(iv);
          setSignFlow(null);
          setCommit((c) => (c ? { ...c, signed: true, txHash: s.txHash } : c));
          setMsg({ kind: "ok", text: "Commit signed — your forecast is now committed on XRPL mainnet." });
        } else if (s.cancelled || s.expired) {
          clearInterval(iv);
          setSignFlow(null);
          setMsg({ kind: "err", text: s.expired ? "Sign request expired — try again." : "Sign request declined in Xaman." });
        } else if (s.opened) {
          setSignFlow((f) => (f ? { ...f, opened: true } : f));
        }
      } catch {
        // transient — keep polling
      }
    }, 2500);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [signUuid, signDay]);

  // Demo-mode stand-in for the Xaman sign flow: reports a simulated tx hash.
  const simulateSign = async () => {
    if (!commit || !state?.mine) return;
    setBusy(true);
    const day = (state.open as { day: string }).day;
    const fakeTx = `SIMULATED-${commit.hash.slice(0, 16).toUpperCase()}`;
    await fetch("/api/spreadcast/predict", {
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
      <div className="sc-play-top">
        <div>
          <h1>
            Call tomorrow&apos;s <span>spread</span>.
          </h1>
          <p className="sc-sub" style={{ marginBottom: 0 }}>
            Which band does the SI day-ahead daily price spread (max − min hourly, €/MWh) land in
            {isOpen ? ` for ${(state.open as { day: string }).day}?` : "?"} Free to play, every day.
          </p>
        </div>
        <div className="sc-countdown">
          {countdown}
          <small>{isOpen ? "UNTIL CLOSE · 11:45 CET" : "NEXT ROUND OPENS · 15:00 CET"}</small>
        </div>
      </div>

      <div className="sc-play-grid">
        <div>
          {isOpen && bands ? (
            <div className="panel sc-panel">
              <span className="tick tl" />
              <span className="tick tr" />
              <span className="tick bl" />
              <span className="tick br" />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <h2 style={{ marginBottom: 0 }}>Delivery day {(state.open as { day: string }).day}</h2>
                <span className="sc-pill">
                  {(state.open as { participants: number }).participants} forecasts in
                </span>
              </div>
              <div className="sc-bands">
                {bands.map((b) => (
                  <div
                    key={b.i}
                    className={`sc-band-card${sel === b.i ? " sel" : ""}`}
                    style={{ "--bc": `var(${BAND_VARS[b.i]})` } as React.CSSProperties}
                    onClick={() => setSel(b.i)}
                  >
                    <span className="sc-band-bar" />
                    <div className="sc-band-name">{b.name}</div>
                    <div className="sc-band-range">{b.label}</div>
                    <div className="sc-band-unit">€/MWh</div>
                  </div>
                ))}
              </div>
              <div className="sc-exact-row">
                <label className="muted" style={{ fontSize: 13 }}>
                  Exact spread (optional tiebreaker):
                </label>
                <input
                  className="sc-field sc-mono"
                  placeholder="e.g. 92.5"
                  inputMode="decimal"
                  value={exact}
                  onChange={(e) => setExact(e.target.value)}
                />
                <span className="muted" style={{ fontSize: 12 }}>€/MWh</span>
              </div>
              {state.user ? (
                <button className="btn btn-accent" onClick={submit} disabled={busy || sel == null}>
                  {state.mine ? "Update forecast" : "Lock in forecast"}
                </button>
              ) : (
                <p className="sc-notice">Join with your email in the panel on the right — it takes five seconds.</p>
              )}
              {msg && <p className={msg.kind === "err" ? "sc-err" : "sc-notice"} style={{ marginTop: 10 }}>{msg.text}</p>}

              {commit && state.user && (
                <div className="sc-commit-box">
                  COMMIT HASH (sha256, salted — published before close, revealed after settlement)
                  <br />
                  {commit.hash}
                  {state.user.verified && (
                    <div style={{ marginTop: 8 }}>
                      {commit.signed ? (
                        <span style={{ color: "var(--accent)" }}>
                          ✓ 1-drop commit signature recorded
                          {commit.txHash && !commit.txHash.startsWith("SIMULATED-") && (
                            <>
                              {" · "}
                              <a
                                href={`https://livenet.xrpl.org/transactions/${commit.txHash}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: "var(--accent)", textDecoration: "underline" }}
                              >
                                view on ledger
                              </a>
                            </>
                          )}
                        </span>
                      ) : signFlow ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={signFlow.qrPng} alt="Xaman commit QR" width={124} height={124} style={{ background: "#fff", padding: 5 }} />
                          <div style={{ display: "grid", gap: 8, justifyItems: "start" }}>
                            <span style={{ color: "var(--text-2)" }}>
                              {signFlow.opened ? "Opened in Xaman — approve to commit" : "Scan with Xaman to sign your 1-drop commit"}
                            </span>
                            <a className="btn btn-ghost btn-sm" href={signFlow.deeplink} target="_blank" rel="noreferrer">
                              Open in Xaman app
                            </a>
                            <button
                              onClick={() => setSignFlow(null)}
                              style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 0, fontFamily: "inherit", fontSize: 11, textDecoration: "underline" }}
                            >
                              cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button className="btn btn-ghost btn-sm" onClick={startSign} disabled={busy}>
                          Sign daily commit (1 drop · Xaman)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="panel sc-panel">
              <h2>Between rounds</h2>
              <p className="sc-notice">
                Today&apos;s auction is running. Forecasts for {(state.open as { nextDay: string }).nextDay} open at
                15:00 CET — right after today&apos;s settlement.
              </p>
            </div>
          )}

          {latest && (
            <div className="panel sc-panel" style={{ marginTop: 16 }}>
              <h2>Latest settlement · {latest.day}</h2>
              <div className="sc-result-strip">
                <div>
                  <div className="sc-result-num">{latest.spread.toFixed(2)} €</div>
                  <div className="muted" style={{ fontSize: 12 }}>daily spread</div>
                </div>
                <span
                  className="sc-band-chip"
                  style={{ "--bc": `var(${BAND_VARS[latest.outcomeBand]})` } as React.CSSProperties}
                >
                  {latest.outcomeLabel}
                </span>
                <span className="sc-pill">{latest.source === "entsoe" ? "ENTSO-E A44" : "SIMULATED FEED"}</span>
                {latest.mine &&
                  (latest.mine.correct ? (
                    <span className="sc-pill ok">
                      ✓ you called it · +{latest.mine.points} pts · streak {latest.mine.streak}
                    </span>
                  ) : (
                    <span className="sc-pill">your pick missed — streak reset</span>
                  ))}
              </div>
              <div className="sc-spark">
                {latest.hourly.map((v, i) => {
                  const t = (v - hourlyMin) / (hourlyMax - hourlyMin || 1);
                  return (
                    <span
                      key={i}
                      title={`${String(i).padStart(2, "0")}:00 · ${v.toFixed(2)} €/MWh`}
                      style={{
                        height: `${6 + t * 92}%`,
                        background: v < 0 ? "var(--sc-b0)" : `color-mix(in srgb, var(--sc-b4) ${Math.round(t * 100)}%, var(--sc-b1))`,
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

        <div className="sc-side-stack">
          {!state.user ? (
            <div className="panel sc-panel">
              <h2>Join free</h2>
              <p className="sc-notice" style={{ marginBottom: 12 }}>
                Email only — instant play. No purchase, no deposits, ever.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input className="sc-field" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                <input className="sc-field" placeholder="display name" value={name} onChange={(e) => setName(e.target.value)} />
                <button className="btn btn-accent" onClick={join} disabled={busy}>
                  Start playing
                </button>
                {acctMsg && <p className={acctMsg.kind === "err" ? "sc-err" : "sc-notice"}>{acctMsg.text}</p>}
              </div>
            </div>
          ) : (
            <div className="panel sc-panel">
              <h2>
                {state.user.name} {state.user.verified && <span className="sc-tag v">VERIFIED</span>}
              </h2>
              <p className="sc-notice">{state.user.email}</p>
              {!state.user.verified ? (
                <>
                  <p className="sc-notice" style={{ margin: "10px 0" }}>
                    Connect an XRPL wallet to join the verified leaderboard and become prize-eligible. Your daily
                    forecast is then committed on-chain with a 1-drop signature.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <input className="sc-field sc-mono" placeholder="rYourXrplAddress…" value={wallet} onChange={(e) => setWallet(e.target.value)} />
                    <button className="btn btn-ghost" onClick={connect} disabled={busy}>
                      Connect wallet (Xaman in prod)
                    </button>
                    {acctMsg && <p className={acctMsg.kind === "err" ? "sc-err" : "sc-notice"}>{acctMsg.text}</p>}
                  </div>
                </>
              ) : (
                <p className="sc-notice" style={{ marginTop: 8 }}>
                  <span className="sc-mono">{state.user.wallet}</span>
                  <br />
                  Daily commits are signed as 1-drop payments to the platform anchor.
                </p>
              )}
            </div>
          )}

          <div className="panel sc-panel">
            <h2>This week&apos;s bands</h2>
            <p className="sc-notice" style={{ marginBottom: 10 }}>
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
                  <span className="sc-mono muted">{label} €/MWh</span>
                </div>
              );
            })}
          </div>

          <div className="panel sc-panel">
            <h2>Prizes</h2>
            <p className="sc-notice">
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
