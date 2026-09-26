// End-to-end V4 launch rehearsal against a local Anvil fork only.
// Start with: anvil --fork-url <Robinhood mainnet RPC> --chain-id 4663 --hardfork cancun --port 8545
// This script rejects every endpoint except localhost and never loads .env.local.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import {
  createPublicClient, createWalletClient, decodeEventLog, defineChain, encodeAbiParameters, encodePacked,
  http, keccak256, numberToHex, parseAbi, parseAbiParameters,
} from "viem";
import { mnemonicToAccount } from "viem/accounts";

const forkUrl = process.argv[2] || "http://127.0.0.1:8545";
const fork = new URL(forkUrl);
if (!["127.0.0.1", "localhost", "::1"].includes(fork.hostname)) throw new Error("V4 rehearsal only accepts a localhost Anvil endpoint.");

const chain = defineChain({ id: 4663, name: "Robinhood local fork (simulation)", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [forkUrl] } } });
const publicClient = createPublicClient({ chain, transport: http(forkUrl) });
const localAccount = mnemonicToAccount("test test test test test test test test test test test junk");
const wallet = createWalletClient({ account: localAccount, chain, transport: http(forkUrl) });
if (await publicClient.getChainId() !== 4663) throw new Error("Local fork must report chain ID 4663.");

const addresses = {
  poolManager: "0x8366a39CC670B4001A1121B8F6A443A643e40951",
  positionManager: "0x58daec3116aae6d93017baaea7749052e8a04fa7",
  stateView: "0xf3334192d15450cdd385c8b70e03f9a6bd9e673b",
  permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
};
for (const [label, address] of Object.entries(addresses)) {
  const code = await publicClient.getCode({ address });
  if (!code || code === "0x") throw new Error(`${label} is missing on this fork.`);
}
const artifactsText = readFileSync("lib/scrit-artifact.ts", "utf8");
const artifact = (name) => {
  const abi = artifactsText.match(new RegExp(`export const ${name}_ABI = (.+?) as const;`, "s"));
  const bytecode = artifactsText.match(new RegExp(`export const ${name}_BYTECODE = \"(0x[0-9a-fA-F]+)\"`));
  if (!abi || !bytecode) throw new Error(`Missing ${name} artifact; run pnpm compile first.`);
  return { abi: JSON.parse(abi[1]), bytecode: bytecode[1] };
};
const waitDeployment = async (name, args) => {
  const art = artifact(name);
  const hash = await wallet.deployContract({ abi: art.abi, bytecode: art.bytecode, args });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success" || !receipt.contractAddress) throw new Error(`${name} deployment failed in fork.`);
  return { address: receipt.contractAddress, hash, block: Number(receipt.blockNumber) };
};
const waitTx = async (hash) => {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`Fork transaction reverted: ${hash}`);
  return receipt;
};

// Deploy production token bytecode with the local issuer as the test-only minter.
const scrit = await waitDeployment("SCRIT_INDEX", [localAccount.address, localAccount.address, localAccount.address]);
const mintHash = await wallet.writeContract({ address: scrit.address, ...artifact("SCRIT_INDEX"), functionName: "mint", args: [localAccount.address, 10_000_000_000_000_000_000_000n, keccak256("0x7666342d666f726b2d64656d6f") ] });
await waitTx(mintHash);

const create2Deployer = await waitDeployment("SCRIT_CREATE2_DEPLOYER", []);
const hookArtifact = artifact("SCRIT_TAX_HOOK");
const hookArgs = encodeAbiParameters(parseAbiParameters("address poolManager, address scritToken, address wrappedNative, address reserve, address operations"), [
  addresses.poolManager, scrit.address, "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73", localAccount.address, localAccount.address,
]);
const hookInitCode = `${hookArtifact.bytecode}${hookArgs.slice(2)}`;
const initCodeHash = keccak256(hookInitCode);
const permissionMask = (1n << 14n) - 1n;
const expectedPermissions = 0x2044n;
let salt;
let hookAddress;
for (let i = 0; i < 1_000_000; i++) {
  const candidateSalt = numberToHex(BigInt(i), { size: 32 });
  const digest = keccak256(encodePacked(["bytes1", "address", "bytes32", "bytes32"], ["0xff", create2Deployer.address, candidateSalt, initCodeHash]));
  const candidate = `0x${digest.slice(-40)}`;
  if ((BigInt(candidate) & permissionMask) === expectedPermissions) { salt = candidateSalt; hookAddress = candidate; break; }
}
if (!salt || !hookAddress) throw new Error("Could not mine the V4 hook permission address.");
const deployerArtifact = artifact("SCRIT_CREATE2_DEPLOYER");
const hookDeployHash = await wallet.writeContract({ address: create2Deployer.address, ...deployerArtifact, functionName: "deploy", args: [salt, hookInitCode] });
await waitTx(hookDeployHash);
if (!await publicClient.getCode({ address: hookAddress })) throw new Error("CREATE2 hook deployment missing code.");

