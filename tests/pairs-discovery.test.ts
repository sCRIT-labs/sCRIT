import { describe, it, expect } from "vitest";
import { getCanonicalAddress } from "../lib/addresses";
import {
  filterStockpilePairedPools,
  calculatePoolContribution,
  reconcileHookTax,
  type DiscoveredPool,
} from "../lib/pairs/discovery";

describe("Pairs Discovery - Pool Classification and Reconciliation", () => {
  const canonicalCrit = getCanonicalAddress("CRIT");
  const legacyCrit = "0x56073943133c1c0678a753be9402b27d43cf1c22";
  const canonicalHook = getCanonicalAddress("TradingTaxHook");
  const fakeHook = "0x1111111111111111111111111111111111112044";

  const mockPools: DiscoveredPool[] = [
    {
      poolId: "0xabc1",
      token0: canonicalCrit,
      token1: "0xTokenA1111111111111111111111111111111111",
      projectToken: "0xTokenA1111111111111111111111111111111111",
      tokenSymbol: "RAILA",
      tokenName: "Rail A Alpha",
      hook: canonicalHook,
      fee: 25000,
      createdAtBlock: 1200000n,
      createdAtTimestamp: 1774000000,
      swapCount: 10,
      critVolume: 1000000n * 10n ** 18n, // 1M CRIT
      fedToStockpile: 18750n * 10n ** 18n, // 1M * 2.5% * 75% = 18,750 CRIT
      lpRecipient: "0xIssuer1",
      isLegacy: false,
    },
    {
      poolId: "0xabc2",
      token0: legacyCrit,
      token1: "0xTokenB2222222222222222222222222222222222",
      projectToken: "0xTokenB2222222222222222222222222222222222",
      tokenSymbol: "OLDPAIR",
      tokenName: "Legacy Pair",
      hook: canonicalHook,
      fee: 25000,
      createdAtBlock: 1100000n,
      createdAtTimestamp: 1773000000,
      swapCount: 5,
      critVolume: 500000n * 10n ** 18n,
      fedToStockpile: 9375n * 10n ** 18n,
      lpRecipient: "0xIssuer2",
      isLegacy: true,
    },
    {
      poolId: "0xabc3",
      token0: canonicalCrit,
      token1: "0xTokenC333333333333333333333333333333333",
      projectToken: "0xTokenC333333333333333333333333333333333",
      tokenSymbol: "FAKEHOOK",
      tokenName: "Impostor Pool",
      hook: fakeHook,
      fee: 3000,
      createdAtBlock: 1210000n,
      createdAtTimestamp: 1774100000,
      swapCount: 2,
      critVolume: 100000n * 10n ** 18n,
      fedToStockpile: 0n,
      lpRecipient: "0xIssuer3",
      isLegacy: false,
    },
  ];

  it("filters active canonical pairs and separates legacy pairs, excluding foreign hooks", () => {
    const { canonical, legacy, nearby } = filterStockpilePairedPools(mockPools);

    expect(canonical).toHaveLength(1);
    expect(canonical[0].tokenSymbol).toBe("RAILA");
    expect(canonical[0].isLegacy).toBe(false);

    expect(legacy).toHaveLength(1);
    expect(legacy[0].tokenSymbol).toBe("OLDPAIR");
    expect(legacy[0].isLegacy).toBe(true);

    // Impostor-hook pool touching canonical CRIT lands in nearby, never hidden.
    expect(nearby).toHaveLength(1);
    expect(nearby[0].tokenSymbol).toBe("FAKEHOOK");
    expect(nearby[0].reason).toContain("foreign hook");
  });

  it("calculates 2.5% hook tax and 75% stockpile split correctly", () => {
    const volume = 1000000n * 10n ** 18n; // 1,000,000 CRIT
    const result = calculatePoolContribution(volume, 250, 75); // 250 bps (2.5%), 75% split

    // Total tax = 1M * 0.025 = 25,000 CRIT
    expect(result.totalTax).toBe(25000n * 10n ** 18n);
    // Stockpile (75%) = 18,750 CRIT
    expect(result.stockpileAmount).toBe(18750n * 10n ** 18n);
    // Ops (25%) = 6,250 CRIT
    expect(result.opsAmount).toBe(6250n * 10n ** 18n);
  });

  it("reconciles derived hook tax against treasury receipts within tolerance", () => {
    const derivedTax = 25000n * 10n ** 18n;
    const treasuryReceived = 24999n * 10n ** 18n; // 1 wei difference / unswept dust
    const maxTolerance = 100n * 10n ** 18n;

    const reconciliation = reconcileHookTax(derivedTax, treasuryReceived, maxTolerance);
    expect(reconciliation.isWithinTolerance).toBe(true);
    expect(reconciliation.status).toBe("PASS");
  });

  it("flags mismatch if treasury received is far below derived hook tax", () => {
    const derivedTax = 50000n * 10n ** 18n;
    const treasuryReceived = 10000n * 10n ** 18n; // 40k deficit
    const maxTolerance = 100n * 10n ** 18n;

    const reconciliation = reconcileHookTax(derivedTax, treasuryReceived, maxTolerance);
    expect(reconciliation.isWithinTolerance).toBe(false);
    expect(reconciliation.status).toBe("MISMATCH");
  });
});

