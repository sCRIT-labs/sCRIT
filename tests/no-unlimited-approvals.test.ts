import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// I-12: user-facing flows must request exact token allowances, never
// unlimited (max uint256) approvals. Regression guard: fails the build if
// an unbounded approval is introduced in wallet-facing code.
const SCANNED_FILES = [
  "app/swap/page.tsx",
  "app/launch/page.tsx",
  "lib/scrit-evm.ts",
  "components/TopbarWallet.tsx",
  "components/WalletButton.tsx",
];

const BANNED_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: "maxUint256 identifier", re: /maxUint256/i },
  { name: "2n ** 256n - 1n expression", re: /2n\s*\*\*\s*256n\s*-\s*1n/ },
  {
    name: "uint256 max literal",
    re: /0x[fF]{16,}/,
  },
];

describe("I-12 - No unlimited approvals in wallet-facing flows", () => {
  for (const pattern of BANNED_PATTERNS) {
    it(`contains no ${pattern.name}`, () => {
      const violations: string[] = [];
      for (const rel of SCANNED_FILES) {
        const full = path.resolve(__dirname, "..", rel);
        if (!fs.existsSync(full)) continue;
        const lines = fs.readFileSync(full, "utf-8").split("\n");
        lines.forEach((line, idx) => {
          if (pattern.re.test(line)) {
            violations.push(`${rel}:${idx + 1} -> ${line.trim()}`);
          }
        });
      }
      expect(violations, `Unbounded approval found:\n${violations.join("\n")}`).toHaveLength(0);
    });
  }

  it("swap approve uses the exact parsed input amount", () => {
    const src = fs.readFileSync(path.resolve(__dirname, "../app/swap/page.tsx"), "utf-8");
    expect(src).toContain("args: [swapHelperAddress, parsedAmountIn]");
  });

  it("launcher approve uses the exact scrit need amount", () => {
    const src = fs.readFileSync(path.resolve(__dirname, "../lib/scrit-evm.ts"), "utf-8");
    expect(src).toContain("args: [launcher, need]");
  });
});
