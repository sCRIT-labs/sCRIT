// Local CLI only. Run testnet first; --mainnet intentionally sends real transactions.
// Usage: pnpm compile && pnpm deploy:testnet | pnpm deploy:mainnet
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { createPublicClient, createWalletClient, http, defineChain, getContractAddress, parseAbi, parseAbiParameters, parseEther, encodeAbiParameters, encodePacked, concatHex, keccak256, numberToHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { assertExpectedDeployer } from "./deploy-config.mjs";

const mode = process.argv.includes("--mainnet") ? "mainnet" : process.argv.includes("--testnet") ? "testnet" : null;
if (!mode) {
  console.error("Usage: node scripts/deploy.mjs --testnet | --mainnet");
  process.exit(1);
}

const env = {};
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^"|"$|^'|'$/g, "");
  }
}

const network = mode === "mainnet" ? {
  id: 4663,
  name: "Robinhood Chain",
  rpc: env.ROBINHOOD_MAINNET_RPC_URL || "https://rpc.mainnet.chain.robinhood.com",
  explorer: "https://robinhoodchain.blockscout.com",
  privateKey: env.MAINNET_PRIVATE_KEY || env.PRIVATE_KEY,
  expectedDeployer: env.MAINNET_DEPLOYER_ADDRESS,
  admin: env.MAINNET_ADMIN_ADDRESS || env.ADMIN_MULTISIG,
  guardian: env.MAINNET_PAUSER_ADDRESS || env.PAUSER_ADDRESS,
  priceSigner: env.MAINNET_PRICE_SIGNER_ADDRESS || env.PRICE_SIGNER_ADDRESS,
  treasury: env.MAINNET_RESERVE_TREASURY_ADDRESS || env.RESERVE_TREASURY_ADDRESS,
  operations: env.MAINNET_OPERATIONS_TREASURY_ADDRESS || env.OPERATIONS_TREASURY_ADDRESS,
  maxSupply: env.MAINNET_SCRIT_MAX_SUPPLY || env.SCRIT_MAX_SUPPLY,
  factory: env.MAINNET_V3_FACTORY_ADDRESS || "0x1f7d7550B1b028f7571E69A784071F0205FD2EfA",
  positionManager: env.MAINNET_V3_POSITION_MANAGER_ADDRESS || "0x73991a25C818Bf1f1128dEAaB1492D45638DE0D3",
  fee: Number(env.MAINNET_V3_FEE_TIER || "3000"),
  v4PoolManager: env.MAINNET_V4_POOL_MANAGER_ADDRESS || "0x8366a39CC670B4001A1121B8F6A443A643e40951",
  v4PositionManager: env.MAINNET_V4_POSITION_MANAGER_ADDRESS || "0x58daec3116aae6d93017baaea7749052e8a04fa7",
  v4StateView: env.MAINNET_V4_STATE_VIEW_ADDRESS || "0xf3334192d15450cdd385c8b70e03f9a6bd9e673b",
  v4Permit2: env.MAINNET_PERMIT2_ADDRESS || "0x000000000022D473030F116dDEE9F6B43aC78BA3",
} : {
  id: 46630,
  name: "Robinhood Testnet",
  rpc: env.SCRIT_INDEXER_RPC_URL || "https://rpc.testnet.chain.robinhood.com",
  explorer: "https://explorer.testnet.chain.robinhood.com",
  privateKey: env.PRIVATE_KEY,
  expectedDeployer: env.TESTNET_DEPLOYER_ADDRESS,
  admin: env.ADMIN_MULTISIG,
  guardian: env.PAUSER_ADDRESS,
  priceSigner: env.PRICE_SIGNER_ADDRESS,
  treasury: env.RESERVE_TREASURY_ADDRESS,
  operations: env.OPERATIONS_TREASURY_ADDRESS,
  maxSupply: env.SCRIT_MAX_SUPPLY,
  factory: env.V3_FACTORY_ADDRESS,
  positionManager: env.V3_POSITION_MANAGER_ADDRESS,
  fee: Number(env.V3_FEE_TIER || "3000"),
};
const privateKey = network.privateKey;
if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey ?? "")) throw new Error(`Set ${mode === "mainnet" ? "MAINNET_PRIVATE_KEY (or PRIVATE_KEY)" : "PRIVATE_KEY"} in local .env.local; never put it in hosted app settings.`);
const validAddress = (value) => /^0x[0-9a-fA-F]{40}$/.test(value ?? "") && !/^0x0{40}$/i.test(value);
for (const key of ["admin", "guardian", "priceSigner", "treasury"]) {
  if (!validAddress(network[key])) throw new Error(`Set the ${mode} ${key} address to a non-zero EVM address.`);
}
if (!/^\d+(?:\.\d+)?$/.test(network.maxSupply ?? "")) throw new Error(`Set ${mode === "mainnet" ? "MAINNET_SCRIT_MAX_SUPPLY" : "SCRIT_MAX_SUPPLY"} to a positive token amount (for example 1000000).`);

