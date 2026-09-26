// Local operator tool. Signs an operator-sourced quote; it does not fetch or validate market data.
import { existsSync, readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, defineChain, http, parseAbi, parseEther, parseUnits, keccak256, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const env = {};
for (const line of (existsSync(".env.local") ? readFileSync(".env.local", "utf8").split("\n") : [])) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (match) env[match[1]] = match[2].replace(/^"|"$|^'|'$/g, "");
}
const mode = process.argv.includes("--mainnet") ? "mainnet" : "testnet";
const args = process.argv.slice(2).filter((arg) => arg !== "--mainnet" && arg !== "--testnet");
const [symbol, priceText, source] = args;
const commodity = { Au: 0, Ag: 1, Pt: 2, Pd: 3, Nd: 4, Dy: 5, Tb: 6, Sc: 7, Li: 8 }[symbol];
if (commodity === undefined || !/^\d+(?:\.\d{1,8})?$/.test(priceText ?? "") || Number(priceText) <= 0 || !source?.trim()) {
  throw new Error("Usage: node scripts/publish-price.mjs [--testnet|--mainnet] Au|Ag|Pt|Pd|Nd|Dy|Tb|Sc|Li USD_PER_KG SOURCE_LABEL");
}
const suffix = mode === "mainnet" ? "MAINNET" : "TESTNET";
const chainId = mode === "mainnet" ? 4663 : 46630;
const privateKey = mode === "mainnet" ? env.MAINNET_PRICE_ADAPTER_PRIVATE_KEY : env.PRICE_ADAPTER_PRIVATE_KEY;
const adapter = env[`NEXT_PUBLIC_SCRIT_PRICE_ADAPTER_${suffix}`] || (mode === "testnet" ? env.NEXT_PUBLIC_SCRIT_PRICE_ADAPTER : undefined);
if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey ?? "") || !/^0x[0-9a-fA-F]{40}$/.test(adapter ?? "") || /^0x0{40}$/i.test(adapter ?? "")) throw new Error(`Configure the ${mode} price signer key and contract address locally.`);
const rpc = mode === "mainnet" ? env.ROBINHOOD_MAINNET_RPC_URL || "https://rpc.mainnet.chain.robinhood.com" : env.SCRIT_INDEXER_RPC_URL || "https://rpc.testnet.chain.robinhood.com";
const chain = defineChain({ id: chainId, name: mode === "mainnet" ? "Robinhood Chain" : "Robinhood Testnet", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [rpc] } } });
const account = privateKeyToAccount(privateKey);
const publicClient = createPublicClient({ chain, transport: http(rpc) });
const wallet = createWalletClient({ account, chain, transport: http(rpc) });
if (await publicClient.getChainId() !== chain.id) throw new Error(`Wrong network; expected ${chain.name}.`);
const abi = parseAbi(["function latestPrice(uint8) view returns ((uint192 usdPerKgE8,bytes32 sourceHash,uint64 updatedAt,uint64 nonce))", "function publishPrice(uint8,uint192,bytes32,uint64,uint64,bytes)", "event PriceUpdated(uint8 indexed commodity,uint256 usdPerKgE8,bytes32 indexed sourceHash,uint64 updatedAt,uint64 nonce,address signer)"]);
const previous = await publicClient.readContract({ address: adapter, abi, functionName: "latestPrice", args: [commodity] });
const nonce = previous.nonce + 1n;
const updatedAt = BigInt(Math.floor(Date.now() / 1000));
const usdPerKgE8 = parseUnits(priceText, 8);
if (usdPerKgE8 > (1n << 192n) - 1n) throw new Error("Price exceeds the contract limit.");
const sourceHash = keccak256(toBytes(source.trim()));
const signature = await wallet.signTypedData({
  domain: { name: "sCRIT Price", version: "1", chainId: chain.id, verifyingContract: adapter },
  types: { CommodityPrice: [
    { name: "commodity", type: "uint8" }, { name: "usdPerKgE8", type: "uint256" },
    { name: "sourceHash", type: "bytes32" }, { name: "updatedAt", type: "uint64" }, { name: "nonce", type: "uint256" },
  ] }, primaryType: "CommodityPrice", message: { commodity, usdPerKgE8, sourceHash, updatedAt, nonce },
});
const tx = await wallet.writeContract({ address: adapter, abi, functionName: "publishPrice", args: [commodity, usdPerKgE8, sourceHash, updatedAt, nonce, signature] });
const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
if (receipt.status !== "success") throw new Error(`Price update reverted: ${tx}`);
console.log(`${symbol} signed operator quote recorded on ${chain.name}: ${priceText} USD/kg; source hash ${sourceHash}; tx ${tx}`);
console.log("This does not certify that the label is an independent source or that the quote is fair market value.");
