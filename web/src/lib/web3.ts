// ─────────────────────────────────────────────────────────────
// Live chain access (Arbitrum Sepolia) — injected-wallet signing
// and read-only RPC state for the deployed Megawatt contracts.
// ─────────────────────────────────────────────────────────────
import { BrowserProvider, Contract, JsonRpcProvider, parseUnits } from "ethers";
import { CHAIN, CONTRACTS, VAULT_CONTRACTS } from "./contracts";

export const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function mint(address,uint256)",
];

export const VAULT_ABI = [
  "function deposit(uint256,address) returns (uint256)",
  "function totalRaised() view returns (uint256)",
  "function raiseTarget() view returns (uint256)",
  "function stage() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function pendingYield(address) view returns (uint256)",
  "function claimYield() returns (uint256)",
  "function oracle() view returns (address)",
  "function totalYieldDistributed() view returns (uint256)",
  "function totalYieldClaimed() view returns (uint256)",
];

const ORACLE_ABI = ["function isVerified(address) view returns (bool)"];

interface Eip1193 {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, cb: (...args: unknown[]) => void): void;
  removeListener?(event: string, cb: (...args: unknown[]) => void): void;
}

declare global {
  interface Window {
    ethereum?: Eip1193;
  }
}

export function injected(): Eip1193 | null {
  return typeof window !== "undefined" ? window.ethereum ?? null : null;
}

let _read: JsonRpcProvider | null = null;
let _readIdx = 0;

function makeReadProvider(idx: number): JsonRpcProvider {
  const url = CHAIN.readRpcUrls[idx % CHAIN.readRpcUrls.length];
  // batchMaxCount 1: public endpoints (dRPC free tier especially) reject
  // ethers' JSON-RPC batch arrays with 500s — send calls individually.
  return new JsonRpcProvider(url, CHAIN.id, { staticNetwork: true, batchMaxCount: 1 });
}

export function readProvider(): JsonRpcProvider {
  if (!_read) _read = makeReadProvider(_readIdx);
  return _read;
}

/** Rotate to the next read endpoint after a failure (rate limit, outage). */
export function rotateReadProvider(): void {
  _readIdx++;
  _read = makeReadProvider(_readIdx);
}

/** Run a read against the current endpoint; rotate on failure so the next
 * attempt (or poll tick) lands on a fresh endpoint. */
async function withRead<T>(fn: (p: JsonRpcProvider) => Promise<T>): Promise<T> {
  try {
    return await fn(readProvider());
  } catch (e) {
    rotateReadProvider();
    throw e;
  }
}

/** Switch the wallet to Arbitrum Sepolia. If the switch fails for any
 * reason other than the user rejecting it (unknown chain, or an existing
 * entry whose RPC endpoint is dead), offer a fresh entry with a healthy
 * RPC via wallet_addEthereumChain — MetaMask treats this as "add/update
 * network" and prompts the user. */
export async function ensureChain(eth: Eip1193): Promise<void> {
  const chainId = "0x" + CHAIN.id.toString(16);
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
    return;
  } catch (err) {
    const e = err as { code?: number; error?: { code?: number }; data?: { originalError?: { code?: number } } };
    const code = e?.code ?? e?.error?.code ?? e?.data?.originalError?.code;
    if (code === 4001) throw err; // user declined the switch
    await eth.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId,
        chainName: CHAIN.name,
        nativeCurrency: CHAIN.nativeCurrency,
        rpcUrls: [CHAIN.rpcUrl],
        blockExplorerUrls: [CHAIN.explorer],
      }],
    });
  }
}

async function getSigner() {
  const eth = injected();
  if (!eth) throw new Error("No wallet found — install MetaMask to transact");
  await ensureChain(eth);
  const provider = new BrowserProvider(eth as never);
  return provider.getSigner();
}

// ─── reads ────────────────────────────────────────────────────

export interface VaultChainState {
  raised: bigint;
  target: bigint;
  stage: number; // 0 Pipeline · 1 Fundraising · 2 Active · 3 Operational
  distributed: bigint; // lifetime yield pushed into the vault
  claimed: bigint; // lifetime yield claimed out
  shares: bigint;
  pending: bigint;
  usdc: bigint; // caller's USDC balance
}

