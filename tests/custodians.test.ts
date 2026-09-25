import { describe, expect, it } from "vitest";
import { isScopedFor, isValidAddress, type Custodian } from "../lib/custodians";

const demo: Custodian = {
  address: "0x1111111111111111111111111111111111111111",
  name: "Pilot demo key",
  scope: ["Au", "Ag", "Pt"],
  status: "demo",
};

describe("custodian scoping", () => {
  it("allows scoped commodities", () => {
    expect(isScopedFor(demo, "Au")).toBe(true);
    expect(isScopedFor(demo, "Pt")).toBe(true);
  });
  it("blocks out-of-scope commodities (lithium test)", () => {
    expect(isScopedFor(demo, "Li")).toBe(false);
    expect(isScopedFor(demo, "U")).toBe(false);
  });
  it("is case-insensitive", () => {
    expect(isScopedFor(demo, "au")).toBe(true);
  });
  it("validates addresses", () => {
    expect(isValidAddress(demo.address)).toBe(true);
    expect(isValidAddress("0x123")).toBe(false);
  });
});
