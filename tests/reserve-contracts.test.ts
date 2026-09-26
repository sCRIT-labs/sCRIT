import { afterAll, beforeAll, describe, expect, it } from "vitest";
import ganache from "ganache";
import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  getContractAddress,
  keccak256,
  toBytes,
  zeroHash,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  SCRIT_CUSTODIANS_ABI, SCRIT_CUSTODIANS_BYTECODE,
  SCRIT_INDEX_ABI, SCRIT_INDEX_BYTECODE,
  SCRIT_PRICES_ABI, SCRIT_PRICES_BYTECODE,
  SCRIT_RESERVE_ABI, SCRIT_RESERVE_BYTECODE,
} from "../lib/scrit-artifact";

const chain = defineChain({ id: 46630, name: "sCRIT Local Testnet", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: ["http://127.0.0.1"] } } });
const keys = [1, 2, 3, 4, 5].map((n) => `0x${n.toString(16).padStart(64, "0")}` as `0x${string}`);
const [deployer, admin, guardian, custodian, priceSigner] = keys.map((key) => privateKeyToAccount(key));
const amount = (n: bigint) => n * 10n ** 18n;
const hash = (text: string) => keccak256(toBytes(text));

describe("reserve contracts", () => {
  const provider = ganache.provider({
    logging: { quiet: true }, chain: { chainId: 46630 },
    wallet: { accounts: keys.map((secretKey) => ({ secretKey, balance: "0x3635C9ADC5DEA00000" })) },
  });
  const publicClient = createPublicClient({ chain, transport: custom(provider as never) });
  const deployerClient = createWalletClient({ account: deployer, chain, transport: custom(provider as never) });
  const adminClient = createWalletClient({ account: admin, chain, transport: custom(provider as never) });
  let registry: Address;
  let priceAdapter: Address;
  let reserveManager: Address;
  let token: Address;

  beforeAll(async () => {
    const registryHash = await deployerClient.deployContract({ abi: SCRIT_CUSTODIANS_ABI, bytecode: SCRIT_CUSTODIANS_BYTECODE, args: [admin.address] });
    registry = (await publicClient.waitForTransactionReceipt({ hash: registryHash })).contractAddress!;
    const pricesHash = await deployerClient.deployContract({ abi: SCRIT_PRICES_ABI, bytecode: SCRIT_PRICES_BYTECODE, args: [admin.address, priceSigner.address] });
    priceAdapter = (await publicClient.waitForTransactionReceipt({ hash: pricesHash })).contractAddress!;

    const nonce = await publicClient.getTransactionCount({ address: deployer.address });
    token = getContractAddress({ from: deployer.address, nonce: BigInt(nonce + 1) });
    const managerHash = await deployerClient.deployContract({
      abi: SCRIT_RESERVE_ABI, bytecode: SCRIT_RESERVE_BYTECODE,
      args: [admin.address, guardian.address, admin.address, token, registry, priceAdapter, amount(1_000_000n)],
    });
    reserveManager = (await publicClient.waitForTransactionReceipt({ hash: managerHash })).contractAddress!;
    const tokenHash = await deployerClient.deployContract({ abi: SCRIT_INDEX_ABI, bytecode: SCRIT_INDEX_BYTECODE, args: [admin.address, reserveManager, guardian.address] });
    expect((await publicClient.waitForTransactionReceipt({ hash: tokenHash })).contractAddress?.toLowerCase()).toBe(token.toLowerCase());
  }, 30_000);

  afterAll(async () => { await provider.disconnect(); });

  async function signPrice(nonce: bigint, updatedAt: bigint) {
    return priceSigner.signTypedData({
      domain: { name: "sCRIT Price", version: "1", chainId: chain.id, verifyingContract: priceAdapter },
      types: { CommodityPrice: [
        { name: "commodity", type: "uint8" }, { name: "usdPerKgE8", type: "uint256" },
        { name: "sourceHash", type: "bytes32" }, { name: "updatedAt", type: "uint64" }, { name: "nonce", type: "uint256" },
      ] }, primaryType: "CommodityPrice", message: { commodity: 0, usdPerKgE8: 100_000_000_000n, sourceHash: hash("testnet-source"), updatedAt, nonce },
    });
  }

  async function signAttestation(batch: string, commodity = 0, timestamp?: bigint, nonce = BigInt(batch.length)) {
    const signedAt = timestamp ?? ((await publicClient.getBlock()).timestamp + 60n);
    return custodian.signTypedData({
      domain: { name: "sCRIT Reserve", version: "2", chainId: chain.id, verifyingContract: reserveManager },
      types: { ReserveAttestation: [
        { name: "batchId", type: "bytes32" }, { name: "commodity", type: "uint8" }, { name: "massKgE12", type: "uint256" },
        { name: "gradeSpecHash", type: "bytes32" }, { name: "certificateHash", type: "bytes32" },
        { name: "vaultIdHash", type: "bytes32" }, { name: "timestamp", type: "uint64" }, { name: "nonce", type: "uint256" },
      ] }, primaryType: "ReserveAttestation", message: {
        batchId: hash(batch), commodity, massKgE12: 10n ** 12n, gradeSpecHash: hash("grade"),
        certificateHash: hash("certificate"), vaultIdHash: hash("vault"), timestamp: signedAt, nonce,
      },
    });
  }

  async function publishPrice(nonce: bigint) {
    const block = await publicClient.getBlock();
    const signature = await signPrice(nonce, block.timestamp);
    const tx = await adminClient.writeContract({
      address: priceAdapter, abi: SCRIT_PRICES_ABI, functionName: "publishPrice",
      args: [0, 100_000_000_000n, hash("testnet-source"), block.timestamp, nonce, signature],
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });
  }

  it("mints at current NAV only after a valid, scoped, fresh attestation and rejects replay or wrong scope", async () => {
    const setCustodian = await adminClient.writeContract({ address: registry, abi: SCRIT_CUSTODIANS_ABI, functionName: "setCustodian", args: [custodian.address, 1, zeroHash] });
    await publicClient.waitForTransactionReceipt({ hash: setCustodian });
    await publishPrice(1n);

    const signedAt = (await publicClient.getBlock()).timestamp + 60n;
    const goodAttestation = { batchId: hash("batch-one"), commodity: 0, massKgE12: 10n ** 12n, gradeSpecHash: hash("grade"), certificateHash: hash("certificate"), vaultIdHash: hash("vault"), timestamp: signedAt, nonce: 4n } as const;
    const signature = await signAttestation("batch-one", 0, signedAt, 4n);
    const tx = await deployerClient.writeContract({ address: reserveManager, abi: SCRIT_RESERVE_ABI, functionName: "recordPurchase", args: [goodAttestation, signature] });
    await publicClient.waitForTransactionReceipt({ hash: tx });
    expect(await publicClient.readContract({ address: token, abi: SCRIT_INDEX_ABI, functionName: "totalSupply" })).toBe(amount(1_000n));
    expect(await publicClient.readContract({ address: reserveManager, abi: SCRIT_RESERVE_ABI, functionName: "holdingsKgE12", args: [0] })).toBe(10n ** 12n);

    await expect(deployerClient.writeContract({ address: reserveManager, abi: SCRIT_RESERVE_ABI, functionName: "recordPurchase", args: [goodAttestation, signature] })).rejects.toThrow();
    const wrongScope = { ...goodAttestation, batchId: hash("wrong-scope"), commodity: 1, nonce: 5n } as const;
    await expect(deployerClient.writeContract({ address: reserveManager, abi: SCRIT_RESERVE_ABI, functionName: "recordPurchase", args: [wrongScope, await signAttestation("wrong-scope", 1, signedAt, 5n)] })).rejects.toThrow();
  }, 30_000);

  it("refuses minting when the signed price has gone stale", async () => {
    await provider.request({ method: "evm_increaseTime", params: [86_401] });
    await provider.request({ method: "evm_mine", params: [] });
    const signedAt = (await publicClient.getBlock()).timestamp + 60n;
    const batch = { batchId: hash("stale-price"), commodity: 0, massKgE12: 10n ** 12n, gradeSpecHash: hash("grade"), certificateHash: hash("certificate"), vaultIdHash: hash("vault"), timestamp: signedAt, nonce: 6n } as const;
    await expect(deployerClient.writeContract({ address: reserveManager, abi: SCRIT_RESERVE_ABI, functionName: "recordPurchase", args: [batch, await signAttestation("stale-price", 0, signedAt, 6n)] })).rejects.toThrow();
    expect(await publicClient.readContract({ address: token, abi: SCRIT_INDEX_ABI, functionName: "totalSupply" })).toBe(amount(1_000n));
  }, 30_000);
});
