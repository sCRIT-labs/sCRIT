// Migration Deployment Script for Pons sCRIT Token Integration
// Deploys:
// 1. TradingTaxHook (mined via CREATE2 to have 0x2044 Uniswap V4 hook flags)
// 2. sCRITV4Launcher (configured for the new Pons sCRIT token and new Hook)
//
// Usage:
//   node scripts/deploy-pons-pair.mjs --dry-run --token 0x...
//   node scripts/deploy-pons-pair.mjs --mainnet --token 0x...
//
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import https from "node:https";
import dns from "node:dns";
import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  parseAbi,
  parseAbiParameters,
  encodeAbiParameters,
  encodePacked,
  concatHex,
  keccak256,
  numberToHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const resolver = new dns.promises.Resolver();
resolver.setServers(["1.1.1.1", "8.8.8.8"]);

export const customFetch = (url, options = {}) => {
  if (url.startsWith("http://")) {
    return fetch(url, options);
  }
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(u, {
      method: options.method || "GET",
      headers: options.headers || {},
      lookup: (hostname, opts, cb) => {
        const callback = typeof opts === "function" ? opts : cb;
        const isAll = opts && opts.all;
        resolver.resolve4(hostname).then(
          (ips) => (isAll ? callback(null, ips.map((ip) => ({ address: ip, family: 4 }))) : callback(null, ips[0], 4)),
          (err) => callback(err)
        );
      },
    }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const buf = Buffer.concat(chunks);
        resolve(new Response(buf, {
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: res.headers,
        }));
      });
    });
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
};

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const isMainnet = args.includes("--mainnet");

function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : null;
}

// Load .env.local
const env = {};
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^"|"$|^'|'$/g, "");
  }
}

const tokenArg = getArg("--token") || env.NEXT_PUBLIC_SCRIT_PONS_MAINNET || env.NEXT_PUBLIC_SCRIT_MAINNET;
if (!tokenArg || !/^0x[0-9a-fA-F]{40}$/.test(tokenArg) || /^0x0{40}$/i.test(tokenArg)) {
  console.error("ERROR: Must provide a valid EVM token address via --token 0x... or NEXT_PUBLIC_SCRIT_PONS_MAINNET in .env.local");
  process.exit(1);
}

const network = {
  id: 4663,
  name: "Robinhood Chain",
  rpc: process.env.ROBINHOOD_RPC || "http://localhost:3001/api/rpc?chainId=4663",
  explorer: "https://robinhoodchain.blockscout.com",
  privateKey: env.MAINNET_PRIVATE_KEY,
  treasury: env.MAINNET_RESERVE_TREASURY_ADDRESS || "0x272568D25b9634Ad8A4e8E8CBB10b729f41C781d",
  operations: env.MAINNET_OPERATIONS_TREASURY_ADDRESS || "0x272568D25b9634Ad8A4e8E8CBB10b729f41C781d",
  timelock: env.NEXT_PUBLIC_SCRIT_TIMELOCK_MAINNET || "0x00824e9c6075ff2ceb10009de7f170fc6721df1a",
  weth9: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
  v4PoolManager: env.MAINNET_V4_POOL_MANAGER_ADDRESS || "0x8366a39CC670B4001A1121B8F6A443A643e40951",
  v4PositionManager: env.MAINNET_V4_POSITION_MANAGER_ADDRESS || "0x58daec3116aae6d93017baaea7749052e8a04fa7",
  v4Permit2: env.MAINNET_PERMIT2_ADDRESS || "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  create2Deployer: "0xefcb390b33d5edc90f0bf1039f94e53fb18c7346",
};

// Artifact Loader
const artifactText = readFileSync("lib/scrit-artifact.ts", "utf8");
function artifact(name) {
  const abiMatch = artifactText.match(new RegExp(`export const ${name}_ABI = (.+?) as const;`, "s"));
  const codeMatch = artifactText.match(new RegExp(`export const ${name}_BYTECODE = "(0x[0-9a-fA-F]+)"`));
  if (!abiMatch || !codeMatch) throw new Error(`Missing ${name} artifact. Run pnpm compile first.`);
  return { abi: JSON.parse(abiMatch[1]), bytecode: codeMatch[1] };
}

