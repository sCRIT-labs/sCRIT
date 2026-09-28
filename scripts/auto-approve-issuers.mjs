// Fully automatic issuer approval bot (no human in the loop).
// Policy: a pending applicant is approved iff its wallet holds >= MIN_SCRIT
// on the target chain. Buying sCRIT costs real money through the taxed pool,
// which is the entire spam deterrent. Identity/quality are NOT checked.
//
// Runs per chain: --mainnet and/or --testnet (default: both).
// Writes: service DB approval + on-chain launcher allowlist via timelock.
// --dry-run prints decisions without sending transactions or DB writes.
import { existsSync, readFileSync } from "node:fs";
import postgres from "postgres";
import { createPublicClient, createWalletClient, defineChain, http, parseAbi, encodeFunctionData, keccak256, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const MIN_SCRIT_E18 = 1000000000000000n; // 0.001 sCRIT

export function meetsAutoApproval(balanceE18) {
  return typeof balanceE18 === "bigint" && balanceE18 >= MIN_SCRIT_E18;
}

const RUN_MAIN = process.argv[1] !== undefined && process.argv[1].endsWith("auto-approve-issuers.mjs");
const DRY = process.argv.includes("--dry-run");
const modes = [];
if (process.argv.includes("--mainnet")) modes.push("mainnet");
if (process.argv.includes("--testnet")) modes.push("testnet");
if (modes.length === 0) modes.push("mainnet", "testnet");

const env = {};
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^"|"$|^'|'$/g, "");
  }
}

const CHAINS = {
  mainnet: { id: 4663, name: "Robinhood Chain", rpc: env.ROBINHOOD_MAINNET_RPC_URL || "https://rpc.mainnet.chain.robinhood.com", suffix: "MAINNET", key: env.MAINNET_PRIVATE_KEY },
  testnet: { id: 46630, name: "Robinhood Testnet", rpc: env.SCRIT_INDEXER_RPC_URL || "https://rpc.testnet.chain.robinhood.com", suffix: "TESTNET", key: env.PRIVATE_KEY },
};
const addrFor = (key, suffix, fallback) => env[`${key}_${suffix}`] || env[key] || fallback;

if (RUN_MAIN) {
  await runModes();
}

async function runModes() {
for (const mode of modes) {
  const cfg = CHAINS[mode];
  console.log(`\n=== ${mode} ===`);
  if (!/^0x[0-9a-fA-F]{64}$/.test(cfg.key ?? "")) { console.log("skip: no deployer key"); continue; }
  const chain = defineChain({ id: cfg.id, name: cfg.name, nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [cfg.rpc] } } });
  const account = privateKeyToAccount(cfg.key);
  const pub = createPublicClient({ chain, transport: http(cfg.rpc) });
  const wal = createWalletClient({ account, chain, transport: http(cfg.rpc) });
  if (await pub.getChainId() !== cfg.id) throw new Error(`wrong RPC chain for ${mode}`);
  const token = addrFor("NEXT_PUBLIC_SCRIT", cfg.suffix, "0x0000000000000000000000000000000000000000");
  const launcher = addrFor("NEXT_PUBLIC_SCRIT_LAUNCHER", cfg.suffix, "0x0000000000000000000000000000000000000000");
  const timelock = mode === "mainnet" ? env.NEXT_PUBLIC_SCRIT_TIMELOCK_MAINNET : (env.NEXT_PUBLIC_SCRIT_TIMELOCK_TESTNET || env.NEXT_PUBLIC_SCRIT_TIMELOCK);
  if (!/^0x[0-9a-fA-F]{40}$/.test(token) || /^0x0{40}$/i.test(token) || !/^0x[0-9a-fA-F]{40}$/.test(launcher) || !/^0x[0-9a-fA-F]{40}$/.test(timelock)) {
    console.log("skip: contracts unconfigured");
    continue;
  }
  const sql = postgres(env.DATABASE_URL, { max: 2, connect_timeout: 10, prepare: false });
  try {
    const pending = await sql`select wallet,name from scrit_issuer_registry where approved=false`;
    console.log(`pending: ${pending.length}`);
    const erc20 = parseAbi(["function balanceOf(address) view returns (uint256)"]);
    const launchAbi = parseAbi(["function issuerApproved(address) view returns (bool)"]);
    const tlAbi = parseAbi(["function schedule(address target,uint256 value,bytes data,bytes32 predecessor,bytes32 salt,uint256 delay)", "function execute(address target,uint256 value,bytes payload,bytes32 predecessor,bytes32 salt)"]);
    const zero = "0x0000000000000000000000000000000000000000000000000000000000000000";
    for (const row of pending) {
      const wallet = row.wallet;
      const bal = await pub.readContract({ address: token, abi: erc20, functionName: "balanceOf", args: [wallet] });
      const onchain = await pub.readContract({ address: launcher, abi: launchAbi, functionName: "issuerApproved", args: [wallet] });
      const ok = meetsAutoApproval(bal);
      console.log(`${wallet} balance=${bal} onchain=${onchain} -> ${ok ? "APPROVE" : "skip (below 0.001 sCRIT)"}${DRY ? " [dry]" : ""}`);
      if (!ok || DRY) continue;
      if (!onchain) {
        const data = encodeFunctionData({ abi: parseAbi(["function setIssuerApproved(address,bool)"]), functionName: "setIssuerApproved", args: [wallet, true] });
        const salt = keccak256(toBytes(`auto-approve-${mode}-${wallet.toLowerCase()}`));
        const s = await wal.writeContract({ address: timelock, abi: tlAbi, functionName: "schedule", args: [launcher, 0n, data, zero, salt, 0n] });
        await pub.waitForTransactionReceipt({ hash: s });
        const e = await wal.writeContract({ address: timelock, abi: tlAbi, functionName: "execute", args: [launcher, 0n, data, zero, salt] });
        await pub.waitForTransactionReceipt({ hash: e });
        console.log(`  timelock approved: ${e}`);
      }
      await sql`update scrit_issuer_registry set approved=true, updated_at=now() where wallet=${wallet}`;
      console.log("  service approved");
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}
  console.log(DRY ? "dry-run complete" : "done");
} // end runModes
