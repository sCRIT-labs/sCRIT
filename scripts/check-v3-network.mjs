import { createPublicClient, defineChain, http, parseAbi } from "viem";

const network = process.argv[2];
const settings = {
  mainnet: {
    name: "Robinhood Chain",
    id: 4663,
    rpc: "https://rpc.mainnet.chain.robinhood.com",
    positionManager: "0x73991a25C818Bf1f1128dEAaB1492D45638DE0D3",
  },
  testnet: {
    name: "Robinhood Testnet",
    id: 46630,
    rpc: "https://rpc.testnet.chain.robinhood.com",
    positionManager: "0x15e98cf94a32c7fd23a36fabb4fee612277da47b",
  },
};
const config = settings[network];
if (!config) throw new Error("Usage: node scripts/check-v3-network.mjs mainnet|testnet");

const client = createPublicClient({
  chain: defineChain({
    id: config.id,
    name: config.name,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [config.rpc] } },
  }),
  transport: http(config.rpc),
});
const managerAbi = parseAbi(["function factory() view returns (address)", "function WETH9() view returns (address)"]);
const factoryAbi = parseAbi(["function feeAmountTickSpacing(uint24) view returns (int24)"]);
const chainId = await client.getChainId();
if (chainId !== config.id) throw new Error(`Wrong chain: expected ${config.id}, got ${chainId}`);
const [managerCode, factory, weth9] = await Promise.all([
  client.getCode({ address: config.positionManager }),
  client.readContract({ address: config.positionManager, abi: managerAbi, functionName: "factory" }),
  client.readContract({ address: config.positionManager, abi: managerAbi, functionName: "WETH9" }),
]);
if (!managerCode || managerCode === "0x") throw new Error("Position manager has no bytecode.");
const [factoryCode, wethCode, fee3000TickSpacing] = await Promise.all([
  client.getCode({ address: factory }),
  client.getCode({ address: weth9 }),
  client.readContract({ address: factory, abi: factoryAbi, functionName: "feeAmountTickSpacing", args: [3000] }),
]);
if (!factoryCode || factoryCode === "0x" || !wethCode || wethCode === "0x") throw new Error("V3 dependency has no bytecode.");
if (fee3000TickSpacing <= 0) throw new Error("Factory does not support fee tier 3000.");
console.log(JSON.stringify({
  network: config.name,
  chainId,
  positionManager: config.positionManager,
  positionManagerCodeBytes: (managerCode.length - 2) / 2,
  factory,
  factoryCodeBytes: (factoryCode.length - 2) / 2,
  weth9,
  wethCodeBytes: (wethCode.length - 2) / 2,
  fee3000TickSpacing,
}, null, 2));