export function mineHookAddress(create2Deployer, initCodeHash) {
  const wantedFlags = 0x2044n; // beforeInitialize (1<<13) | afterSwap (1<<6) | afterSwapReturnDelta (1<<2)
  const permissionMask = (1n << 14n) - 1n; // 14 bits mask (0x3FFF)

  for (let i = 0; i < 2_000_000; i += 1) {
    const candidateSalt = numberToHex(BigInt(i), { size: 32 });
    const candidate = keccak256(
      encodePacked(["bytes1", "address", "bytes32", "bytes32"], ["0xff", create2Deployer, candidateSalt, initCodeHash])
    );
    const candidateAddress = `0x${candidate.slice(-40)}`;
    if ((BigInt(candidateAddress) & permissionMask) === wantedFlags) {
      return { salt: candidateSalt, address: candidateAddress, iterations: i + 1 };
    }
  }
  throw new Error("Failed to mine a valid V4 hook address within 2,000,000 iterations.");
}

async function main() {
  console.log("=====================================================");
  console.log("   sCRIT ⇋ Pons Migration Contract Deployer");
  console.log("=====================================================");
  console.log(`Target Token (Pons sCRIT): ${tokenArg}`);
  console.log(`Mode:                      ${isDryRun ? "DRY-RUN (Simulation Only)" : isMainnet ? "MAINNET (Real Execution)" : "LOCAL TEST"}`);
  console.log(`Network:                   ${network.name} (Chain ID: ${network.id})`);
  console.log(`V4 PoolManager:            ${network.v4PoolManager}`);
  console.log(`V4 PositionManager:        ${network.v4PositionManager}`);
  console.log(`CREATE2 Deployer:          ${network.create2Deployer}`);

  // 1. Prepare Hook Constructor & Mining
  const hookArt = artifact("SCRIT_TAX_HOOK");
  const constructorArgs = encodeAbiParameters(
    parseAbiParameters("address poolManager, address scritToken, address wrappedNative, address reserve, address operations"),
    [network.v4PoolManager, tokenArg, network.weth9, network.treasury, network.operations]
  );
  const initCode = concatHex([hookArt.bytecode, constructorArgs]);
  const initCodeHash = keccak256(initCode);

  console.log("\nMining CREATE2 Salt for Uniswap V4 Hook (flags 0x2044)...");
  const t0 = Date.now();
  const mined = mineHookAddress(network.create2Deployer, initCodeHash);
  const elapsed = Date.now() - t0;
  console.log(`✔ Mined in ${elapsed}ms (${mined.iterations} hashes)`);
  console.log(`  Salt:    ${mined.salt}`);
  console.log(`  Address: ${mined.address}`);

  if (isDryRun || !isMainnet) {
    console.log("\n[DRY RUN COMPLETE] Simulated contract prediction successful.");
    console.log("Predicted Deployments:");
    console.log(`- New SCRIT_TAX_HOOK: ${mined.address}`);
    console.log(`- Base Token (Pons):  ${tokenArg}`);
    console.log("\nTo deploy for real on Mainnet, run:");
    console.log(`  node scripts/deploy-pons-pair.mjs --mainnet --token ${tokenArg}`);
    return;
  }

  // 2. Real Mainnet Deployment
  if (!network.privateKey || !/^0x[0-9a-fA-F]{64}$/.test(network.privateKey)) {
    throw new Error("Missing or invalid MAINNET_PRIVATE_KEY in .env.local");
  }

  const chain = defineChain({
    id: network.id,
    name: network.name,
    nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
    rpcUrls: { default: { http: [network.rpc] } },
    blockExplorers: { default: { name: "Robinhood Explorer", url: network.explorer } },
  });

  const account = privateKeyToAccount(network.privateKey);
  const transport = http(network.rpc, { fetchFn: customFetch });
  const publicClient = createPublicClient({ chain, transport });
  const wallet = createWalletClient({ account, chain, transport });

  console.log(`\nDeployer Account: ${account.address}`);
  const bal = await publicClient.getBalance({ address: account.address });
  console.log(`Deployer Balance: ${Number(bal) / 1e18} ETH`);

  // Step A: Deploy TradingTaxHook via CREATE2 Deployer
  console.log("\n1/3 Deploying SCRIT_TAX_HOOK via CREATE2 Deployer...");
  const create2Abi = parseAbi(["function deploy(bytes32 salt, bytes initCode) returns (address deployed)"]);
  const hookTx = await wallet.writeContract({
    address: network.create2Deployer,
    abi: create2Abi,
    functionName: "deploy",
    args: [mined.salt, initCode],
  });
  console.log(`  Tx Broadcasted: ${hookTx}`);
  const hookReceipt = await publicClient.waitForTransactionReceipt({ hash: hookTx });
  if (hookReceipt.status !== "success") throw new Error(`Tax hook deployment failed: ${hookTx}`);
  console.log(`✔ SCRIT_TAX_HOOK deployed at: ${mined.address} (Block: ${hookReceipt.blockNumber})`);

  // Step B: Deploy sCRITV4Launcher
  console.log("\n2/3 Deploying sCRITV4Launcher...");
  const launcherArt = artifact("SCRIT_LAUNCHER_V4");
  const launcherHash = await wallet.deployContract({
    abi: launcherArt.abi,
    bytecode: launcherArt.bytecode,
    args: [tokenArg, network.v4PositionManager, mined.address, network.v4Permit2],
  });
  console.log(`  Tx Broadcasted: ${launcherHash}`);
  const launcherReceipt = await publicClient.waitForTransactionReceipt({ hash: launcherHash });
  if (launcherReceipt.status !== "success" || !launcherReceipt.contractAddress) {
    throw new Error(`Launcher deployment failed: ${launcherHash}`);
  }
  const launcherAddress = launcherReceipt.contractAddress;
  console.log(`✔ sCRITV4Launcher deployed at: ${launcherAddress} (Block: ${launcherReceipt.blockNumber})`);

  // Step C: Transfer Ownership of Launcher to Timelock
  console.log("\n3/3 Transferring Launcher Ownership to Timelock...");
  const transferTx = await wallet.writeContract({
    address: launcherAddress,
    abi: launcherArt.abi,
    functionName: "transferOwnership",
    args: [network.timelock],
  });
  await publicClient.waitForTransactionReceipt({ hash: transferTx });
  console.log(`✔ Launcher ownership transferred to Timelock: ${network.timelock}`);

  // Write Migration Manifest
  const manifest = {
    network: network.name,
    chainId: network.id,
    migratedAt: new Date().toISOString(),
    deployer: account.address,
    ponsScritToken: tokenArg,
    contracts: {
      SCRIT_TAX_HOOK: {
        address: mined.address,
        tx: hookTx,
        block: Number(hookReceipt.blockNumber),
        salt: mined.salt,
      },
      SCRIT_LAUNCHER_V4: {
        address: launcherAddress,
        tx: launcherHash,
        block: Number(launcherReceipt.blockNumber),
      },
    },
    timelock: network.timelock,
  };

  mkdirSync("deployments", { recursive: true });
  const manifestFile = `deployments/pons-migration-${Date.now()}.json`;
  writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest written to: ${manifestFile}`);

  console.log("\n=====================================================");
  console.log("   🎉 MIGRATION CONTRACTS SUCCESSFULLY DEPLOYED!");
  console.log("=====================================================");
  console.log("Update your .env.local with these values:");
  console.log(`NEXT_PUBLIC_SCRIT_MAINNET=${tokenArg}`);
  console.log(`NEXT_PUBLIC_SCRIT_LAUNCHER_MAINNET=${launcherAddress}`);
  console.log(`NEXT_PUBLIC_SCRIT_TAX_HOOK_MAINNET=${mined.address}`);
  console.log("=====================================================\n");
}

if (process.argv[1] && process.argv[1].endsWith("deploy-pons-pair.mjs")) {
  main().catch((err) => {
    console.error("Migration deployment error:", err);
    process.exit(1);
  });
}
