#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// Megawatt operator drip — accrues yield on the ACTIVE vaults at
// their APR (on totalRaised, since the last run) and pushes it
// on-chain via distributeYield().
//
//   node distribute.mjs --once           one tick (VPS cron)
//   node distribute.mjs --interval 600   tick every 10 min (dev)
//
// Env: PRIVATE_KEY (vault operator), RPC_URL (optional); falls
// back to ../contracts/.env. State (last-run timestamps) lives in
// ./state.json. On testnet the script faucet-mints the USDC it
// distributes; on production this accrual computation is replaced
// by real site revenue (VPS telemetry), same contract call.
// ─────────────────────────────────────────────────────────────
import { JsonRpcProvider, Wallet, Contract, MaxUint256, formatUnits } from "ethers";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CHAIN_ID = 421614;
const DEFAULT_RPC = "https://arbitrum-sepolia.drpc.org";
const USDC = "0x4232353b04a62547eAB29217332e1340c917e852";
const VAULTS = [
  { name: "Koper 01", address: "0x795CFd53E9979d4b2004F0895310cc0036B76f7f", aprBps: 1200 },
  { name: "Graz 01", address: "0x8865932681ce8CFD044B196852999Ce4e22dDA8c", aprBps: 1150 },
];
const YEAR_SEC = 365 * 24 * 3600;
const FAUCET_CAP = 1_000_000_000_000n; // MockUSDC per-call mint cap (1M USDC)
const STATE_FILE = path.join(__dirname, "state.json");

const ERC20_ABI = [
  "function mint(address,uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
];
const VAULT_ABI = [
  "function totalRaised() view returns (uint256)",
  "function distributeYield(uint256)",
];

function loadEnv() {
  if (process.env.PRIVATE_KEY) return { pk: process.env.PRIVATE_KEY, rpc: process.env.RPC_URL || DEFAULT_RPC };
  const envPath = path.join(__dirname, "..", "contracts", ".env");
  const raw = fs.readFileSync(envPath, "utf8");
  const pk = raw.match(/PRIVATE_KEY=(\S+)/)?.[1];
  if (!pk) throw new Error("PRIVATE_KEY not found (env or ../contracts/.env)");
  return { pk, rpc: process.env.RPC_URL || DEFAULT_RPC };
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function tick(signer) {
  const state = loadState();
  const now = Math.floor(Date.now() / 1000);
  const owner = await signer.getAddress();
  const usdc = new Contract(USDC, ERC20_ABI, signer);

  for (const v of VAULTS) {
    const last = state[v.address];
    if (!last) {
      state[v.address] = now;
      console.log(`[${v.name}] state initialized — accrual starts now`);
      continue;
    }
    const elapsed = now - last;
    const vault = new Contract(v.address, VAULT_ABI, signer);
    const raised = await vault.totalRaised();
    const amount = (raised * BigInt(v.aprBps) * BigInt(elapsed)) / BigInt(10000 * YEAR_SEC);
    if (amount < 1_000_000n) {
      console.log(`[${v.name}] accrued < $1 over ${elapsed}s — skipping`);
      continue;
    }

    // Self-fund on testnet (capped faucet — chunk large accruals).
    let minted = 0n;
    while (minted < amount) {
      const chunk = amount - minted > FAUCET_CAP ? FAUCET_CAP : amount - minted;
      await (await usdc.mint(owner, chunk)).wait();
      minted += chunk;
    }
    const allowance = await usdc.allowance(owner, v.address);
    if (allowance < amount) {
      await (await usdc.approve(v.address, MaxUint256)).wait();
    }
    await (await vault.distributeYield(amount)).wait();
    state[v.address] = now;
    console.log(`[${v.name}] distributed $${formatUnits(amount, 6)} (${elapsed}s of accrual at ${v.aprBps / 100}% APR)`);
  }

  saveState(state);
}

async function main() {
  const args = process.argv.slice(2);
  const intervalIdx = args.indexOf("--interval");
  const intervalSec = intervalIdx >= 0 ? Number(args[intervalIdx + 1] || 600) : null;

  const { pk, rpc } = loadEnv();
  const provider = new JsonRpcProvider(rpc, CHAIN_ID, { staticNetwork: true });
  const signer = new Wallet(pk, provider);
  console.log(`operator ${await signer.getAddress()} · rpc ${rpc}`);

  await tick(signer);
  if (intervalSec) {
    console.log(`looping every ${intervalSec}s — Ctrl-C to stop`);
    setInterval(() => tick(signer).catch((e) => console.error("tick failed:", e.message)), intervalSec * 1000);
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
