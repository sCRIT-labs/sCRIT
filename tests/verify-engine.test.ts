import { describe, it, expect } from "vitest";
import { decodeHookPermissions, HOOK_FLAGS } from "../lib/verify/hook-decoder";
import {
  parseAttestation,
  verifyAttestationLocally,
  applyTamperDemo,
  SAMPLE_MAINNET_ATTESTATION,
  SAMPLE_TESTNET_ATTESTATION,
} from "../lib/verify/attestation";
import { classifyReceiptLogs } from "../lib/verify/transaction";

describe("Verify Engine - Hook Permission Decoder (Uniswap v4)", () => {
  const tradingTaxHook = "0x4bbd5c4894b75ddbf215c82304b6c21f9134a044";

  it("extracts 14-bit permission flags correctly for 0x2044", () => {
    const result = decodeHookPermissions(tradingTaxHook);
    expect(result.hexFlags).toBe("0x2044");
    expect(result.numericFlags).toBe(0x2044);

    // Exact Uniswap v4 flag checks
    expect(result.flags.beforeInitialize).toBe(true);
    expect(result.flags.afterSwap).toBe(true);
    expect(result.flags.afterSwapReturnDelta).toBe(true);

    // Critical OFF safety flags
    expect(result.flags.beforeRemoveLiquidity).toBe(false);
    expect(result.flags.beforeAddLiquidity).toBe(false);
    expect(result.flags.beforeSwap).toBe(false);
    expect(result.flags.afterAddLiquidity).toBe(false);
    expect(result.flags.afterRemoveLiquidity).toBe(false);
    expect(result.flags.beforeDonate).toBe(false);
    expect(result.flags.afterDonate).toBe(false);

    // Counts
    expect(result.activeCount).toBe(3);
    expect(result.inactiveCount).toBe(11);
  });

  it("provides human-readable explanations for critical security flags", () => {
    const result = decodeHookPermissions(tradingTaxHook);
    const lpNote = result.explanations.find((e) => e.flag === "beforeRemoveLiquidity");
    expect(lpNote).toBeDefined();
    expect(lpNote?.status).toBe("OFF");
    expect(lpNote?.meaning).toContain("cannot block LP withdrawals");
  });
});

describe("Verify Engine - EIP-712 Attestation & Tamper Demo", () => {
  it("parses valid attestation JSON", () => {
    const parsed = parseAttestation(JSON.stringify(SAMPLE_TESTNET_ATTESTATION));
    expect(parsed).not.toBeNull();
    expect(parsed?.domain.name).toBe("sCRIT Reserve Manager");
    expect(parsed?.message.element).toBe("Dy");
  });

  it("recomputes EIP-712 digest and recovers signer address", async () => {
    const verification = await verifyAttestationLocally(SAMPLE_TESTNET_ATTESTATION);
    expect(verification.stepResults.step1_parse).toBe(true);
    expect(verification.digest).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(verification.recoveredSigner).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it("tamper demo (+1 gram) mutates digest and changes recovered signer", async () => {
    const tampered = applyTamperDemo(SAMPLE_TESTNET_ATTESTATION);
    expect(BigInt(tampered.message.massGrams)).toBe(
      BigInt(SAMPLE_TESTNET_ATTESTATION.message.massGrams) + 1000n
    );

    const originalVerification = await verifyAttestationLocally(SAMPLE_TESTNET_ATTESTATION);
    const tamperedVerification = await verifyAttestationLocally(tampered);

    expect(tamperedVerification.digest).not.toBe(originalVerification.digest);
    expect(tamperedVerification.recoveredSigner.toLowerCase()).not.toBe(
      originalVerification.recoveredSigner.toLowerCase()
    );
  });
});

describe("Verify Engine - Transaction Receipt Classifier", () => {
  it("classifies Burn transaction when Transfer event target is canonical Dead address", () => {
    const critAddress = "0x351776b6fba6a910c32e46f3775aa946a724d78f";
    const deadAddress = "0x000000000000000000000000000000000000dEaD";
    const sender = "0x272568D25b9634Ad8A4e8E8CBB10b729f41C781d";

    // Standard ERC-20 Transfer event signature: Transfer(address,address,uint256)
    // topic0: 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
    const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    const paddedSender = `0x000000000000000000000000${sender.slice(2).toLowerCase()}`;
    const paddedDead = `0x000000000000000000000000${deadAddress.slice(2).toLowerCase()}`;

    // 700,000 * 10^18 tokens = 0x943b1377290cbd800000
    const amountHex = "0x00000000000000000000000000000000000000000000943b1377290cbd800000";

    const mockLogs = [
      {
        address: critAddress,
        topics: [transferTopic, paddedSender, paddedDead],
        data: amountHex,
        blockNumber: 1234567n,
      },
    ];

    const result = classifyReceiptLogs(mockLogs);
    expect(result.classification).toBe("Burn");
    expect(result.summary).toContain("700,000");
    expect(result.summary).toContain("dEaD");
  });
});