export async function readVaultState(vaultAddr: string, account?: string | null): Promise<VaultChainState> {
  return withRead(async (p) => {
    const vault = new Contract(vaultAddr, VAULT_ABI, p);
    const usdc = new Contract(CONTRACTS.mockUsdc, ERC20_ABI, p);
    const [raised, target, stage, distributed, claimed] = await Promise.all([
      vault.totalRaised(),
      vault.raiseTarget(),
      vault.stage(),
      vault.totalYieldDistributed(),
      vault.totalYieldClaimed(),
    ]);
    let shares = BigInt(0);
    let pending = BigInt(0);
    let bal = BigInt(0);
    if (account) {
      [shares, pending, bal] = await Promise.all([
        vault.balanceOf(account),
        vault.pendingYield(account),
        usdc.balanceOf(account),
      ]);
    }
    return { raised, target, stage: Number(stage), distributed, claimed, shares, pending, usdc: bal };
  });
}

export async function readUsdcBalance(account: string): Promise<bigint> {
  return withRead((p) => new Contract(CONTRACTS.mockUsdc, ERC20_ABI, p).balanceOf(account) as Promise<bigint>);
}

/** Sum of totalRaised across all deployed vaults, in whole USDC. */
export async function readOnchainTvl(): Promise<number> {
  return withRead(async (p) => {
    const raised = await Promise.all(
      Object.values(VAULT_CONTRACTS).map((addr) => new Contract(addr, VAULT_ABI, p).totalRaised() as Promise<bigint>)
    );
    return fromUsdc6(raised.reduce((s, v) => s + v, BigInt(0)));
  });
}

export function fromUsdc6(v: bigint): number {
  return Number(v) / 1e6;
}

// ─── transactions ─────────────────────────────────────────────

type OnStatus = (status: string) => void;

/** Check every deposit require via the public RPC (which returns revert
 * reasons, unlike wallet gas estimation) so failures are explained BEFORE
 * any wallet prompt. */
async function preflightDeposit(vaultAddr: string, owner: string, value: bigint): Promise<void> {
  const p = readProvider();
  const vault = new Contract(vaultAddr, VAULT_ABI, p);
  const usdcRead = new Contract(CONTRACTS.mockUsdc, ERC20_ABI, p);
  const [stage, raised, target, oracleAddr, balance] = await Promise.all([
    vault.stage(),
    vault.totalRaised(),
    vault.raiseTarget(),
    vault.oracle(),
    usdcRead.balanceOf(owner),
  ]);
  if (Number(stage) !== 1) throw new Error("This vault is not accepting deposits (not in its fundraising stage)");
  const remaining = (target as bigint) - (raised as bigint);
  if (value > remaining) {
    throw new Error(`Amount exceeds the vault's remaining capacity — ${fromUsdc6(remaining).toLocaleString()} USDC left to raise`);
  }
  if ((balance as bigint) < value) throw new Error("Insufficient USDC balance — use the faucet to mint test USDC");
  const oracle = new Contract(oracleAddr as string, ORACLE_ABI, p);
  if (!(await oracle.isVerified(owner))) throw new Error("This account is not KYC-verified for deposits");
}

/** Pad a public-RPC gas estimate so the wallet never has to estimate
 * itself — wallet-side estimation on this chain strips revert reasons
 * ("missing revert data") and can race freshly-mined state. */
function pad(gas: bigint): bigint {
  return (gas * BigInt(13)) / BigInt(10);
}

/** Wait until the public RPC sees the allowance (cross-node propagation). */
async function waitForAllowance(owner: string, spender: string, min: bigint, timeoutMs = 15000): Promise<void> {
  const usdc = new Contract(CONTRACTS.mockUsdc, ERC20_ABI, readProvider());
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const current: bigint = await usdc.allowance(owner, spender);
    if (current >= min) return;
    await new Promise((r) => setTimeout(r, 1200));
  }
}

