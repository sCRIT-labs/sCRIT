// Explicit Robinhood mainnet command. Never run implicitly from deployment.
// Usage: pnpm market:seed:v4 -- --token 0x... --timelock 0x... --scrit 1000 --eth 0.25 [--manifest deployments/file.json]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  createPublicClient, createWalletClient, defineChain, encodeAbiParameters, encodeFunctionData, formatEther, http,
  keccak256, parseAbi, parseAbiParameters, parseEther, parseEventLogs,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const ZERO = "0x0000000000000000000000000000000000000000";
const Q96 = 1n << 96n;
const MIN_SQRT_RATIO = 4_295_128_739n;
const MAX_SQRT_RATIO = 1_461_446_703_485_210_103_287_273_052_203_988_822_378_723_970_342n;
const MAX_UINT256 = (1n << 256n) - 1n;
const TICK_FACTORS = [
  0xfffcb933bd6fad37aa2d162d1a594001n, 0xfff97272373d413259a46990580e213an,
  0xfff2e50f5f656932ef12357cf3c7fdccn, 0xffe5caca7e10e4e61c3624eaa0941cdn,
  0xffcb9843d60f6159c9db58835c926644n, 0xff973b41fa98c081472e6896dfb254c0n,
  0xff2ea16466c96a3843ec78b326b52861n, 0xfe5dee046a99a2a811c461f1969c3053n,
  0xfcbe86c7900a88aedcffc83b479aa3a4n, 0xf987a7253ac413176f2b074cf7815e54n,
  0xf3392b0822b70005940c7a398e4b70f3n, 0xe7159475a2c29b7443b29c7fa6e889d9n,
  0xd097f3bdfd2022b8845ad8f792aa5825n, 0xa9f746462d870fdf8a65dc1f90e061e5n,
  0x70d869a156d2a1b890bb3df62baf32f7n, 0x31be135f97d08fd981231505542fcfa6n,
  0x9aa508b5b7a84e1c677de54f3e99bc9n, 0x5d6af8dedb81196699c329225ee604n,
  0x2216e584f5fa1ea926041bedfe98n, 0x48a170391f7dc42444e8fa2n,
];
const FEE = 3_000;
const SPACING = 60;
const STATE_VIEW_DEFAULT = "0xf3334192d15450cdd385c8b70e03f9a6bd9e673b";
const PM_DEFAULT = "0x58daec3116aae6d93017baaea7749052e8a04fa7";
const POOL_MANAGER_DEFAULT = "0x8366a39CC670B4001A1121B8F6A443A643e40951";
const PERMIT2_DEFAULT = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

const env = {};
if (existsSync(".env.local")) for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$|^'|'$/g, "");
}
const option = (name) => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; };
const token = option("--token") || env.NEXT_PUBLIC_SCRIT_MAINNET;
const timelock = option("--timelock") || env.NEXT_PUBLIC_SCRIT_TIMELOCK_MAINNET;
const scritAmount = option("--scrit");
const ethAmount = option("--eth");
const privateKey = env.MAINNET_PRIVATE_KEY;
const validAddress = (v) => /^0x[0-9a-fA-F]{40}$/.test(v || "") && !/^0x0{40}$/i.test(v);
const tickLower = -887_220;
const tickUpper = 887_220;
function sqrtRatioAtTick(tick) {
  let absTick = Math.abs(tick);
  if (!Number.isInteger(tick) || absTick > 887272) throw new Error("Tick outside V4 bounds.");
  let ratio = (absTick & 1) !== 0 ? TICK_FACTORS[0] : 1n << 128n;
  for (let bit = 1; bit < TICK_FACTORS.length; bit++) if ((absTick & (1 << bit)) !== 0) ratio = (ratio * TICK_FACTORS[bit]) >> 128n;
  if (tick > 0) ratio = MAX_UINT256 / ratio;
  return (ratio + (1n << 32n) - 1n) >> 32n;
}
const divRoundingUp = (numerator, denominator) => (numerator + denominator - 1n) / denominator;
const sqrtLower = sqrtRatioAtTick(tickLower);
const sqrtUpper = sqrtRatioAtTick(tickUpper);
function sqrtBigInt(value) {
  if (value < 0n) throw new Error("Cannot take square root of a negative integer.");
  if (value < 2n) return value;
  let x = value;
  let y = (x + 1n) >> 1n;
  while (y < x) { x = y; y = (x + value / x) >> 1n; }
  return x;
}
if (!process.argv.includes("--mainnet")) throw new Error("Refusing to run without explicit --mainnet.");
if (!validAddress(token) || !validAddress(timelock)) throw new Error("Pass valid --token and --timelock addresses or configure the deployment outputs.");
if (!/^\d+(?:\.\d{1,18})?$/.test(scritAmount || "") || !/^\d+(?:\.\d{1,18})?$/.test(ethAmount || "")) throw new Error("Pass positive decimal --scrit and --eth amounts.");
if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey || "")) throw new Error("Set MAINNET_PRIVATE_KEY in .env.local; mainnet must not reuse a testnet signing key implicitly.");
const amountScrit = parseEther(scritAmount);
const amountEth = parseEther(ethAmount);
if (amountScrit <= 0n || amountEth <= 0n || amountScrit > (1n << 128n) - 1n || amountEth > (1n << 128n) - 1n) throw new Error("Seed amounts must be positive and fit V4's uint128 amount bounds.");
const manifestPath = option("--manifest");
let manifest = null;
if (manifestPath) {
  if (!existsSync(manifestPath)) throw new Error(`Manifest does not exist: ${manifestPath}`);
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.chainId !== 4663 || manifest.contracts?.SCRIT_INDEX?.address?.toLowerCase() !== token.toLowerCase()) throw new Error("Manifest chain/token does not match this base-pool seed.");
}