const chain = defineChain({
  id: network.id,
  name: network.name,
  nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
  rpcUrls: { default: { http: [network.rpc] } },
  blockExplorers: { default: { name: "Robinhood Explorer", url: network.explorer } },
});
const account = privateKeyToAccount(privateKey);
const operationsTreasury = mode === "mainnet" ? network.operations || account.address : network.operations;
if (mode === "mainnet" && !validAddress(operationsTreasury)) throw new Error("Invalid mainnet operations treasury address.");
assertExpectedDeployer(account.address, network.expectedDeployer);
const rpcUrl = network.rpc;
const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
const wallet = createWalletClient({ account, chain, transport: http(rpcUrl) });
if (await publicClient.getChainId() !== chain.id) throw new Error(`Connected RPC is not ${network.name}.`);
const v3FactoryAddress = network.factory;
const v3PositionManagerAddress = network.positionManager;
if (!validAddress(v3FactoryAddress) || !validAddress(v3PositionManagerAddress)) {
  throw new Error(`Set valid V3 factory and position manager addresses for ${network.name}.`);
}
const [v3FactoryCode, positionManagerCode] = await Promise.all([
  publicClient.getCode({ address: v3FactoryAddress }),
  publicClient.getCode({ address: v3PositionManagerAddress }),
]);
if (!v3FactoryCode || v3FactoryCode === "0x") throw new Error("V3 factory has no code on the selected network.");
if (!positionManagerCode || positionManagerCode === "0x") throw new Error("V3 position manager has no code on the selected network.");
const positionManagerAbi = parseAbi([
  "function factory() view returns (address)",
  "function WETH9() view returns (address)",
]);
const [managerFactory, weth9] = await Promise.all([
  publicClient.readContract({ address: v3PositionManagerAddress, abi: positionManagerAbi, functionName: "factory" }),
  publicClient.readContract({ address: v3PositionManagerAddress, abi: positionManagerAbi, functionName: "WETH9" }),
]);
if (managerFactory.toLowerCase() !== v3FactoryAddress.toLowerCase()) {
  throw new Error("V3 position manager factory does not match V3_FACTORY_ADDRESS.");
}
const wethCode = await publicClient.getCode({ address: weth9 });
if (!wethCode || wethCode === "0x") throw new Error("V3 position manager WETH9 address has no code on the selected network.");
if (mode === "mainnet") {
  for (const [label, address] of [["V4 PoolManager", network.v4PoolManager], ["V4 PositionManager", network.v4PositionManager], ["V4 StateView", network.v4StateView], ["Permit2", network.v4Permit2]]) {
    if (!validAddress(address)) throw new Error(`Invalid ${label} address.`);
    const code = await publicClient.getCode({ address });
    if (!code || code === "0x") throw new Error(`${label} has no code on ${network.name}.`);
  }
  const v4PmAbi = parseAbi(["function poolManager() view returns (address)"]);
  const boundManager = await publicClient.readContract({ address: network.v4PositionManager, abi: v4PmAbi, functionName: "poolManager" });
  if (boundManager.toLowerCase() !== network.v4PoolManager.toLowerCase()) throw new Error("V4 PositionManager PoolManager immutable mismatch.");
}
const v3FactoryAbi = parseAbi(["function feeAmountTickSpacing(uint24 fee) view returns (int24)"]);
const fee = network.fee;
if (!Number.isInteger(fee) || fee <= 0 || fee > 1_000_000) throw new Error("Invalid V3 fee tier.");
const tickSpacing = await publicClient.readContract({
  address: v3FactoryAddress,
  abi: v3FactoryAbi,
  functionName: "feeAmountTickSpacing",
  args: [fee],
});
if (tickSpacing <= 0) throw new Error("V3 factory does not enable the 3000 fee tier.");
const adminCode = await publicClient.getCode({ address: network.admin });
if (!adminCode || adminCode === "0x") console.warn("Admin address has no contract code; this deployment uses an EOA admin.");
const artifactText = readFileSync("lib/scrit-artifact.ts", "utf8");
const artifact = (name) => {
  const abiMatch = artifactText.match(new RegExp(`export const ${name}_ABI = (.+?) as const;`, "s"));
  const codeMatch = artifactText.match(new RegExp(`export const ${name}_BYTECODE = "(0x[0-9a-fA-F]+)"`));
  if (!abiMatch || !codeMatch) throw new Error(`Missing ${name} artifact. Run pnpm compile first.`);
  return { abi: JSON.parse(abiMatch[1]), bytecode: codeMatch[1] };
};
const deployed = [];
const deploymentId = new Date().toISOString().replaceAll(":", "-");
const manifestPath = `deployments/robinhood-${mode}-${deploymentId}.json`;
const manifest = {
  network: network.name,
  chainId: network.id,
  deployedAt: new Date().toISOString(),
  deployer: account.address,
  v3: { factory: v3FactoryAddress, positionManager: v3PositionManagerAddress, feeTier: fee, tickSpacing, weth9 },
  contracts: {},
  launcherOwner: null,
  timelockMinDelaySeconds: 172800,
  status: "in_progress",
};
mkdirSync("deployments", { recursive: true });
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
const deploy = async (name, args) => {
  const art = artifact(name);
  const hash = await wallet.deployContract({ abi: art.abi, bytecode: art.bytecode, args });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success" || !receipt.contractAddress) throw new Error(`${name} deployment failed: ${hash}`);
  console.log(`${name}: ${receipt.contractAddress} (tx ${hash}, block ${receipt.blockNumber})`);
  deployed.push({ name, address: receipt.contractAddress, tx: hash, block: Number(receipt.blockNumber) });
  manifest.contracts[name] = { address: receipt.contractAddress, tx: hash, block: Number(receipt.blockNumber) };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return receipt.contractAddress;
};