const launcher = await waitDeployment("SCRIT_LAUNCHER_V4", [scrit.address, addresses.positionManager, hookAddress, addresses.permit2]);
const launcherArtifact = artifact("SCRIT_LAUNCHER_V4");
await waitTx(await wallet.writeContract({ address: launcher.address, ...launcherArtifact, functionName: "setIssuerApproved", args: [localAccount.address, true] }));
const tokenAmount = 1_000_000n * 10n ** 18n;
const pooledTokenAmount = 100_000n * 10n ** 18n;
const pooledScritAmount = 1_000n * 10n ** 18n;
await waitTx(await wallet.writeContract({ address: scrit.address, ...artifact("SCRIT_INDEX"), functionName: "approve", args: [launcher.address, pooledScritAmount] }));
const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
const launchHash = await wallet.writeContract({
  address: launcher.address, ...launcherArtifact, functionName: "launch",
  args: ["Fork Demo Asset", "FDA", tokenAmount, pooledTokenAmount, pooledScritAmount, 9_000, deadline],
  gas: 12_000_000n,
});
const launchReceipt = await waitTx(launchHash);
const launched = parseAbi(["event LaunchedV4(address indexed token,address indexed creator,bytes32 indexed poolId,uint256 positionId,uint128 liquidity,uint256 tokenAmount,uint256 scritAmount)"]);
const log = launchReceipt.logs.find((item) => {
  try { return decodeEventLog({ abi: launched, data: item.data, topics: item.topics }).eventName === "LaunchedV4"; } catch { return false; }
});
if (!log) throw new Error("LaunchedV4 event not found.");
const result = decodeEventLog({ abi: launched, data: log.data, topics: log.topics }).args;
const stateViewAbi = parseAbi(["function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96,int24 tick,uint24 protocolFee,uint24 lpFee)", "function getLiquidity(bytes32 poolId) view returns (uint128 liquidity)"]);
const [slot0, liquidity, nftOwner, tokenCode, hookCode] = await Promise.all([
  publicClient.readContract({ address: addresses.stateView, abi: stateViewAbi, functionName: "getSlot0", args: [result.poolId] }),
  publicClient.readContract({ address: addresses.stateView, abi: stateViewAbi, functionName: "getLiquidity", args: [result.poolId] }),
  publicClient.readContract({ address: addresses.positionManager, abi: parseAbi(["function ownerOf(uint256 tokenId) view returns (address)"]), functionName: "ownerOf", args: [result.positionId] }),
  publicClient.getCode({ address: result.token }),
  publicClient.getCode({ address: hookAddress }),
]);
if (slot0[0] === 0n || liquidity === 0n || nftOwner.toLowerCase() !== localAccount.address.toLowerCase() || !tokenCode || tokenCode === "0x" || !hookCode || hookCode === "0x") {
  throw new Error("V4 fork launch assertions failed: pool, liquidity, hook, token, or position ownership is missing.");
}
const launcherOwner = await publicClient.readContract({ address: launcher.address, abi: launcherArtifact.abi, functionName: "owner" });
if (launcherOwner.toLowerCase() !== localAccount.address.toLowerCase()) throw new Error("Unexpected local launcher owner.");

