import { afterAll, beforeAll, describe, expect, it } from "vitest";
import ganache from "ganache";
import { createPublicClient, createWalletClient, custom, defineChain, getContractAddress, keccak256, toBytes, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  SCRIT_CUSTODIANS_ABI, SCRIT_CUSTODIANS_BYTECODE, SCRIT_KYC_ABI, SCRIT_KYC_BYTECODE,
  SCRIT_LOT_MANAGER_ABI, SCRIT_LOT_MANAGER_BYTECODE, SCRIT_LOT_REDEMPTION_ABI, SCRIT_LOT_REDEMPTION_BYTECODE,
  SCRIT_LOT_TOKEN_ABI, SCRIT_LOT_TOKEN_BYTECODE,
} from "../lib/scrit-artifact";

const chain = defineChain({ id: 46630, name: "sCRIT Local Testnet", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: ["http://127.0.0.1"] } } });
const keys = [11, 12, 13].map((n) => `0x${n.toString(16).padStart(64, "0")}` as `0x${string}`);
const [admin, guardian, custodian] = keys.map((key) => privateKeyToAccount(key));
const hash = (value: string) => keccak256(toBytes(value));

describe("Rail B contracts", () => {
  const provider = ganache.provider({ logging: { quiet: true }, chain: { chainId: chain.id }, wallet: { accounts: keys.map((secretKey) => ({ secretKey, balance: "0x3635C9ADC5DEA00000" })) } });
  const publicClient = createPublicClient({ chain, transport: custom(provider as never) });
  const adminClient = createWalletClient({ account: admin, chain, transport: custom(provider as never) });
  const custodianClient = createWalletClient({ account: custodian, chain, transport: custom(provider as never) });
  let registry: Address; let kyc: Address; let manager: Address; let token: Address; let redemption: Address;

  beforeAll(async () => {
    const registryTx = await adminClient.deployContract({ abi: SCRIT_CUSTODIANS_ABI, bytecode: SCRIT_CUSTODIANS_BYTECODE, args: [admin.address] });
    registry = (await publicClient.waitForTransactionReceipt({ hash: registryTx })).contractAddress!;
    const kycTx = await adminClient.deployContract({ abi: SCRIT_KYC_ABI, bytecode: SCRIT_KYC_BYTECODE, args: [admin.address] });
    kyc = (await publicClient.waitForTransactionReceipt({ hash: kycTx })).contractAddress!;
    const nonce = await publicClient.getTransactionCount({ address: admin.address });
    const predictedToken = getContractAddress({ from: admin.address, nonce: BigInt(nonce + 1) });
    const predictedRedemption = getContractAddress({ from: admin.address, nonce: BigInt(nonce + 2) });
    const managerTx = await adminClient.deployContract({ abi: SCRIT_LOT_MANAGER_ABI, bytecode: SCRIT_LOT_MANAGER_BYTECODE, args: [admin.address, guardian.address, registry, predictedToken] });
    manager = (await publicClient.waitForTransactionReceipt({ hash: managerTx })).contractAddress!;
    const tokenTx = await adminClient.deployContract({ abi: SCRIT_LOT_TOKEN_ABI, bytecode: SCRIT_LOT_TOKEN_BYTECODE, args: [admin.address, manager, predictedRedemption, guardian.address, ""] });
    token = (await publicClient.waitForTransactionReceipt({ hash: tokenTx })).contractAddress!;
    const redemptionTx = await adminClient.deployContract({ abi: SCRIT_LOT_REDEMPTION_ABI, bytecode: SCRIT_LOT_REDEMPTION_BYTECODE, args: [admin.address, guardian.address, token, kyc] });
    redemption = (await publicClient.waitForTransactionReceipt({ hash: redemptionTx })).contractAddress!;
    expect(token.toLowerCase()).toBe(predictedToken.toLowerCase());
    expect(redemption.toLowerCase()).toBe(predictedRedemption.toLowerCase());
  }, 30_000);

  afterAll(async () => { await provider.disconnect(); });

  it("mints scoped 100-unit lots, preserves units on rejection, and burns only on approval", async () => {
    const setCustodian = await adminClient.writeContract({ address: registry, abi: SCRIT_CUSTODIANS_ABI, functionName: "setCustodian", args: [custodian.address, 8, hash("test-only evidence pointer")] });
    await publicClient.waitForTransactionReceipt({ hash: setCustodian });
    const at = (await publicClient.getBlock()).timestamp + 30n;
    const lot = { lotId: hash("test-lot-01"), commodity: 3, certificateHash: hash("test certificate"), gradeSpecHash: hash("grade"), vaultIdHash: hash("vault"), provenanceHash: hash("testnet provenance"), timestamp: at, nonce: 1n, recipient: admin.address } as const;
    const signature = await custodian.signTypedData({
      domain: { name: "sCRIT Physical Lots", version: "1", chainId: chain.id, verifyingContract: manager },
      types: { LotAttestation: [
        { name: "lotId", type: "bytes32" }, { name: "commodity", type: "uint8" }, { name: "certificateHash", type: "bytes32" },
        { name: "gradeSpecHash", type: "bytes32" }, { name: "vaultIdHash", type: "bytes32" }, { name: "provenanceHash", type: "bytes32" },
        { name: "timestamp", type: "uint64" }, { name: "nonce", type: "uint256" }, { name: "recipient", type: "address" },
      ] }, primaryType: "LotAttestation", message: lot,
    });
    const createTx = await adminClient.writeContract({ address: manager, abi: SCRIT_LOT_MANAGER_ABI, functionName: "createLot", args: [lot, signature] });
    await publicClient.waitForTransactionReceipt({ hash: createTx });
    const lotId = BigInt(lot.lotId);
    expect(await publicClient.readContract({ address: token, abi: SCRIT_LOT_TOKEN_ABI, functionName: "balanceOf", args: [admin.address, lotId] })).toBe(100n);

    const beforeKyc = await adminClient.writeContract({ address: redemption, abi: SCRIT_LOT_REDEMPTION_ABI, functionName: "request", args: [lotId, 100n] }).catch(() => null);
    expect(beforeKyc).toBeNull();
    const approveKyc = await adminClient.writeContract({ address: kyc, abi: SCRIT_KYC_ABI, functionName: "setApproval", args: [admin.address, hash("testnet KYC evidence reference")] });
    await publicClient.waitForTransactionReceipt({ hash: approveKyc });
    const requestTx = await adminClient.writeContract({ address: redemption, abi: SCRIT_LOT_REDEMPTION_ABI, functionName: "request", args: [lotId, 100n] });
    await publicClient.waitForTransactionReceipt({ hash: requestTx });
    let requestId = (await publicClient.readContract({ address: redemption, abi: SCRIT_LOT_REDEMPTION_ABI, functionName: "nextRequestId" })) - 1n;
    expect(await publicClient.readContract({ address: token, abi: SCRIT_LOT_TOKEN_ABI, functionName: "balanceOf", args: [admin.address, lotId] })).toBe(100n);
    const pendingTransfer = await adminClient.writeContract({ address: token, abi: SCRIT_LOT_TOKEN_ABI, functionName: "safeTransferFrom", args: [admin.address, custodian.address, lotId, 100n, "0x"] }).catch(() => null);
    expect(pendingTransfer).toBeNull();
    const rejectTx = await adminClient.writeContract({ address: redemption, abi: SCRIT_LOT_REDEMPTION_ABI, functionName: "setStatus", args: [requestId, 5, hash("rejection record")], gas: 500_000n });
    expect((await publicClient.waitForTransactionReceipt({ hash: rejectTx })).status).toBe("success");
    expect((await publicClient.readContract({ address: redemption, abi: SCRIT_LOT_REDEMPTION_ABI, functionName: "requests", args: [requestId] }))[3]).toBe(5);
    expect(await publicClient.readContract({ address: token, abi: SCRIT_LOT_TOKEN_ABI, functionName: "balanceOf", args: [admin.address, lotId] })).toBe(100n);
    const transferAfterRejection = await adminClient.writeContract({ address: token, abi: SCRIT_LOT_TOKEN_ABI, functionName: "safeTransferFrom", args: [admin.address, custodian.address, lotId, 100n, "0x"] });
    await publicClient.waitForTransactionReceipt({ hash: transferAfterRejection });
    const returnAfterRejection = await custodianClient.writeContract({ address: token, abi: SCRIT_LOT_TOKEN_ABI, functionName: "safeTransferFrom", args: [custodian.address, admin.address, lotId, 100n, "0x"] });
    await publicClient.waitForTransactionReceipt({ hash: returnAfterRejection });

    const requestAgainTx = await adminClient.writeContract({ address: redemption, abi: SCRIT_LOT_REDEMPTION_ABI, functionName: "request", args: [lotId, 100n] });
    await publicClient.waitForTransactionReceipt({ hash: requestAgainTx });
    requestId = (await publicClient.readContract({ address: redemption, abi: SCRIT_LOT_REDEMPTION_ABI, functionName: "nextRequestId" })) - 1n;
    const approveTx = await adminClient.writeContract({ address: redemption, abi: SCRIT_LOT_REDEMPTION_ABI, functionName: "setStatus", args: [requestId, 2, hash("approval record")], gas: 500_000n });
    expect((await publicClient.waitForTransactionReceipt({ hash: approveTx })).status).toBe("success");
    expect(await publicClient.readContract({ address: token, abi: SCRIT_LOT_TOKEN_ABI, functionName: "balanceOf", args: [admin.address, lotId] })).toBe(0n);
    expect(await publicClient.readContract({ address: token, abi: SCRIT_LOT_TOKEN_ABI, functionName: "lotRedeemed", args: [lotId] })).toBe(true);
  }, 30_000);
});