const account = privateKeyToAccount(privateKey);
const chain = defineChain({ id: 4663, name: "Robinhood Chain", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [env.ROBINHOOD_MAINNET_RPC_URL || "https://rpc.mainnet.chain.robinhood.com"] } } });
const rpc = chain.rpcUrls.default.http[0];
const client = createPublicClient({ chain, transport: http(rpc) });
const wallet = createWalletClient({ account, chain, transport: http(rpc) });
if (await client.getChainId() !== 4663) throw new Error("RPC is not Robinhood Chain mainnet.");

const positionManager = env.MAINNET_V4_POSITION_MANAGER_ADDRESS || PM_DEFAULT;
const stateView = env.MAINNET_V4_STATE_VIEW_ADDRESS || STATE_VIEW_DEFAULT;
const poolManager = env.MAINNET_V4_POOL_MANAGER_ADDRESS || POOL_MANAGER_DEFAULT;
const permit2 = env.MAINNET_PERMIT2_ADDRESS || PERMIT2_DEFAULT;
for (const [label, address] of [["PoolManager", poolManager], ["PositionManager", positionManager], ["StateView", stateView], ["Permit2", permit2]]) {
  const code = await client.getCode({ address });
  if (!code || code === "0x") throw new Error(`${label} is not deployed at the configured address.`);
}
const managerAbi = parseAbi(["function poolManager() view returns (address)"]);
const [positionManagerPool, stateViewPool] = await Promise.all([
  client.readContract({ address: positionManager, abi: managerAbi, functionName: "poolManager" }),
  client.readContract({ address: stateView, abi: managerAbi, functionName: "poolManager" }),
]);
if (positionManagerPool.toLowerCase() !== poolManager.toLowerCase() || stateViewPool.toLowerCase() !== poolManager.toLowerCase()) {
  throw new Error("Configured V4 PositionManager and StateView must both point at the configured PoolManager.");
}