// Exercise the real afterSwap hook and its 75/25 treasury accounting on fork state.
const swapperArtifact = JSON.parse(readFileSync("node_modules/@uniswap/v4-periphery/foundry-out/PoolSwapTest.sol/PoolSwapTest.default.json", "utf8"));
const swapperBytecode = swapperArtifact.bytecode.object ? (swapperArtifact.bytecode.object.startsWith("0x") ? swapperArtifact.bytecode.object : `0x${swapperArtifact.bytecode.object}`) : swapperArtifact.bytecode;
const swapperHash = await wallet.deployContract({ abi: swapperArtifact.abi, bytecode: swapperBytecode, args: [addresses.poolManager] });
const swapperReceipt = await waitTx(swapperHash);
const swapper = swapperReceipt.contractAddress;
const tokenFirst = BigInt(result.token) < BigInt(scrit.address);
const poolKey = {
  currency0: tokenFirst ? result.token : scrit.address,
  currency1: tokenFirst ? scrit.address : result.token,
  fee: 3_000,
  tickSpacing: 60,
  hooks: hookAddress,
};
const inputCurrency = poolKey.currency0;
await waitTx(await wallet.writeContract({ address: inputCurrency, abi: parseAbi(["function approve(address spender,uint256 amount) returns(bool)"]), functionName: "approve", args: [swapper, 10n ** 18n] }));
const taxEventAbi = parseAbi(["event TaxCollected(bytes32 indexed poolId,address indexed currency,uint256 totalAmount,uint256 reserveAmount,uint256 operationsAmount)"]);
const beforeReserve = await publicClient.getBalance({ address: localAccount.address });
const swapHash = await wallet.writeContract({ address: swapper, abi: swapperArtifact.abi, functionName: "swap", args: [poolKey, { zeroForOne: true, amountSpecified: -(10n ** 18n), sqrtPriceLimitX96: 4_295_128_740n }, { takeClaims: false, settleUsingBurn: false }, "0x"], gas: 5_000_000n });
const swapReceipt = await waitTx(swapHash);
const taxLog = swapReceipt.logs.find((item) => {
  try { return decodeEventLog({ abi: taxEventAbi, data: item.data, topics: item.topics }).eventName === "TaxCollected"; } catch { return false; }
});
if (!taxLog) throw new Error("V4 afterSwap did not emit TaxCollected.");
const tax = decodeEventLog({ abi: taxEventAbi, data: taxLog.data, topics: taxLog.topics }).args;
if (tax.poolId.toLowerCase() !== result.poolId.toLowerCase() || tax.totalAmount === 0n || tax.reserveAmount + tax.operationsAmount !== tax.totalAmount || tax.reserveAmount !== tax.totalAmount * 7_500n / 10_000n) {
  throw new Error("V4 swap hook did not apply the expected 2.5% fee and 75/25 split.");
}
const afterReserve = await publicClient.getBalance({ address: localAccount.address });

const manifest = {
  status: "simulation_only_local_fork",
  disclaimer: "All addresses and transactions below are local Anvil fork state. They are not canonical deployments and no mainnet transaction was sent.",
  fork: { chainId: 4663, hardfork: "cancun", source: "Robinhood Chain mainnet state", endpoint: "localhost only" },
  simulatedDeployer: localAccount.address,
  dependencies: addresses,
  contracts: { scrit, create2Deployer, hook: { address: hookAddress, salt, deployTx: hookDeployHash }, launcher },
  launch: { transaction: launchHash, block: Number(launchReceipt.blockNumber), token: result.token, creator: result.creator, poolId: result.poolId, positionId: result.positionId.toString(), liquidity: result.liquidity.toString(), tokenAmount: result.tokenAmount.toString(), scritAmount: result.scritAmount.toString(), sqrtPriceX96: slot0[0].toString(), tick: slot0[1], lpFee: slot0[3], poolLiquidity: liquidity.toString(), positionOwner: nftOwner, hookHasCode: true, tokenHasCode: true },
  swap: { transaction: swapHash, block: Number(swapReceipt.blockNumber), swapper, poolId: tax.poolId, feeCurrency: tax.currency, taxAmount: tax.totalAmount.toString(), reserveAmount: tax.reserveAmount.toString(), operationsAmount: tax.operationsAmount.toString(), reserveEthBefore: beforeReserve.toString(), reserveEthAfter: afterReserve.toString() },
  checks: { launcherApprovedLocalIssuer: true, v4LaunchEvent: true, poolInitialized: slot0[0] > 0n, poolHasLiquidity: liquidity > 0n, positionNftOwnedByIssuer: true, swapSucceeded: true, afterSwapTaxEvent: true, taxSplit75_25: tax.reserveAmount + tax.operationsAmount === tax.totalAmount && tax.reserveAmount === tax.totalAmount * 7_500n / 10_000n, localForkOnly: true },
};
mkdirSync("deployments/rehearsals", { recursive: true });
const manifestPath = "deployments/rehearsals/robinhood-mainnet-v4-fork-2026-09-26.json";
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ manifestPath, checks: manifest.checks, launch: manifest.launch }, null, 2));
