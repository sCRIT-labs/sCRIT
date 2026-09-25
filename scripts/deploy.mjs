// Deploy sCRIT contracts. Local CLI only — NEVER commit PRIVATE_KEY.
// Usage: node scripts/deploy.mjs --testnet   (token only, rehearsal)
//        node scripts/deploy.mjs --mainnet   (token + launcher)
import { readFileSync, existsSync } from "node:fs";
import { createPublicClient, createWalletClient, http, defineChain, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const mode = process.argv.includes("--mainnet") ? "mainnet" : process.argv.includes("--testnet") ? "testnet" : null;
if (!mode) {
  console.error("Usage: node scripts/deploy.mjs --testnet | --mainnet");
  process.exit(1);
}

// Minimal .env.local parser (no dependency).
const env = {};
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const pk = env.PRIVATE_KEY;
if (!/^0x[0-9a-fA-F]{64}$/.test(pk ?? "")) {
  console.error("Set PRIVATE_KEY=0x... (64 hex) in .env.local. Never commit it.");
  process.exit(1);
}

const chains = {
  mainnet: { id: 4663, rpc: "https://rpc.mainnet.chain.robinhood.com", explorer: "https://robinhoodchain.blockscout.com" },
  testnet: { id: 46630, rpc: "https://rpc.testnet.chain.robinhood.com", explorer: "https://explorer.testnet.chain.robinhood.com" },
};
const cfg = chains[mode];
const router = env.ROUTER_ADDRESS;
if (mode === "mainnet" && !/^0x[0-9a-fA-F]{40}$/.test(router ?? "")) {
  throw new Error("Set ROUTER_ADDRESS to a router verified for Robinhood Chain before mainnet deployment.");
}
if (router && !/^0x[0-9a-fA-F]{40}$/.test(router)) throw new Error("ROUTER_ADDRESS must be a 20-byte EVM address.");
const chain = defineChain({
  id: cfg.id,
  name: `hood-${mode}`,
  nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
  rpcUrls: { default: { http: [cfg.rpc] } },
  blockExplorers: { default: { name: "explorer", url: cfg.explorer } },
});

const art = readFileSync("lib/scrit-artifact.ts", "utf8");
const grab = (name) => {
  const m = art.match(new RegExp(`export const ${name} = "(0x[0-9a-fA-F]+)"`));
  if (!m) throw new Error(`artifact ${name} missing — run node scripts/compile.mjs first`);
  return m[1];
};
const abiOf = (name) => {
  const m = art.match(new RegExp(`export const ${name} = (\\[.+?\\]) as const;`, "s"));
  if (!m) throw new Error(`abi ${name} missing`);
  return JSON.parse(m[1]);
};

const account = privateKeyToAccount(pk);
const pub = createPublicClient({ chain, transport: http(cfg.rpc) });
const wallet = createWalletClient({ account, chain, transport: http(cfg.rpc) });

const chainId = await pub.getChainId();
if (chainId !== cfg.id) throw new Error(`wrong chain ${chainId}, want ${cfg.id}`);
if (router) {
  const routerCode = await pub.getCode({ address: router });
  if (!routerCode || routerCode === "0x") throw new Error("ROUTER_ADDRESS has no deployed contract on the selected chain.");
}

const SUPPLY = 999000000n * 10n ** 18n;
console.log(`Deploying sCRITToken (999M) to ${mode} from ${account.address}...`);
const tokenHash = await wallet.deployContract({
  abi: abiOf("SCRIT_ABI"),
  bytecode: grab("SCRIT_BYTECODE"),
  args: ["sCRIT", "sCRIT", SUPPLY],
});
const tokenReceipt = await pub.waitForTransactionReceipt({ hash: tokenHash });
console.log("token tx:", tokenHash);
console.log("sCRIT:", tokenReceipt.contractAddress);
console.log(`verify: ${cfg.explorer}/address/${tokenReceipt.contractAddress}`);

if (router) {
  console.log(`Deploying sCRITLauncher(scrit, router ${router})...`);
  const launcherHash = await wallet.deployContract({
    abi: abiOf("SCRIT_LAUNCHER_ABI"),
    bytecode: grab("SCRIT_LAUNCHER_BYTECODE"),
    args: [tokenReceipt.contractAddress, router],
  });
  const launcherReceipt = await pub.waitForTransactionReceipt({ hash: launcherHash });
  console.log("launcher tx:", launcherHash);
  console.log("launcher:", launcherReceipt.contractAddress);
  console.log(`verify: ${cfg.explorer}/address/${launcherReceipt.contractAddress}`);
  console.log("\nNext: set in .env.local / Vercel:");
  console.log(`NEXT_PUBLIC_SCRIT=${tokenReceipt.contractAddress}`);
  console.log(`NEXT_PUBLIC_SCRIT_LAUNCHER=${launcherReceipt.contractAddress}`);
  console.log("Then verify both on Blockscout (Standard-JSON, solc 0.8.26, runs 200).");
} else {
  console.log("\nSet NEXT_PUBLIC_SCRIT in .env.local and Vercel.");
  if (router) console.log("Set NEXT_PUBLIC_SCRIT_LAUNCHER to the launcher above and approve test wallets on-chain.");
  else console.log("No ROUTER_ADDRESS was supplied, so this rehearsal deployed only the token; Rail A launching is unavailable.");
}
