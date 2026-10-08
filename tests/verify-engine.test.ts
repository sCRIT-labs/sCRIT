import { describe, it, expect } from "vitest";
import { lookupAddress, type DeprecatedAddressInfo } from "../lib/addresses";
import { decodeHookPermissions, HOOK_FLAGS } from "../lib/verify/hook-decoder";
import {
  parseAttestation,
  verifyAttestationLocally,
  applyTamperDemo,
  computeAttestationDigest,
  recoverAttestationSigner,
  resolveAttestationChainReads,
  DEMO_SIGNER_ADDRESS,
  SAMPLE_MAINNET_ATTESTATION,
  SAMPLE_TESTNET_ATTESTATION,
} from "../lib/verify/attestation";
import {
  classifyReceiptLogs,
  TRANSFER_TOPIC_STD,
  TRANSFER_TOPIC_CHAIN,
  SWAP_TOPIC,
  INITIALIZE_TOPIC,
  TAX_COLLECTED_TOPIC,
  CALL_SCHEDULED_TOPIC,
  ATTESTATION_ACCEPTED_TOPIC,
} from "../lib/verify/transaction";

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
  // The testnet sample was REALLY submitted on testnet (recordPurchase tx
  // 0xc66294b9…cc1, block 130954480). currentTimeSeconds is pinned so the
  // 7-day TTL assertion never rots.
  const SAMPLE_TS = 1791442681;
  const FRESH_NOW = SAMPLE_TS + 100;

  it("parses real-schema attestation JSON (ReserveManager typehash)", () => {
    const parsed = parseAttestation(JSON.stringify(SAMPLE_TESTNET_ATTESTATION));
    expect(parsed).not.toBeNull();
    expect(parsed?.domain.name).toBe("sCRIT Reserve");
    expect(parsed?.domain.version).toBe("2");
    expect(parsed?.domain.chainId).toBe(46630);
    expect(parsed?.message.commodity).toBe(0);
    expect(typeof parsed?.message.massKgE12).toBe("string");
  });

  it("recovers the real test custodian from the submitted sample", async () => {
    const digest = computeAttestationDigest(SAMPLE_TESTNET_ATTESTATION);
    expect(digest).toMatch(/^0x[a-fA-F0-9]{64}$/);
    const signer = await recoverAttestationSigner(SAMPLE_TESTNET_ATTESTATION);
    expect(signer.toLowerCase()).toBe("0x7108142336540d99a1d80b474c48fe388181eee9");
  });

  it("verifies the submitted testnet sample ACCEPTED ON-CHAIN", async () => {
    const v = await verifyAttestationLocally(SAMPLE_TESTNET_ATTESTATION, {
      expectedChainId: 46630,
      currentTimeSeconds: FRESH_NOW,
      custodian: { active: true, scopeMask: 1 },
      nonceUsed: true,
      onChainEventFound: true,
      onChainTxHash: "0xc66294b99dd81eea21217eebd4161f036facb3602276c30664242fe05fffacc1",
    });
    for (const k of [
      "step1_parse",
      "step2_chain_contract",
      "step3_digest",
      "step4_signer",
      "step5_custodian_registered",
      "step6_commodity_scope",
      "step7_nonce",
      "step8_ttl",
      "step9_onchain_event",
    ]) {
      expect(v.stepResults[k]).toBe(true);
    }
    expect(v.verdict).toBe("ACCEPTED ON-CHAIN");
  });

  it("rejects a replayed nonce with no matching acceptance event", async () => {
    const v = await verifyAttestationLocally(SAMPLE_TESTNET_ATTESTATION, {
      expectedChainId: 46630,
      currentTimeSeconds: FRESH_NOW,
      custodian: { active: true, scopeMask: 1 },
      nonceUsed: true,
      onChainEventFound: false,
    });
    expect(v.stepResults.step7_nonce).toBe(false);
    expect(v.verdict).toBe("REJECTED");
  });

  it("tamper demo (+1 gram = +1e12 massKgE12) mutates digest and signer", async () => {
    const tampered = applyTamperDemo(SAMPLE_TESTNET_ATTESTATION);
    expect(BigInt(tampered.message.massKgE12)).toBe(
      BigInt(SAMPLE_TESTNET_ATTESTATION.message.massKgE12) + 1_000_000_000_000n
    );

    const originalVerification = await verifyAttestationLocally(SAMPLE_TESTNET_ATTESTATION, {
      expectedChainId: 46630,
      currentTimeSeconds: FRESH_NOW,
      custodian: { active: false, scopeMask: 0 },
      nonceUsed: false,
    });
    const tamperedVerification = await verifyAttestationLocally(tampered, {
      expectedChainId: 46630,
      currentTimeSeconds: FRESH_NOW,
      custodian: { active: false, scopeMask: 0 },
      nonceUsed: false,
    });

    expect(tamperedVerification.digest).not.toBe(originalVerification.digest);
    expect(tamperedVerification.recoveredSigner.toLowerCase()).not.toBe(
      originalVerification.recoveredSigner.toLowerCase()
    );
  });

  it("rejects mainnet-shaped sample when checked against the wrong chain", async () => {
    const v = await verifyAttestationLocally(SAMPLE_TESTNET_ATTESTATION, {
      expectedChainId: 4663,
      currentTimeSeconds: FRESH_NOW,
      custodian: { active: false, scopeMask: 0 },
      nonceUsed: false,
    });
    expect(v.stepResults.step2_chain_contract).toBe(false);
    expect(v.verdict).toBe("REJECTED");
  });
});