const poolKey = { currency0: ZERO, currency1: token, fee: FEE, tickSpacing: SPACING, hooks: ZERO };
const tuple = { type: "tuple", components: [
  { name: "currency0", type: "address" }, { name: "currency1", type: "address" },
  { name: "fee", type: "uint24" }, { name: "tickSpacing", type: "int24" }, { name: "hooks", type: "address" },
] };
const poolId = keccak256(encodeAbiParameters([tuple], [[ZERO, token, FEE, SPACING, ZERO]]));
const erc20Abi = parseAbi(["function balanceOf(address) view returns (uint256)", "function allowance(address,address) view returns (uint256)", "function approve(address,uint256) returns (bool)", "function decimals() view returns (uint8)"]);
const tokenBalance = await client.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [account.address] });
if (tokenBalance < amountScrit) throw new Error("Seed signer does not hold the requested sCRIT amount; no pool transaction sent.");
const tokenDecimals = await client.readContract({ address: token, abi: erc20Abi, functionName: "decimals" });
if (tokenDecimals !== 18) throw new Error(`Expected 18-decimal sCRIT for the configured initial ratio; token reports ${tokenDecimals}.`);
const signerNativeBalance = await client.getBalance({ address: account.address });
if (signerNativeBalance <= amountEth) throw new Error("Seed signer needs additional ETH for transaction fees; no pool transaction sent.");
const stateAbi = parseAbi(["function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96,int24 tick,uint24 protocolFee,uint24 lpFee)", "function getLiquidity(bytes32 poolId) view returns (uint128 liquidity)"]);
const pmAbi = parseAbi(["function initializePool((address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) key,uint160 sqrtPriceX96) payable returns (int24)", "function modifyLiquidities(bytes unlockData,uint256 deadline) payable", "function multicall(bytes[] data) payable returns (bytes[] results)"]);
const positionTransferAbi = parseAbi(["event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)"]);
const permit2Abi = parseAbi(["function approve(address token,address spender,uint160 amount,uint48 expiration)"]);
const poolIdParam = poolId;
const ratioX128 = (amountScrit << 128n) / amountEth;
const targetSqrtPriceX96 = sqrtBigInt(ratioX128) << 32n;
if (targetSqrtPriceX96 <= MIN_SQRT_RATIO || targetSqrtPriceX96 >= MAX_SQRT_RATIO || targetSqrtPriceX96 <= sqrtLower || targetSqrtPriceX96 >= sqrtUpper) {
  throw new Error("Requested ETH/sCRIT seed ratio is outside V4 price bounds.");
}
let slot = await client.readContract({ address: stateView, abi: stateAbi, functionName: "getSlot0", args: [poolIdParam] });
const existingLiquidity = await client.readContract({ address: stateView, abi: stateAbi, functionName: "getLiquidity", args: [poolIdParam] });
let sqrtPriceX96 = slot[0];
let initializeRequired = false;
if (sqrtPriceX96 === 0n) {
  if (existingLiquidity !== 0n) throw new Error("Uninitialized pool unexpectedly reports liquidity; no transaction sent.");
  sqrtPriceX96 = targetSqrtPriceX96;
  initializeRequired = true;
} else {
  if (existingLiquidity !== 0n) throw new Error("Canonical pool already has liquidity; refusing to add seed liquidity to an existing market.");
  if (sqrtPriceX96 !== targetSqrtPriceX96) throw new Error("Canonical pool was initialized at a different price; refusing to seed it.");
}

const liquidityForAmount0 = (sqrtA, sqrtB, amount0) => (((sqrtA * sqrtB) / Q96) * amount0) / (sqrtB - sqrtA);
const liquidityForAmount1 = (sqrtA, sqrtB, amount1) => (amount1 * Q96) / (sqrtB - sqrtA);
if (sqrtPriceX96 <= sqrtLower || sqrtPriceX96 >= sqrtUpper) throw new Error("Pool price falls outside the configured full-range ticks.");
const liquidity0 = liquidityForAmount0(sqrtPriceX96, sqrtUpper, amountEth);
const liquidity1 = liquidityForAmount1(sqrtLower, sqrtPriceX96, amountScrit);
const liquidity = liquidity0 < liquidity1 ? liquidity0 : liquidity1;
if (liquidity <= 0n || liquidity > (1n << 128n) - 1n) throw new Error("Seed amounts produce invalid full-range liquidity.");
const amountEthMax = divRoundingUp(divRoundingUp((liquidity * Q96) * (sqrtUpper - sqrtPriceX96), sqrtUpper), sqrtPriceX96);
const amountScritMax = divRoundingUp(liquidity * (sqrtPriceX96 - sqrtLower), Q96);
if (amountEthMax <= 0n || amountEthMax > amountEth || amountEthMax > (1n << 128n) - 1n) throw new Error("Calculated ETH settlement exceeds the requested seed amount.");
if (amountScritMax <= 0n || amountScritMax > amountScrit || amountScritMax > (1n << 128n) - 1n) throw new Error("Calculated sCRIT settlement exceeds the requested seed amount.");
const latestBlock = await client.getBlock();
const expiration = BigInt(latestBlock.timestamp) + 30n * 24n * 60n * 60n;
const existingAllowance = await client.readContract({ address: token, abi: erc20Abi, functionName: "allowance", args: [account.address, permit2] });
if (existingAllowance < amountScrit) {
  const approveTx = await wallet.writeContract({ address: token, abi: erc20Abi, functionName: "approve", args: [permit2, amountScrit] });
  const approveReceipt = await client.waitForTransactionReceipt({ hash: approveTx });
  if (approveReceipt.status !== "success") throw new Error(`ERC-20 Permit2 approval failed: ${approveTx}`);
}
const permitTx = await wallet.writeContract({ address: permit2, abi: permit2Abi, functionName: "approve", args: [token, positionManager, amountScrit, expiration] });
const permitReceipt = await client.waitForTransactionReceipt({ hash: permitTx });
if (permitReceipt.status !== "success") throw new Error(`Permit2 position-manager approval failed: ${permitTx}`);

