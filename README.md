# Megawatt ⚡ — Interface

Tokenized **Battery Energy Storage System (BESS)** investment platform on
**Arbitrum**. Investors deposit stablecoins into vaults backed by
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
├── contracts/    # Foundry: vaults (4626/7540-style), MockUSDC, KYC oracle, marketplace
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
| Chain | Arbitrum Sepolia — Testnet |
| Chain ID | `421614` |
| RPC | `https://sepolia-rollup.arbitrum.io/rpc` |
| Explorer | `https://sepolia.arbiscan.io` |

## Deployed contracts (Arbitrum Sepolia, 2026-07-10)

| Contract | Address |
|---|---|
| MockUSDC (faucet, 6dp) | `0x4232353b04a62547eAB29217332e1340c917e852` |
| CredentialOracle (open mode) | `0x4851abE7Ae1dc3c20108540f86a14c5B5f1FA2e0` |
| Marketplace | `0x9f3F62dD3dE0aD5bea5bfbf4dCd49576Fc12b249` |
| Vault — Zagreb 01 `mwZAG01` (fundraising) | `0x2DAf9D7BeE23e65344431850Ce28b54C63244faD` |
| Vault — Trieste 01 `mwTRS01` (fundraising) | `0xdb649C2086595CD798d7dEB9974634C9f3b5A44C` |
| Vault — Belgrade 01 `mwBEL01` (pipeline) | `0xb678D9fb980F787c307BAFa617cc8d0048b8a89F` |

Deploy: `cd contracts && forge script script/Deploy.s.sol:Deploy --rpc-url arbitrum_sepolia --broadcast`
(reads `PRIVATE_KEY`/`RPC_URL` from gitignored `contracts/.env`). Tests: `forge test`.

## Develop

```bash
cd web
nvm use            # Node 22 (see .nvmrc)
npm install
npm run dev        # http://localhost:3000
```
