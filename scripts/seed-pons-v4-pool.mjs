// Seed / Initialize Uniswap V4 Pool for Pons sCRIT Pair
// Usage:
//   node scripts/seed-pons-v4-pool.mjs --dry-run --token <PROJECT_TOKEN> --scrit <PONS_SCRIT> --hook <NEW_HOOK>
//   node scripts/seed-pons-v4-pool.mjs --mainnet --token <PROJECT_TOKEN> --scrit <PONS_SCRIT> --hook <NEW_HOOK> --token-amount 1000 --scrit-amount 0.5
//
import { readFileSync, existsSync } from "node:fs";
import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  parseAbi,
  parseEther,
  keccak256,
  encodeAbiParameters,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const isMainnet = args.includes("--mainnet");

function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : null;
}

const env = {};
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^"|"$|^'|'$/g, "");
  }
}

const tokenAddr = getArg("--token");
const scritAddr = getArg("--scrit") || env.NEXT_PUBLIC_SCRIT_MAINNET;
const hookAddr = getArg("--hook") || env.NEXT_PUBLIC_SCRIT_TAX_HOOK_MAINNET;
const tokenAmount = getArg("--token-amount") || "1000";
const scritAmount = getArg("--scrit-amount") || "0.5";

if (!tokenAddr || !scritAddr || !hookAddr) {
  console.log("Usage: node scripts/seed-pons-v4-pool.mjs [--dry-run|--mainnet] --token <PROJECT_TOKEN> --scrit <PONS_SCRIT> --hook <NEW_HOOK>");
  process.exit(1);
}

// Currency ordering: currency0 < currency1
const isToken0 = BigInt(tokenAddr) < BigInt(scritAddr);
const currency0 = isToken0 ? tokenAddr : scritAddr;
const currency1 = isToken0 ? scritAddr : tokenAddr;

const poolKey = {
  currency0,
  currency1,
  fee: 3000,
  tickSpacing: 60,
  hooks: hookAddr,
};

const poolKeyTuple = {
  type: "tuple",
  components: [
    { name: "currency0", type: "address" },
    { name: "currency1", type: "address" },
    { name: "fee", type: "uint24" },
    { name: "tickSpacing", type: "int24" },
    { name: "hooks", type: "address" },
  ],
};

const poolId = keccak256(
  encodeAbiParameters(
    [poolKeyTuple],
    [[poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]]
  )
);

console.log("=====================================================");
console.log("   Uniswap V4 Pool Config (Pons sCRIT Pair)");
console.log("=====================================================");
console.log(`Currency0:      ${currency0} (${isToken0 ? "Project Token" : "sCRIT"})`);
console.log(`Currency1:      ${currency1} (${isToken0 ? "sCRIT" : "Project Token"})`);
console.log(`Fee Tier:       0.30% (3000)`);
console.log(`Hook (2.5%):    ${hookAddr}`);
console.log(`Pool ID:        ${poolId}`);
console.log("=====================================================");

if (isDryRun || !isMainnet) {
  console.log("\n[DRY RUN COMPLETE] PoolKey generated safely.");
  process.exit(0);
}
