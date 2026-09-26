// Local custodian tool for a signed Rail B record; signatures are statements, not independent proof.
import { existsSync, readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, defineChain, http, keccak256, parseAbi, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const env = {};
for (const line of (existsSync(".env.local") ? readFileSync(".env.local", "utf8").split("\n") : [])) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (match) env[match[1]] = match[2].replace(/^"|"$|^'|'$/g, "");
}
const mode = process.argv.includes("--mainnet") ? "mainnet" : "testnet";
const suffix = mode === "mainnet" ? "MAINNET" : "TESTNET";
const args = process.argv.slice(2).filter((arg) => arg !== "--mainnet" && arg !== "--testnet");
const [lotLabel, symbol, certificateHash, grade, vault, provenance, nonceText, recipient] = args;
const commodity = { Au: 0, Ag: 1, Pt: 2, Pd: 3, Nd: 4, Dy: 5, Tb: 6, Sc: 7, Li: 8, Diamond: 9 }[symbol];
if (!/^[A-Za-z0-9._:-]{1,100}$/.test(lotLabel ?? "") || commodity === undefined || !/^0x[0-9a-fA-F]{64}$/.test(certificateHash ?? "") ||
    !grade?.trim() || !vault?.trim() || !provenance?.trim() || !/^\d+$/.test(nonceText ?? "") || !/^0x[0-9a-fA-F]{40}$/.test(recipient ?? "")) {
  throw new Error("Usage: node scripts/attest-physical-lot.mjs [--testnet|--mainnet] LOT_ID Au|Ag|Pt|Pd|Nd|Dy|Tb|Sc|Li|Diamond CERT_HASH GRADE VAULT PROVENANCE NONCE RECIPIENT");
}
const chainId = mode === "mainnet" ? 4663 : 46630;
const privateKey = mode === "mainnet" ? env.MAINNET_PHYSICAL_LOT_CUSTODIAN_PRIVATE_KEY : env.PHYSICAL_LOT_CUSTODIAN_PRIVATE_KEY;
const manager = env[`NEXT_PUBLIC_SCRIT_LOT_MANAGER_${suffix}`] || (mode === "testnet" ? env.NEXT_PUBLIC_SCRIT_LOT_MANAGER : undefined);
if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey ?? "") || !/^0x[0-9a-fA-F]{40}$/.test(manager ?? "") || /^0x0{40}$/i.test(manager ?? "")) {
  throw new Error(`Configure the ${mode} physical-lot custodian key and manager address locally.`);
}
const rpc = mode === "mainnet" ? env.ROBINHOOD_MAINNET_RPC_URL || "https://rpc.mainnet.chain.robinhood.com" : env.SCRIT_INDEXER_RPC_URL || "https://rpc.testnet.chain.robinhood.com";
const chain = defineChain({ id: chainId, name: mode === "mainnet" ? "Robinhood Chain" : "Robinhood Testnet", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [rpc] } } });
const account = privateKeyToAccount(privateKey);
const publicClient = createPublicClient({ chain, transport: http(rpc) });
const wallet = createWalletClient({ account, chain, transport: http(rpc) });
if (await publicClient.getChainId() !== chainId) throw new Error(`Wrong network; expected ${chain.name}.`);
const managerAbi = parseAbi([
  "function custodians() view returns (address)",
  "function usedLotId(bytes32) view returns (bool)",
  "function createLot((bytes32 lotId,uint8 commodity,bytes32 certificateHash,bytes32 gradeSpecHash,bytes32 vaultIdHash,bytes32 provenanceHash,uint64 timestamp,uint256 nonce,address recipient),bytes signature) returns (uint256)",
  "event LotAttested(bytes32 indexed lotId,uint256 indexed tokenId,uint8 commodity,bytes32 certificateHash,address indexed custodian)",
]);
const registry = await publicClient.readContract({ address: manager, abi: managerAbi, functionName: "custodians" });
const registryAbi = parseAbi(["function isAuthorized(address,uint8) view returns (bool)"]);
if (!await publicClient.readContract({ address: registry, abi: registryAbi, functionName: "isAuthorized", args: [account.address, commodity] })) {
  throw new Error("This key is not registered for the requested commodity scope.");
}
const lotId = keccak256(toBytes(lotLabel));
if (await publicClient.readContract({ address: manager, abi: managerAbi, functionName: "usedLotId", args: [lotId] })) throw new Error("Lot ID already exists.");
const block = await publicClient.getBlock();
const attestation = {
  lotId,
  commodity,
  certificateHash,
  gradeSpecHash: keccak256(toBytes(grade.trim())),
  vaultIdHash: keccak256(toBytes(vault.trim())),
  provenanceHash: keccak256(toBytes(provenance.trim())),
  timestamp: block.timestamp,
  nonce: BigInt(nonceText),
  recipient,
};
const signature = await wallet.signTypedData({
  domain: { name: "sCRIT Physical Lots", version: "1", chainId, verifyingContract: manager },
  types: { LotAttestation: [
    { name: "lotId", type: "bytes32" }, { name: "commodity", type: "uint8" }, { name: "certificateHash", type: "bytes32" },
    { name: "gradeSpecHash", type: "bytes32" }, { name: "vaultIdHash", type: "bytes32" }, { name: "provenanceHash", type: "bytes32" },
    { name: "timestamp", type: "uint64" }, { name: "nonce", type: "uint256" }, { name: "recipient", type: "address" },
  ] },
  primaryType: "LotAttestation",
  message: attestation,
});
const hash = await wallet.writeContract({ address: manager, abi: managerAbi, functionName: "createLot", args: [attestation, signature] });
const receipt = await publicClient.waitForTransactionReceipt({ hash });
if (receipt.status !== "success") throw new Error(`Lot attestation reverted: ${hash}`);
console.log(`Lot attestation accepted on ${chain.name}: ${lotLabel} · ${symbol} · tx ${hash}`);
console.log("The signer attests to these references; this record alone does not authenticate an item or prove custody.");