describe("Verify Engine - Transaction Receipt Classifier", () => {
  it("classifies Burn transaction when Transfer event target is canonical Dead address", () => {
    const critAddress = "0x351776b6fba6a910c32e46f3775aa946a724d78f";
    const deadAddress = "0x000000000000000000000000000000000000dEaD";
    const sender = "0x272568D25b9634Ad8A4e8E8CBB10b729f41C781d";

    // Chain-observed Transfer topic on Robinhood tokens (see lib docs).
    const transferTopic = TRANSFER_TOPIC_CHAIN;
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

  it("also classifies standard-topic ERC20 burns", () => {
    const critAddress = "0x351776b6fba6a910c32e46f3775aa946a724d78f";
    const deadAddress = "0x000000000000000000000000000000000000dEaD";
    const paddedDead = `0x000000000000000000000000${deadAddress.slice(2).toLowerCase()}`;
    const result = classifyReceiptLogs([
      {
        address: critAddress,
        topics: [
          TRANSFER_TOPIC_STD,
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          paddedDead,
        ],
        data: "0x000000000000000000000000000000000000000000000de0b6b3a7640000",
        blockNumber: 1n,
      },
    ]);
    expect(result.classification).toBe("Burn");
  });

  it("classifies V4 swaps by the chain-verified Swap topic", () => {
    const result = classifyReceiptLogs([
      {
        address: "0x8366a39CC670B4001A1121B8F6A443A643e40951",
        topics: [SWAP_TOPIC, "0xpool", "0xsender"],
        data: "0x00",
        blockNumber: 74493182n,
      },
    ]);
    expect(result.classification).toBe("Rail A swap");
  });

  it("decodes hook TaxCollected amounts exactly", () => {
    const poolId = "0x807c3523b5b47cb53a78cbf03283dfb6c5117b7d1c72d2aaadb5aa5caad30d19";
    const currency = "0x351776b6fba6a910c32e46f3775aa946a724d78f";
    const pad = (v: bigint) => `0x${v.toString(16).padStart(64, "0")}`;
    const result = classifyReceiptLogs([
      {
        address: "0x4bbd5c4894b75ddbf215c82304b6c21f9134a044",
        topics: [TAX_COLLECTED_TOPIC, poolId, `0x000000000000000000000000${currency.slice(2)}`],
        data: (`0x${pad(25000n * 10n ** 18n).slice(2)}${pad(18750n * 10n ** 18n).slice(2)}${pad(6250n * 10n ** 18n).slice(2)}`),
        blockNumber: 2n,
      },
    ]);
    expect(result.classification).toBe("Rail A swap");
    expect(result.details.totalTax).toBe((25000n * 10n ** 18n).toString());
    expect(result.details.reserveAmount).toBe((18750n * 10n ** 18n).toString());
    expect(result.details.opsAmount).toBe((6250n * 10n ** 18n).toString());
  });

  it("classifies V4 pool launches by the chain-verified Initialize topic", () => {
    const result = classifyReceiptLogs([
      {
        address: "0x8366a39CC670B4001A1121B8F6A443A643e40951",
        topics: [INITIALIZE_TOPIC, "0xpool", "0xc0", "0xc1"],
        data: "0x00",
        blockNumber: 3n,
      },
    ]);
    expect(result.classification).toBe("Rail A launch");
  });

  it("classifies timelock scheduling by the OZ TimelockController topic", () => {
    const result = classifyReceiptLogs([
      {
        address: "0x00824e9c6075ff2ceb10009de7f170fc6721df1a",
        topics: [CALL_SCHEDULED_TOPIC, "0xid", "0x00"],
        data: "0x00",
        blockNumber: 4n,
      },
    ]);
    expect(result.classification).toBe("Governance");
  });

  it("classifies reserve attestation acceptance by the contract event topic", () => {
    const result = classifyReceiptLogs([
      {
        address: "0x0cc054ce72fc0a489732e20dd595de934be2e953",
        topics: [ATTESTATION_ACCEPTED_TOPIC, "0xbatch", "0x00", "0xcert", "0xcust"],
        data: "0x00",
        blockNumber: 5n,
      },
    ]);
    expect(result.classification).toBe("Attestation accepted");
  });

  it("fails step 2 when testnet attestation is checked against mainnet, passes on testnet", async () => {
    const mainnetCheck = await verifyAttestationLocally(SAMPLE_TESTNET_ATTESTATION, {
      expectedChainId: 4663,
    });
    expect(mainnetCheck.stepResults.step2_chain_contract).toBe(false);
    expect(mainnetCheck.steps[1].status).toBe("FAIL");

    const testnetCheck = await verifyAttestationLocally(SAMPLE_TESTNET_ATTESTATION, {
      expectedChainId: 46630,
      custodian: { active: true, scopeMask: 0x01 },
      nonceUsed: false,
      onChainEventFound: true,
      onChainTxHash: "0x8094e63ee75119769c114ff4ac77dbdd562aba8c1234567890abcdef12345678",
    });
    expect(testnetCheck.stepResults.step2_chain_contract).toBe(true);
    expect(testnetCheck.steps[1].status).toBe("PASS");
    expect(testnetCheck.verdict).toBe("ACCEPTED ON-CHAIN");
  });

  it("identifies deprecated legacy token 0x5607... as DEPRECATED", () => {
    const lookup = lookupAddress("0x56073943133c1c0678a753be9402b27d43cf1c22");
    expect(lookup.type).toBe("deprecated");
    expect((lookup.info as DeprecatedAddressInfo).reason).toContain("Pre-Pons token");
  });

  it("decodes canonical burn tx with exact required plain-English sentence", () => {
    const deadAddress = "0x000000000000000000000000000000000000dEaD";
    const sender = "0x272568D25b9634Ad8A4e8E8CBB10b729f41C781d";
    const amountHex = "0x00000000000000000000000000000000000000000000943b1377290cbd800000"; // 700,000 CRIT

    const logs = [
      {
        address: "0x351776b6fba6a910c32e46f3775aa946a724d78f",
        topics: [
          TRANSFER_TOPIC_CHAIN,
          `0x000000000000000000000000${sender.slice(2).toLowerCase()}`,
          `0x000000000000000000000000${deadAddress.slice(2).toLowerCase()}`,
        ],
        data: amountHex,
        blockNumber: 74475819n,
      },
    ];

    const result = classifyReceiptLogs(logs);
    expect(result.classification).toBe("Burn");
    expect(result.summary).toBe("700,000 $CRIT sent to 0x...dEaD in block 74475819. These tokens can never move again.");
  });

  it("resolveAttestationChainReads parses array tuple [scopeMask, active] correctly", async () => {
    const mockClient: any = {
      readContract: async ({ functionName }: { functionName: string }) => {
        if (functionName === "custodians") {
          // Viem returns array tuple for multi-return Solidity functions
          return [1, true];
        }
        if (functionName === "usedNonce") {
          return true;
        }
        return null;
      },
      getBlockNumber: async () => 131000000n,
      getLogs: async () => [
        {
          transactionHash: "0xc66294b99dd81eea21217eebd4161f036facb3602276c30664242fe05fffacc1",
        },
      ],
    };

    const reads = await resolveAttestationChainReads(
      mockClient,
      46630,
      SAMPLE_TESTNET_ATTESTATION,
      "0x7108142336540d99a1d80b474c48FE388181eEE9"
    );

    expect(reads.custodian).toEqual({ scopeMask: 1, active: true });
    expect(reads.nonceUsed).toBe(true);
    expect(reads.acceptanceTxHash).toBe(
      "0xc66294b99dd81eea21217eebd4161f036facb3602276c30664242fe05fffacc1"
    );
  });

  it("verifyAttestationLocally passes historical settlements even if timestamp is older than 7d", async () => {
    // 30 days after attestation
    const futureTime = Number(SAMPLE_TESTNET_ATTESTATION.message.timestamp) + 30 * 86400;
    const v = await verifyAttestationLocally(SAMPLE_TESTNET_ATTESTATION, {
      expectedChainId: 46630,
      currentTimeSeconds: futureTime,
      custodian: { active: true, scopeMask: 1 },
      nonceUsed: true,
      onChainEventFound: true,
      onChainTxHash: "0xc66294b99dd81eea21217eebd4161f036facb3602276c30664242fe05fffacc1",
    });

    expect(v.stepResults.step8_ttl).toBe(true);
    expect(v.steps[7].status).toBe("PASS");
    expect(v.verdict).toBe("ACCEPTED ON-CHAIN");
  });
});
