import { describe, it, expect } from "vitest";
import {
  canonicalizeJson,
  hashCanonicalReport,
  verifyReportHash,
  WEEK_3_REPORT,
  type AnchoredReport,
} from "../lib/reports/anchored-reports";

describe("Anchored Reports - Tamper-Evident Weekly Summaries", () => {
  it("canonicalizes JSON with deterministic key ordering and no whitespace", () => {
    const objA = { b: 2, a: 1, c: { y: 20, x: 10 } };
    const objB = { c: { x: 10, y: 20 }, a: 1, b: 2 };

    const canonA = canonicalizeJson(objA);
    const canonB = canonicalizeJson(objB);

    expect(canonA).toBe('{"a":1,"b":2,"c":{"x":10,"y":20}}');
    expect(canonA).toBe(canonB);
  });

  it("hashes canonical Week 3 report into 32-byte keccak256 hash", () => {
    const hash = hashCanonicalReport(WEEK_3_REPORT);
    expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  it("verifies the Week 3 draft against its real on-chain anchor", () => {
    const verification = verifyReportHash(WEEK_3_REPORT);
    expect(verification.isValid).toBe(true);
    expect(verification.statusText).toContain("matches anchor tx");
    expect(verification.anchorTx).toBe(
      "0x684d25ec13686b47b14b20e4ecfd8bcc30c2cc78278c30065caf261f4d6b0cec"
    );
  });

  it("uses only chain-observed inputs in the Week 3 draft", () => {
    // Real burn total from the 3 observed Transfer→Dead events.
    expect(WEEK_3_REPORT.burn.totalBurned).toBe("20009197.371729");
    // Real last-burn tx (exists on mainnet) and real scan range.
    expect(WEEK_3_REPORT.burn.burnTx).toBe(
      "0xac25ded31ecaebc08a576783a66f3fa1e49cf3b1d9e44a553db5937d8a632708"
    );
    expect(WEEK_3_REPORT.fromBlock).toBe(74475976);
    // Real demo attestations only.
    expect(WEEK_3_REPORT.stockpile.attestations).toHaveLength(2);
  });

  it("detects tampering if numbers are quietly edited after anchoring", () => {
    const tamperedReport: AnchoredReport = {
      ...WEEK_3_REPORT,
      burn: {
        ...WEEK_3_REPORT.burn,
        critBurned: "800000", // Tampered!
      },
    };

    const verification = verifyReportHash(tamperedReport);
    expect(verification.isValid).toBe(false);
  });
});
