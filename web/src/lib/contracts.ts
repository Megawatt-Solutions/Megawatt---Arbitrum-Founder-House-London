// ─────────────────────────────────────────────────────────────
// Deployed contract registry — Arbitrum Sepolia testnet.
// Deployed 2026-07-10 from contracts/script/Deploy.s.sol
// (broadcast record: contracts/deployments/arbitrum-sepolia.json).
// ─────────────────────────────────────────────────────────────

export const CHAIN = {
  id: 421614,
  name: "Arbitrum Sepolia",
  // Handed to wallets (MetaMask broadcasts through this). Kept SEPARATE from
  // the app's read endpoints below — public-RPC rate limits are per-IP, so
  // the app and the wallet must not drain the same endpoint's quota.
  rpcUrl: "https://arbitrum-sepolia-rpc.publicnode.com",
  // App-side read endpoints, rotated automatically on failure/rate-limit.
  readRpcUrls: [
    "https://arbitrum-sepolia.drpc.org",
    "https://arbitrum-sepolia-rpc.publicnode.com",
    "https://sepolia-rollup.arbitrum.io/rpc",
  ],
  explorer: "https://sepolia.arbiscan.io",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
} as const;

export const CONTRACTS = {
  mockUsdc: "0x4232353b04a62547eAB29217332e1340c917e852",
  credentialOracle: "0x4851abE7Ae1dc3c20108540f86a14c5B5f1FA2e0",
  marketplace: "0x9f3F62dD3dE0aD5bea5bfbf4dCd49576Fc12b249",
} as const;

/** vault id (lib/vaults.ts) → deployed MegawattVault address.
 * (Koper 0x795C…6f7f / Graz 0x8865…DA8c remain deployed + funded on-chain
 * but are hidden from the app — the real operational sites replaced them.) */
export const VAULT_CONTRACTS: Record<string, `0x${string}`> = {
  "bess-zagreb-01": "0x2DAf9D7BeE23e65344431850Ce28b54C63244faD",
  "bess-trieste-01": "0xdb649C2086595CD798d7dEB9974634C9f3b5A44C",
  "bess-belgrade-01": "0xb678D9fb980F787c307BAFa617cc8d0048b8a89F",
};

export function explorerAddress(addr: string): string {
  return `${CHAIN.explorer}/address/${addr}`;
}
