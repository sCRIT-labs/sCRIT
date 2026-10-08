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

  it("verifies Week 3 report against anchor registry", () => {
    const verification = verifyReportHash(WEEK_3_REPORT);
    expect(verification.isValid).toBe(true);
    expect(verification.statusText).toContain("matches anchor tx");
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
    expect(verification.statusText).toBe("✗ EDITED AFTER ANCHORING");
  });
});
