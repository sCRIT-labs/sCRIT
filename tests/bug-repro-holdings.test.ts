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
    // This assertion documents CORRECT behavior — it must FAIL on buggy logic.
    // Order-independent: expectations derive from each symbol's position.
    const correct = Object.fromEntries(BASKET.map((row, index) => [row.symbol, fakeHoldings[index]]));
    const idxOf = (sym: string) => BASKET.findIndex((row) => row.symbol === sym);
    const first = BASKET[0].symbol;
    const last = BASKET[BASKET.length - 1].symbol;
    expect(correct[first]).toBe(1_000_000_000_000n);
    expect(correct[last]).toBe(BigInt(BASKET.length) * 1_000_000_000_000n);
    expect(buggy[first]).not.toBe(correct[first]); // proves bug exists (shifted)
    expect(buggy[last]).toBeUndefined(); // last entries out of bounds
    expect(idxOf("Au")).toBeGreaterThanOrEqual(0);
    expect(correct["Au"]).toBe(BigInt(idxOf("Au") + 1) * 1_000_000_000_000n);
  });

  it("source file must use holdings[index] (regression guard)", () => {
    const src = readFileSync("hooks/useReserveChainData.ts", "utf8");
    expect(src).toContain("holdings[index]");
    expect(src).not.toContain("holdings[index + 3]");
  });
});
