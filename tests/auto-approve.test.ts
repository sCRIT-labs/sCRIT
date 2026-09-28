import { describe, expect, it } from "vitest";
import { meetsAutoApproval, MIN_SCRIT_E18 } from "../scripts/auto-approve-issuers.mjs";

describe("auto-approve policy", () => {
  it("requires at least 0.001 sCRIT", () => {
    expect(MIN_SCRIT_E18).toBe(1000000000000000n);
    expect(meetsAutoApproval(0n)).toBe(false);
    expect(meetsAutoApproval(999999999999999n)).toBe(false);
    expect(meetsAutoApproval(1000000000000000n)).toBe(true);
    expect(meetsAutoApproval(1000000000000000000n)).toBe(true);
  });

  it("rejects non-bigint input", () => {
    expect(meetsAutoApproval(undefined as never)).toBe(false);
    expect(meetsAutoApproval("1000000000000000" as never)).toBe(false);
  });
});