const admin = network.admin;
const guardian = network.guardian;
const timelock = await deploy("SCRIT_TIMELOCK", [172800n, [admin], [admin], "0x0000000000000000000000000000000000000000"]);
const custodianRegistry = await deploy("SCRIT_CUSTODIANS", [timelock]);
const priceAdapter = await deploy("SCRIT_PRICES", [timelock, network.priceSigner]);
const kycRegistry = await deploy("SCRIT_KYC", [timelock]);

// Predict deployment addresses for the token/manager constructor dependency cycle.
let nonce = await publicClient.getTransactionCount({ address: account.address });
const predictedToken = getContractAddress({ from: account.address, nonce: BigInt(nonce + 1) });
const reserveManager = await deploy("SCRIT_RESERVE", [timelock, guardian, network.treasury, predictedToken, custodianRegistry, priceAdapter, parseEther(network.maxSupply)]);
nonce = await publicClient.getTransactionCount({ address: account.address });
const scrit = await deploy("SCRIT_INDEX", [timelock, reserveManager, guardian]);
if (scrit.toLowerCase() !== predictedToken.toLowerCase()) throw new Error("Token address prediction mismatch; stop and inspect deployment nonce history.");

let taxHook;
if (mode === "mainnet") {
  const basePoolKey = {
    currency0: "0x0000000000000000000000000000000000000000",
    currency1: scrit,
    fee: 3_000,
    tickSpacing: 60,
    hooks: "0x0000000000000000000000000000000000000000",
  };
  const poolKeyTuple = { type: "tuple", components: [
    { name: "currency0", type: "address" }, { name: "currency1", type: "address" },
    { name: "fee", type: "uint24" }, { name: "tickSpacing", type: "int24" }, { name: "hooks", type: "address" },
  ] };
  const basePoolId = keccak256(encodeAbiParameters([poolKeyTuple], [[basePoolKey.currency0, basePoolKey.currency1, basePoolKey.fee, basePoolKey.tickSpacing, basePoolKey.hooks]]));
  manifest.baseMarket = { poolKey: basePoolKey, poolId: basePoolId, stateView: network.v4StateView, seeded: false, note: "Canonical hookless native-ETH/sCRIT pool; seed only after sCRIT issuance and explicit ETH liquidity are available." };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const create2Deployer = await deploy("SCRIT_CREATE2_DEPLOYER", []);
  const hookArtifact = artifact("SCRIT_TAX_HOOK");
  const constructorArgs = encodeAbiParameters(
    parseAbiParameters("address poolManager, address scritToken, address wrappedNative, address reserve, address operations"),
    [network.v4PoolManager, scrit, weth9, network.treasury, operationsTreasury]
  );
  const initCode = concatHex([hookArtifact.bytecode, constructorArgs]);
  const initCodeHash = keccak256(initCode);
  const wantedFlags = 0x2044n; // beforeInitialize | afterSwap | afterSwapReturnDelta
  const permissionMask = (1n << 14n) - 1n;
  let salt;
  let predictedHook;
  for (let i = 0; i < 1_000_000; i += 1) {
    const candidateSalt = numberToHex(BigInt(i), { size: 32 });
    const candidate = keccak256(encodePacked(["bytes1", "address", "bytes32", "bytes32"], ["0xff", create2Deployer, candidateSalt, initCodeHash]));
    const candidateAddress = `0x${candidate.slice(-40)}`;
    const deployedCode = (BigInt(candidateAddress) & permissionMask) === wantedFlags
      ? await publicClient.getCode({ address: candidateAddress })
      : undefined;
    if ((BigInt(candidateAddress) & permissionMask) === wantedFlags && (!deployedCode || deployedCode === "0x")) {
      salt = candidateSalt;
      predictedHook = candidateAddress;
      break;
    }
  }
  if (!salt || !predictedHook) throw new Error("Could not mine a valid V4 hook address.");
  const create2Abi = parseAbi(["function deploy(bytes32 salt, bytes initCode) returns (address deployed)"]);
  const hookTx = await wallet.writeContract({ address: create2Deployer, abi: create2Abi, functionName: "deploy", args: [salt, initCode] });
  const hookReceipt = await publicClient.waitForTransactionReceipt({ hash: hookTx });
  if (hookReceipt.status !== "success" || !await publicClient.getCode({ address: predictedHook })) throw new Error(`Tax hook deployment failed: ${hookTx}`);
  taxHook = predictedHook;
  manifest.contracts.SCRIT_TAX_HOOK = { address: taxHook, tx: hookTx, block: Number(hookReceipt.blockNumber), create2Deployer, salt };
  manifest.v4 = { poolManager: network.v4PoolManager, positionManager: network.v4PositionManager, permit2: network.v4Permit2, hook: taxHook, feeBps: 250, reserveSplitBps: 7500, reserveTreasury: network.treasury, operationsTreasury };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`SCRIT_TAX_HOOK: ${taxHook} (tx ${hookTx}, mined salt ${salt})`);
}

