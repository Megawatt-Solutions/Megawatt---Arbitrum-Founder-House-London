# Spreadcast ⚡ — prototype

Free daily forecasting game on the Slovenian day-ahead electricity market.
Players predict which of five bands tomorrow's **daily price spread**
(max − min hourly price, €/MWh) lands in, collect points and streaks on a
public leaderboard; top verified ranks occasionally receive sponsored RLUSD
promotional awards. Built for the **XRPL Make Waves cohort** — every active
verified player produces a genuine daily mainnet transaction (1-drop
commit signature), plus one weekly Merkle anchor from the platform.

> **Entry is free in every configuration.** No paid entry, no staking, no
> deposits — this codebase contains **no payment-in rails of any kind**.
> UI copy never uses the words bet, wager, odds, invest or yield. Ships
> under its own brand with a small "powered by Megawatt" credit.

**Design (founder decision 2026-07-20):** the UI reuses the Megawatt app's
institutional design system — Inter + JetBrains Mono, emerald accent, zero
border-radius, hairline panels, mono uppercase micro-labels, the double-bolt
logomark (`src/components/BrandMark.tsx`, copied from `web/`). Tokens mirror
`web/src/app/globals.css`; the Spreadcast name and separate domain remain.

## Run it

```bash
cd game
nvm use 22        # Next 16 needs Node 20+
npm install
npm run dev       # http://localhost:3111  (PORT=3111 npm run dev)
```

No env needed for the demo: it auto-seeds ~75 days of settled history with
simulated SI-shaped prices and 28 demo players, so the leaderboard, streaks
and audit archive are alive immediately. `.data/` holds the store (gitignored);
delete it to reseed. Copy `.env.example` → `.env` to go live piece by piece.

## What's real vs. simulated

| Piece | Status |
|---|---|
| Band engine — Monday recalibration from trailing 60-day quintiles | **Real** (static fallback until 30 days of history) |
| Timing — open 15:00 D-2, close 11:45 D-1, settle 15:00 D-1 (Europe/Ljubljana) | **Real** |
| Spread rule — 15-min values → hourly means → max − min | **Real** |
| Scoring — 10 pts, streak multiplier ×1.5…×3 cap, exact-guess tiebreak | **Real** |
| Commit-reveal — salted sha256, salts revealed post-settlement, public archive | **Real** |
| ENTSO-E A44 client (SI, `10YSI-ELES-----O`) | **Real**, used when `ENTSOE_TOKEN` set; simulator otherwise |
| Weekly Merkle anchor tx | Code real (`xrplink.ts`), **submits only with `XRPL_ANCHOR_SEED`**; labeled SIMULATED otherwise |
| Daily 1-drop commit signing | Tx JSON built for real; **Xaman signing stubbed** (a "simulate signing" button) until `XUMM_API_KEY` |
| Wallet connect | Prototype accepts an r-address; **production must verify via Xaman sign-in** |
| Storage | Local JSON (`.data/store.json`), schema mirrors the target Supabase tables |
| Prizes / RLUSD payouts | **Not implemented** — points only; payout queue is a production item |

## Decisions taken for v1 (CTO open items)

- **Band engine:** full quintile recalibration implemented — it was cheap,
  and each round snapshots its boundaries for auditability.
- **Commit-reveal:** in — it's the integrity story *and* the daily mainnet
  transaction the cohort leaderboard measures.
- **Prizes:** points/streaks only in the prototype. RLUSD-vs-XRP and the
  yield-boost alternative stay open (note: any "future protocol boost"
  wording must be reviewed so it can't be read as an investment promise).
- **Micro-grant:** off. The Sponsor amendment is not live — not designed for.
- **Sponsoring entity:** blank in the terms until registration details exist.

## Architecture

```
game/
├── src/lib/
│   ├── time.ts      # Europe/Ljubljana market clock, open/close/settle moments
│   ├── bands.ts     # quintile band engine + static fallback
│   ├── spread.ts    # 15-min → hourly means → spread
│   ├── scoring.ts   # points, streak multiplier
│   ├── prices.ts    # ENTSO-E A44 client + deterministic SI-shaped simulator
│   ├── merkle.ts    # commit hashes + weekly Merkle root
│   ├── xrplink.ts   # commit tx builder, weekly anchor submit (env-gated)
│   ├── store.ts     # JSON store shaped like the Supabase schema; settlement engine; demo seed
│   └── session.ts   # signed-cookie sessions (→ Supabase Auth later)
├── src/app/         # play / leaderboard / archive / how + API routes
└── .env.example     # every integration is opt-in via env
```

Production path: Vercel + Supabase (auth, Postgres, scheduled functions for
the 11:45 close, 15:00 settle w/ retries + BSP SouthPool cross-check, and the
weekly anchor), Xaman SDK for connect/sign, two hot wallets (anchor + prize)
with keys held by the CTO.
