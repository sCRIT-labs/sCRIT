// Read-only verification of Uniswap V4 dependencies used by the mainnet launcher.
import { existsSync, readFileSync } from "node:fs";
import { createPublicClient, defineChain, http, parseAbi } from "viem";

const env = {};
for (const line of (existsSync(".env.local") ? readFileSync(".env.local", "utf8").split("\n") : [])) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (match) env[match[1]] = match[2].replace(/^"|"$|^'|'$/g, "");
}
const chain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [env.ROBINHOOD_MAINNET_RPC_URL || "https://rpc.mainnet.chain.robinhood.com"] } },
});
const client = createPublicClient({ chain, transport: http(chain.rpcUrls.default.http[0]) });
if (await client.getChainId() !== chain.id) throw new Error("RPC chain ID mismatch.");
const addresses = {
  poolManager: env.MAINNET_V4_POOL_MANAGER_ADDRESS || "0x8366a39CC670B4001A1121B8F6A443A643e40951",
  positionManager: env.MAINNET_V4_POSITION_MANAGER_ADDRESS || "0x58daec3116aae6d93017baaea7749052e8a04fa7",
  stateView: env.MAINNET_V4_STATE_VIEW_ADDRESS || "0xf3334192d15450cdd385c8b70e03f9a6bd9e673b",
  permit2: env.MAINNET_PERMIT2_ADDRESS || "0x000000000022D473030F116dDEE9F6B43aC78BA3",
};
for (const [name, address] of Object.entries(addresses)) {
  const code = await client.getCode({ address });
  if (!code || code === "0x") throw new Error(`${name} has no code on Robinhood mainnet: ${address}`);
  console.log(`${name}: ${address} · code ${code.length / 2 - 1} bytes`);
}
const boundPoolManager = await client.readContract({
  address: addresses.positionManager,
  abi: parseAbi(["function poolManager() view returns (address)"]),
  functionName: "poolManager",
});
if (boundPoolManager.toLowerCase() !== addresses.poolManager.toLowerCase()) throw new Error("V4 PositionManager points at a different PoolManager.");
console.log(`PositionManager.poolManager(): ${boundPoolManager}`);
const transientLoad = await client.readContract({
  address: addresses.poolManager,
  abi: parseAbi(["function exttload(bytes32 slot) view returns (bytes32 value)"]),
  functionName: "exttload",
  args: [`0x${"00".repeat(32)}`],
});
console.log(`PoolManager exttload(bytes32(0)): ${transientLoad} · EIP-1153 TLOAD executed`);
console.log("Uniswap V3/V4 dependency and EIP-1153 TLOAD checks passed. Read-only; no transactions sent.");
