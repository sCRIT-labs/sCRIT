import { describe, expect, it, afterAll, beforeAll } from "vitest";
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
  parseEventLogs,
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
const keys = [11, 12, 13, 14, 15].map((n) => `0x${n.toString(16).padStart(64, "0")}` as `0x${string}`);
const [deployer, admin, guardian, custodian, priceSigner] = keys.map((key) => privateKeyToAccount(key));
const amount = (n: bigint) => n * 10n ** 18n;
const hash = (text: string) => keccak256(toBytes(text));

// RED: NAVSnapshot nav value must equal reserveE8 * 1e18 / supply (NAV in E8).
// Buggy code uses USD_SCALE (1e8) instead of 1e18 → off by 1e10.
describe("NAVSnapshot math bug repro", () => {
  const provider = ganache.provider({
    logging: { quiet: true }, chain: { chainId: 46630 },
    wallet: { accounts: keys.map((secretKey) => ({ secretKey, balance: "0x3635C9ADC5DEA00000" })) },
  });
  const publicClient = createPublicClient({ chain, transport: custom(provider as never) });
  const deployerClient = createWalletClient({ account: deployer, chain, transport: custom(provider as never) });
  const adminClient = createWalletClient({ account: admin, chain, transport: custom(provider as never) });
  let registry: Address; let priceAdapter: Address; let reserveManager: Address; let token: Address;

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
    await publicClient.waitForTransactionReceipt({ hash: tokenHash });
  }, 30_000);

  afterAll(async () => { await provider.disconnect(); });

  it("emits correct NAV E8 = reserveE8 * 1e18 / supply", async () => {
    const setC = await adminClient.writeContract({ address: registry, abi: SCRIT_CUSTODIANS_ABI, functionName: "setCustodian", args: [custodian.address, 1, zeroHash] });
    await publicClient.waitForTransactionReceipt({ hash: setC });
    const block = await publicClient.getBlock();
    const priceSig = await priceSigner.signTypedData({
      domain: { name: "sCRIT Price", version: "1", chainId: chain.id, verifyingContract: priceAdapter },
      types: { CommodityPrice: [
        { name: "commodity", type: "uint8" }, { name: "usdPerKgE8", type: "uint256" },
        { name: "sourceHash", type: "bytes32" }, { name: "updatedAt", type: "uint64" }, { name: "nonce", type: "uint256" },
      ] }, primaryType: "CommodityPrice",
      message: { commodity: 0, usdPerKgE8: 100_000_000_000n, sourceHash: hash("src"), updatedAt: block.timestamp, nonce: 1n },
    });
    const ptx = await adminClient.writeContract({ address: priceAdapter, abi: SCRIT_PRICES_ABI, functionName: "publishPrice", args: [0, 100_000_000_000n, hash("src"), block.timestamp, 1n, priceSig] });
    await publicClient.waitForTransactionReceipt({ hash: ptx });

    // 1 kg Au @ $1000/kg → addedValue $1000 E8 = 1000*1e8. Bootstrap mints 1000 tokens.
    const signedAt = (await publicClient.getBlock()).timestamp + 60n;
    const att = { batchId: hash("nav-check"), commodity: 0, massKgE12: 10n ** 12n, gradeSpecHash: hash("g"), certificateHash: hash("c"), vaultIdHash: hash("v"), timestamp: signedAt, nonce: 99n } as const;
    const sig = await custodian.signTypedData({
      domain: { name: "sCRIT Reserve", version: "2", chainId: chain.id, verifyingContract: reserveManager },
      types: { ReserveAttestation: [
        { name: "batchId", type: "bytes32" }, { name: "commodity", type: "uint8" }, { name: "massKgE12", type: "uint256" },
        { name: "gradeSpecHash", type: "bytes32" }, { name: "certificateHash", type: "bytes32" },
        { name: "vaultIdHash", type: "bytes32" }, { name: "timestamp", type: "uint64" }, { name: "nonce", type: "uint256" },
      ] }, primaryType: "ReserveAttestation", message: { ...att },
    });
    const tx = await deployerClient.writeContract({ address: reserveManager, abi: SCRIT_RESERVE_ABI, functionName: "recordPurchase", args: [att, sig] });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
    const logs = parseEventLogs({ abi: SCRIT_RESERVE_ABI, logs: receipt.logs, eventName: "NAVSnapshot", strict: false });
    expect(logs.length).toBeGreaterThan(0);
    const navE8 = (logs[0] as unknown as { args: { navUsdPerTokenE8: bigint; reserveValueUsdE8: bigint; supply: bigint } }).args.navUsdPerTokenE8;
    // $1000 reserve / 1000 tokens = $1 → 1e8 E8
    expect(navE8).toBe(100_000_000n);
  }, 30_000);
});