// Predict the mutually-referencing Rail B contracts, then verify each deployed address.
nonce = await publicClient.getTransactionCount({ address: account.address });
const predictedLotToken = getContractAddress({ from: account.address, nonce: BigInt(nonce + 1) });
const predictedRedemption = getContractAddress({ from: account.address, nonce: BigInt(nonce + 2) });
const lotManager = await deploy("SCRIT_LOT_MANAGER", [timelock, guardian, custodianRegistry, predictedLotToken]);
const lotToken = await deploy("SCRIT_LOT_TOKEN", [timelock, lotManager, predictedRedemption, guardian, env.LOT_METADATA_URI ?? ""]);
if (lotToken.toLowerCase() !== predictedLotToken.toLowerCase()) throw new Error("Lot token address prediction mismatch.");
const redemption = await deploy("SCRIT_LOT_REDEMPTION", [timelock, guardian, lotToken, kycRegistry]);
if (redemption.toLowerCase() !== predictedRedemption.toLowerCase()) throw new Error("Redemption address prediction mismatch.");
const marketplace = await deploy("SCRIT_LOT_MARKET", [scrit, lotToken]);

const launcherArtifactName = mode === "mainnet" ? "SCRIT_LAUNCHER_V4" : "SCRIT_LAUNCHER";
const launcher = mode === "mainnet"
  ? await deploy(launcherArtifactName, [scrit, network.v4PositionManager, taxHook, network.v4Permit2])
  : await deploy(launcherArtifactName, [scrit, v3PositionManagerAddress, fee]);
