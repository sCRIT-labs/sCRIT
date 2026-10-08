import { describe, it, expect } from "vitest";
import {
  evaluateSupplyFixed,
  evaluateWeeklyBurn,
  sortInvariantsByPriority,
  INVARIANT_DEFINITIONS,
  type InvariantCheckResult,
} from "../lib/invariants/checks";

describe("Invariant Board - Protocol Promises & Rule Checks", () => {
  it("defines all 14 protocol invariants with exact calls and promises", () => {
    expect(INVARIANT_DEFINITIONS.length).toBeGreaterThanOrEqual(14);
    const ids = INVARIANT_DEFINITIONS.map((d) => d.id);
    expect(ids).toContain("I-1");
    expect(ids).toContain("I-2");
    expect(ids).toContain("I-3");
    expect(ids).toContain("I-5");
    expect(ids).toContain("I-6");
    expect(ids).toContain("I-7");
    expect(ids).toContain("I-11");
    expect(ids).toContain("I-14");
  });

  it("I-1: evaluates supply fixed at 1,000,000,000 tokens", () => {
    const canonicalSupply = 1000000000n * 10n ** 18n;
    const passResult = evaluateSupplyFixed(canonicalSupply);
    expect(passResult.status).toBe("PASS");
    expect(passResult.value).toContain("1,000,000,000");

    const inflatedSupply = 1000000001n * 10n ** 18n;
    const failResult = evaluateSupplyFixed(inflatedSupply);
    expect(failResult.status).toBe("FAIL");
  });

  it("I-11: evaluates weekly burn interval (fails when gap > 8 days)", () => {
    const now = 1775000000;
    // 6 days ago -> PASS
    const recentBurnTs = now - 6 * 24 * 3600;
    const recentResult = evaluateWeeklyBurn(recentBurnTs, now);
    expect(recentResult.status).toBe("PASS");

    // 8.5 days ago -> FAIL · Burn overdue
    const overdueBurnTs = now - Math.floor(8.5 * 24 * 3600);
    const overdueResult = evaluateWeeklyBurn(overdueBurnTs, now);
    expect(overdueResult.status).toBe("FAIL");
    expect(overdueResult.detail).toContain("Burn overdue");
  });

  it("sorts FAIL rows to the top of the board", () => {
    const mockResults: InvariantCheckResult[] = [
      {
        id: "I-1",
        promise: "Supply fixed",
        call: "totalSupply()",
        value: "1,000,000,000",
        status: "PASS",
        detail: "",
      },
      {
        id: "I-11",
        promise: "Weekly burn",
        call: "lastBurnTimestamp",
        value: "9 days ago",
        status: "FAIL",
        detail: "Burn overdue",
      },
      {
        id: "I-8",
        promise: "Scoped custodians",
        call: "custodians.length",
        value: "0 registered",
        status: "PENDING",
        detail: "Pilot phase",
      },
    ];

    const sorted = sortInvariantsByPriority(mockResults);
    expect(sorted[0].id).toBe("I-11"); // FAIL must be first
    expect(sorted[0].status).toBe("FAIL");
  });
});
