// Local custodian tool. Only run when the signer is authorized for the commodity on the configured testnet manager.
import { existsSync, readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, defineChain, http, keccak256, parseAbi, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const env = {};
for (const line of (existsSync(".env.local") ? readFileSync(".env.local", "utf8").split("\n") : [])) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (match) env[match[1]] = match[2].replace(/^"|"$|^'|'$/g, "");
}
const mode = process.argv.includes("--mainnet") ? "mainnet" : "testnet";
const args = process.argv.slice(2).filter((arg) => arg !== "--mainnet" && arg !== "--testnet");
const [batch, symbol, mass, grade, certificateHash, vault, nonceText] = args;
const commodity = { Au: 0, Ag: 1, Pt: 2, Pd: 3, Nd: 4, Dy: 5, Tb: 6, Sc: 7, Li: 8 }[symbol];
if (!/^[A-Za-z0-9._:-]{1,100}$/.test(batch ?? "") || commodity === undefined || !/^\d+(?:\.\d{1,12})?$/.test(mass ?? "") || Number(mass) <= 0 || !grade || !vault || !/^0x[0-9a-fA-F]{64}$/.test(certificateHash ?? "") || !/^\d+$/.test(nonceText ?? "")) {
  throw new Error("Usage: node scripts/attest-reserve-batch.mjs [--testnet|--mainnet] BATCH_ID Au|Ag|Pt|Pd|Nd|Dy|Tb|Sc|Li MASS_KG GRADE CERTIFICATE_HASH VAULT_ID NONCE");
}
const suffix = mode === "mainnet" ? "MAINNET" : "TESTNET";
const chainId = mode === "mainnet" ? 4663 : 46630;
const privateKey = mode === "mainnet" ? env.MAINNET_RESERVE_CUSTODIAN_PRIVATE_KEY : env.RESERVE_CUSTODIAN_PRIVATE_KEY;
const manager = env[`NEXT_PUBLIC_SCRIT_RESERVE_MANAGER_${suffix}`] || (mode === "testnet" ? env.NEXT_PUBLIC_SCRIT_RESERVE_MANAGER : undefined);
if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey ?? "") || !/^0x[0-9a-fA-F]{40}$/.test(manager ?? "") || /^0x0{40}$/i.test(manager ?? "")) throw new Error(`Configure the ${mode} custodian key and reserve manager address locally.`);
const rpc = mode === "mainnet" ? env.ROBINHOOD_MAINNET_RPC_URL || "https://rpc.mainnet.chain.robinhood.com" : env.SCRIT_INDEXER_RPC_URL || "https://rpc.testnet.chain.robinhood.com";
const chain = defineChain({ id: chainId, name: mode === "mainnet" ? "Robinhood Chain" : "Robinhood Testnet", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [rpc] } } });
const account = privateKeyToAccount(privateKey);
const publicClient = createPublicClient({ chain, transport: http(rpc) });
const wallet = createWalletClient({ account, chain, transport: http(rpc) });
if (await publicClient.getChainId() !== chain.id) throw new Error(`Wrong network; expected ${chain.name}.`);
const abi = parseAbi([
  "function custodians() view returns (address)",
  "function recordPurchase((bytes32 batchId,uint8 commodity,uint128 massKgE12,bytes32 gradeSpecHash,bytes32 certificateHash,bytes32 vaultIdHash,uint64 timestamp,uint256 nonce),bytes signature)",
  "function usedBatch(bytes32) view returns (bool)",
  "event PhysicalPurchaseAttested(bytes32 indexed batchId,uint8 indexed commodity,uint256 massKgE12,bytes32 certificateHash,address indexed custodian)",
  "event ReserveMinted(bytes32 indexed batchId,uint256 reserveValueUsdE8,uint256 amount,uint256 newSupply)",
]);
const registry = await publicClient.readContract({ address: manager, abi, functionName: "custodians" });
const registryAbi = parseAbi(["function isAuthorized(address,uint8) view returns (bool)"]);
if (!await publicClient.readContract({ address: registry, abi: registryAbi, functionName: "isAuthorized", args: [account.address, commodity] })) throw new Error("This key is not registered for the requested commodity scope.");
const batchId = keccak256(toBytes(batch));
if (await publicClient.readContract({ address: manager, abi, functionName: "usedBatch", args: [batchId] })) throw new Error("Batch ID already used.");
const [wholeMass, fractionalMass = ""] = mass.split(".");
const massKgE12 = BigInt(wholeMass) * 10n ** 12n + BigInt((fractionalMass + "0".repeat(12)).slice(0, 12));
if (massKgE12 <= 0n || massKgE12 >= 1n << 128n) throw new Error("Mass must fit uint128 at 12 decimals.");
const block = await publicClient.getBlock();
const timestamp = block.timestamp;
const nonce = BigInt(nonceText);
const attestation = { batchId, commodity, massKgE12, gradeSpecHash: keccak256(toBytes(grade)), certificateHash, vaultIdHash: keccak256(toBytes(vault)), timestamp, nonce };
const signature = await wallet.signTypedData({
  domain: { name: "sCRIT Reserve", version: "2", chainId: chain.id, verifyingContract: manager },
  types: { ReserveAttestation: [
    { name: "batchId", type: "bytes32" }, { name: "commodity", type: "uint8" }, { name: "massKgE12", type: "uint256" },
    { name: "gradeSpecHash", type: "bytes32" }, { name: "certificateHash", type: "bytes32" },
    { name: "vaultIdHash", type: "bytes32" }, { name: "timestamp", type: "uint64" }, { name: "nonce", type: "uint256" },
  ] }, primaryType: "ReserveAttestation", message: attestation,
});
const hash = await wallet.writeContract({ address: manager, abi, functionName: "recordPurchase", args: [attestation, signature] });
const receipt = await publicClient.waitForTransactionReceipt({ hash });
if (receipt.status !== "success") throw new Error(`Reserve transaction reverted: ${hash}`);
console.log(`Attestation accepted on ${chain.name}: ${batch} · ${symbol} · ${mass} kg · tx ${hash}`);
console.log("This signature records the signer's statement; it is not an independent physical audit.");
