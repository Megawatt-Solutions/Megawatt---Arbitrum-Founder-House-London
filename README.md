# Megawatt ⚡ — Interface

Tokenized **Battery Energy Storage System (BESS)** investment platform on the
**XRPL EVM Sidechain**. Investors deposit stablecoins into vaults backed by
physical battery farms, receive a tradeable **yield-receipt token**, earn yield,
and trade their positions on a secondary marketplace.

> Successor to the Paris hackathon prototype — rebuilt dark-mode, with a proper
> ERC-4626 vault standard and an ERC-7540-style async redemption layer.

## Architecture decisions

- **Vaults — ERC-4626 + async redeem.** Depositing stablecoins mints 4626 shares
  **1:1**; those shares _are_ the transferable **yield-receipt token** and the
  asset traded on the marketplace. Yield is distributed separately and is
  **claimable** (matches the product UI), accounted per-share so the token trades
  cleanly. Once a vault is funded it goes Active and capital is **drawn down** to
  fund the physical BESS; principal redemption is **async (ERC-7540 style)** to
  model the locked real-world capital. Deposits are **KYC-gated**.
- **Yield verification.** Operator-driven distribution for v1; ZK-verified
  (Groth16) distribution is a fast-follow, reusing the existing Circom circuit.
- **Two off-chain showcase vaults** (Ljubljana, Metlika) mirror our real,
  operational BESS sites — rich dashboards, no wallet/deposit.

## Structure

```
megawatt-interface/
├── web/          # Next.js 16 frontend (dark mode) — the app
├── contracts/    # Foundry: ERC-4626/7540 vaults, KYC oracle, marketplace (added next)
├── simulator/    # BESS data simulator (added next)
├── .env.example  # env template — copy to .env, never commit the real one
└── README.md
```

## Pages

- **Dashboard** — TVL, replacement fund, vault count, total MW; active + fundraising vaults.
- **Vault detail** — live BESS metrics, yield breakdown, deposit/claim, your position.
- **Portfolio** — deposited / claimable / claimed / avg APY, principal+interest growth, positions.
- **Marketplace** — list & buy positions (receipt-token shares), premium over face value.

## Network

| | |
|---|---|
| Chain | XRPL EVM Sidechain — Testnet |
| Chain ID | `1449000` |
| RPC | `https://rpc.testnet.xrplevm.org` |
| Explorer | `https://explorer.testnet.xrplevm.org` |

## Develop

```bash
cd web
nvm use            # Node 22 (see .nvmrc)
npm install
npm run dev        # http://localhost:3000
```

> ⚠️ **Security:** the testnet deployer key lives only in `.env` (gitignored).
> Treat it as a burner — never reuse it on mainnet.
