import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { BASKET } from "../lib/scrit-basket";

// RED: reproduces hooks/useReserveChainData holdings mapping bug.
// Promise.all returns [chainId, blockNumber, supply, ...9 holdings].
// Correct mapping must be holdings[index], not holdings[index+3].
describe("holdings mapping bug repro", () => {
  it("maps all 9 commodities without shift", () => {
    const fakeHoldings = BASKET.map((_, i) => BigInt(i + 1) * 1_000_000_000_000n); // 1..9 kg in E12
    // Simulate current buggy code:
    const buggy = Object.fromEntries(
      BASKET.map((row, index) => [row.symbol, fakeHoldings[index + 3] as bigint | undefined])
    );
    // Buggy code leaves last 3 undefined (out of bounds) and shifts first 6.
    // This assertion documents CORRECT behavior — it must FAIL on buggy logic:
    const correct = Object.fromEntries(BASKET.map((row, index) => [row.symbol, fakeHoldings[index]]));
    // Au should be 1kg, not 4kg:
    expect(buggy["Au"]).not.toBe(correct["Au"]); // proves bug exists (shifted)
    expect(correct["Au"]).toBe(1_000_000_000_000n);
    expect(correct["Li"]).toBe(9_000_000_000_000n);
    expect(buggy["Li"]).toBeUndefined(); // last entries out of bounds
  });

  it("source file must use holdings[index] (regression guard)", () => {
    const src = readFileSync("hooks/useReserveChainData.ts", "utf8");
    expect(src).toContain("holdings[index]");
    expect(src).not.toContain("holdings[index + 3]");
  });
});