/** Approve (if needed) then deposit `amount` USDC into the vault. */
export async function depositToVault(vaultAddr: string, amount: string, onStatus?: OnStatus): Promise<string> {
  const signer = await getSigner();
  const owner = await signer.getAddress();
  const value = parseUnits(amount, 6);

  onStatus?.("Checking deposit…");
  await preflightDeposit(vaultAddr, owner, value);

  const usdcRead = new Contract(CONTRACTS.mockUsdc, ERC20_ABI, readProvider());
  const allowance: bigint = await usdcRead.allowance(owner, vaultAddr);
  if (allowance < value) {
    const approveGas: bigint = await usdcRead.approve.estimateGas(vaultAddr, value, { from: owner });
    onStatus?.("Confirm the USDC approval in your wallet…");
    const usdc = new Contract(CONTRACTS.mockUsdc, ERC20_ABI, signer);
    const approveTx = await usdc.approve(vaultAddr, value, { gasLimit: pad(approveGas) });
    onStatus?.("Approving USDC…");
    // Wait via our RPC, not the wallet's — MetaMask's endpoint rate-limits
    // receipt polling and trips its circuit breaker.
    await readProvider().waitForTransaction(approveTx.hash, 1, 120_000);
    onStatus?.("Waiting for the approval to propagate…");
    await waitForAllowance(owner, vaultAddr, value);
  }

  // Simulate + estimate on the public RPC: failures surface with their real
  // revert reason here instead of the wallet's opaque estimation error.
  onStatus?.("Simulating deposit…");
  const vaultRead = new Contract(vaultAddr, VAULT_ABI, readProvider());
  await vaultRead.deposit.staticCall(value, owner, { from: owner });
  const depositGas: bigint = await vaultRead.deposit.estimateGas(value, owner, { from: owner });

  onStatus?.("Confirm the deposit in your wallet…");
  const vault = new Contract(vaultAddr, VAULT_ABI, signer);
  const tx = await vault.deposit(value, owner, { gasLimit: pad(depositGas) });
  onStatus?.("Depositing…");
  await readProvider().waitForTransaction(tx.hash, 1, 120_000);
  return tx.hash;
}

/** Mint test USDC to the connected account (MockUSDC open faucet). */
export async function faucetUsdc(amount: string, onStatus?: OnStatus): Promise<string> {
  const signer = await getSigner();
  const owner = await signer.getAddress();
  const value = parseUnits(amount, 6);
  const usdcRead = new Contract(CONTRACTS.mockUsdc, ERC20_ABI, readProvider());
  const gas: bigint = await usdcRead.mint.estimateGas(owner, value, { from: owner });
  onStatus?.("Confirm the mint in your wallet…");
  const usdc = new Contract(CONTRACTS.mockUsdc, ERC20_ABI, signer);
  const tx = await usdc.mint(owner, value, { gasLimit: pad(gas) });
  onStatus?.("Minting test USDC…");
  await readProvider().waitForTransaction(tx.hash, 1, 120_000);
  return tx.hash;
}

export async function claimVaultYield(vaultAddr: string, onStatus?: OnStatus): Promise<string> {
  const signer = await getSigner();
  const owner = await signer.getAddress();
  const vaultRead = new Contract(vaultAddr, VAULT_ABI, readProvider());
  const gas: bigint = await vaultRead.claimYield.estimateGas({ from: owner });
  onStatus?.("Confirm the claim in your wallet…");
  const vault = new Contract(vaultAddr, VAULT_ABI, signer);
  const tx = await vault.claimYield({ gasLimit: pad(gas) });
  onStatus?.("Claiming yield…");
  await readProvider().waitForTransaction(tx.hash, 1, 120_000);
  return tx.hash;
}

/** Human-readable message from an ethers/wallet error. */
export function errMessage(e: unknown): string {
  const err = e as { code?: number | string; shortMessage?: string; reason?: string; message?: string };
  if (err?.code === 4001 || err?.code === "ACTION_REJECTED") return "Transaction rejected in wallet";
  const msg = err?.reason ?? err?.shortMessage ?? err?.message ?? "Transaction failed";
  if (/RPC endpoint.*(not found|unavailable)/i.test(msg)) {
    return "Your wallet's Arbitrum Sepolia RPC is unreachable. In MetaMask: Settings → Networks → Arbitrum Sepolia → set the RPC URL to https://arbitrum-sepolia-rpc.publicnode.com — or delete the network and reconnect here to re-add it.";
  }
  if (/circuit breaker|could not coalesce/i.test(msg)) {
    return "MetaMask's RPC for Arbitrum Sepolia is rate-limited (circuit breaker). Wait ~30s and retry — or set the network's RPC URL to https://arbitrum-sepolia-rpc.publicnode.com in MetaMask settings.";
  }
  if (/missing revert data/i.test(msg)) {
    return "The wallet's RPC rejected the transaction without a reason — hard-refresh the page and try again";
  }
  return msg;
}