const actions = "0x020d";
const params = [
  // 8 separate top-level params (no outer tuple): byte-identical to the
  // launcher's abi.encode(key,tickLower,...,hookData). Wrapping in one outer
  // tuple adds a stray offset word and reverts with SliceOutOfBounds.
  encodeAbiParameters(parseAbiParameters("(address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks),int24 tickLower,int24 tickUpper,uint256 liquidity,uint128 amount0Max,uint128 amount1Max,address owner,bytes hookData"), [poolKey, tickLower, tickUpper, liquidity, amountEthMax, amountScritMax, timelock, "0x"]),
  encodeAbiParameters(parseAbiParameters("address currency0,address currency1"), [ZERO, token]),
];
const unlockData = encodeAbiParameters(parseAbiParameters("bytes actions,bytes[] params"), [actions, params]);
const deadline = BigInt(latestBlock.timestamp) + 30n * 60n;
const modifyData = encodeFunctionData({ abi: pmAbi, functionName: "modifyLiquidities", args: [unlockData, deadline] });
const calls = initializeRequired
  ? [encodeFunctionData({ abi: pmAbi, functionName: "initializePool", args: [poolKey, sqrtPriceX96] }), modifyData]
  : [modifyData];
const addTx = await wallet.writeContract({ address: positionManager, abi: pmAbi, functionName: "multicall", args: [calls], value: amountEthMax });
const addReceipt = await client.waitForTransactionReceipt({ hash: addTx });
if (addReceipt.status !== "success") throw new Error(`Canonical base-pool liquidity transaction failed: ${addTx}`);
const mintedPosition = parseEventLogs({ abi: positionTransferAbi, logs: addReceipt.logs, eventName: "Transfer", strict: false })
  .find((log) => log.address.toLowerCase() === positionManager.toLowerCase() && log.args.from?.toLowerCase() === ZERO && log.args.to?.toLowerCase() === timelock.toLowerCase());
if (!mintedPosition?.args.tokenId) throw new Error(`Pool liquidity succeeded, but the timelock position NFT was not found in the transaction logs: ${addTx}`);
const positionId = mintedPosition.args.tokenId;

if (manifestPath) {
  manifest.baseMarket = { poolKey, poolId, stateView, seeded: true, positionId: positionId.toString(), initializedTx: initializeRequired ? addTx : null, liquidityTx: addTx, fee: "0.30% LP · no hook tax", seedProvider: account.address, positionOwner: timelock };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(`Canonical hookless sCRIT/ETH PoolId: ${poolId}`);
if (initializeRequired) console.log(`Pool initialized atomically with liquidity: ${addTx}`);
console.log(`Liquidity position ${positionId} added to timelock ${timelock}: ${addTx}`);
console.log(`Calculated settlement: ${formatEther(amountEthMax)} ETH + ${formatEther(amountScritMax)} sCRIT`);
console.log(`Uncommitted seed remainder: ${formatEther(amountEth - amountEthMax)} ETH + ${formatEther(amountScrit - amountScritMax)} sCRIT`);
console.log(`Set NEXT_PUBLIC_SCRIT_BASE_POOL_ID_MAINNET=${poolId} and rebuild the app after checking the manifest.`);