const launchArt = artifact(launcherArtifactName);
const ownershipTx = await wallet.writeContract({ address: launcher, abi: launchArt.abi, functionName: "transferOwnership", args: [timelock] });
const ownershipReceipt = await publicClient.waitForTransactionReceipt({ hash: ownershipTx });
if (ownershipReceipt.status !== "success") throw new Error(`Launcher ownership transfer failed: ${ownershipTx}`);
manifest.launcherOwner = timelock;
manifest.launcherOwnershipTransferTx = ownershipTx;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
if (mode === "mainnet") console.log(`V4 PoolManager: ${network.v4PoolManager} · hook tax 2.5% (75% reserve / 25% operations) · operations wallet ${operationsTreasury}`);
else console.log(`V3 factory: ${v3FactoryAddress} (fee ${fee}, tick spacing ${tickSpacing})`);
console.log(`${mode === "mainnet" ? "V4" : "V3"} position manager: ${mode === "mainnet" ? network.v4PositionManager : v3PositionManagerAddress}`);
console.log(`Launcher owner set to timelock ${timelock}`);

console.log(`\n${network.name} deployment complete. Role/configuration proposals still need the timelock's 48-hour schedule and execution.`);
const envSuffix = mode === "mainnet" ? "MAINNET" : "TESTNET";
console.log(`NEXT_PUBLIC_SCRIT_${envSuffix}=${scrit}`);
console.log(`NEXT_PUBLIC_SCRIT_RESERVE_MANAGER_${envSuffix}=${reserveManager}`);
console.log(`NEXT_PUBLIC_SCRIT_CUSTODIANS_${envSuffix}=${custodianRegistry}`);
console.log(`NEXT_PUBLIC_SCRIT_PRICE_ADAPTER_${envSuffix}=${priceAdapter}`);
console.log(`NEXT_PUBLIC_SCRIT_LOT_TOKEN_${envSuffix}=${lotToken}`);
console.log(`NEXT_PUBLIC_SCRIT_LOT_MANAGER_${envSuffix}=${lotManager}`);
console.log(`NEXT_PUBLIC_SCRIT_LOT_MARKETPLACE_${envSuffix}=${marketplace}`);
console.log(`NEXT_PUBLIC_SCRIT_REDEMPTION_${envSuffix}=${redemption}`);
console.log(`NEXT_PUBLIC_SCRIT_TIMELOCK_${envSuffix}=${timelock}`);
console.log(`NEXT_PUBLIC_SCRIT_LAUNCHER_${envSuffix}=${launcher}`);
if (mode === "mainnet") {
  console.log(`NEXT_PUBLIC_SCRIT_TAX_HOOK_MAINNET=${taxHook}`);
  console.log(`NEXT_PUBLIC_SCRIT_V4_POSITION_MANAGER_MAINNET=${network.v4PositionManager}`);
  console.log(`NEXT_PUBLIC_SCRIT_BASE_POOL_ID_MAINNET=${manifest.baseMarket.poolId}`);
  console.log(`MAINNET_V4_STATE_VIEW_ADDRESS=${network.v4StateView}`);
  console.log("Set NEXT_PUBLIC_SCRIT_CHAIN_ID=4663 only after reviewing the manifest and explorer sources.");
}
manifest.status = "complete";
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Deployment manifest: ${manifestPath}`);
console.log(`Verify every address and source on ${network.name} explorer before connecting the frontend.`);
