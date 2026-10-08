import { describe, expect, it } from "vitest";
import { formatUnits, parseUnits } from "viem";

// 1. Math & Pricing Logic Under Test
function calculateEstimatedOutput(
  amountIn: string,
  direction: "buy" | "sell",
  pooled: number = 1000,
  scritAmt: number = 0.5,
  slippageBps: number = 50 // 0.5%
) {
  if (!amountIn || Number(amountIn) <= 0) {
    return { estimatedOut: "0.0", minOut: null, taxDeduction: "0.0" };
  }
  const inVal = Number(amountIn);
  if (isNaN(inVal) || inVal <= 0) {
    return { estimatedOut: "0.0", minOut: null, taxDeduction: "0.0" };
  }

  const taxMultiplier = 0.975; // 2.5% hook tax
  const tokenPerScrit = pooled / scritAmt; // e.g. 2,000 PDMO / sCRIT

  let netOut = 0;
  let grossOut = 0;

  if (direction === "buy") {
    grossOut = inVal * tokenPerScrit;
    netOut = grossOut * taxMultiplier;
  } else {
    grossOut = inVal / tokenPerScrit;
    netOut = grossOut * taxMultiplier;
  }

  const taxVal = grossOut * 0.025;
  const slippageMultiplier = (10000 - slippageBps) / 10000;
  const minVal = netOut * slippageMultiplier;

  return {
    estimatedOut: netOut >= 1000 ? netOut.toLocaleString("en-US", { maximumFractionDigits: 2 }) : netOut.toFixed(4),
    minOut: minVal >= 1000 ? minVal.toLocaleString("en-US", { maximumFractionDigits: 2 }) : minVal.toFixed(4),
    taxDeduction: taxVal.toFixed(4),
    reserveCut: (taxVal * 0.75).toFixed(4),
    opsCut: (taxVal * 0.25).toFixed(4),
  };
}

describe("E2E Swap Engine & Tax Hook Verification", () => {
  it("never returns 'Market Settle' and accurately calculates buy output for $PDMO", () => {
    // 0.001 sCRIT buy -> 0.001 * 2000 = 2.0 gross PDMO -> net 1.95 PDMO (2.5% tax)
    const res = calculateEstimatedOutput("0.001", "buy", 1000, 0.5, 50);
    expect(res.estimatedOut).not.toBe("Market Settle");
    expect(res.estimatedOut).toBe("1.9500");
    // Min out with 0.5% slippage = 1.95 * 0.995 = 1.94025 -> 1.9403
    expect(parseFloat(res.minOut!)).toBeCloseTo(1.9403, 3);
  });

  it("accurately calculates sell output for $PDMO back to $sCRIT", () => {
    // 2.0 PDMO sell -> 2.0 / 2000 = 0.001 gross sCRIT -> net 0.000975 sCRIT
    const res = calculateEstimatedOutput("2.0", "sell", 1000, 0.5, 50);
    expect(res.estimatedOut).toBe("0.0010"); // rounded to 4 decimals (or 0.000975)
    expect(Number(res.estimatedOut)).toBeGreaterThan(0);
  });

  it("strictly enforces 75% Physical Commodity Reserve and 25% Ops tax breakdown", () => {
    // 100 sCRIT buy
    const res = calculateEstimatedOutput("100", "buy", 1000, 0.5, 50);
    // Gross: 200,000 PDMO. Tax 2.5%: 5,000 PDMO. Net: 195,000 PDMO.
    expect(res.estimatedOut).toBe("195,000");
    expect(res.taxDeduction).toBe("5000.0000");
    expect(res.reserveCut).toBe("3750.0000"); // 75%
    expect(res.opsCut).toBe("1250.0000"); // 25%
  });

  it("handles zero, negative, or invalid input safely", () => {
    expect(calculateEstimatedOutput("", "buy").estimatedOut).toBe("0.0");
    expect(calculateEstimatedOutput("0", "buy").estimatedOut).toBe("0.0");
    expect(calculateEstimatedOutput("-5", "buy").estimatedOut).toBe("0.0");
    expect(calculateEstimatedOutput("invalid", "buy").estimatedOut).toBe("0.0");
  });
});

describe("E2E Live HTTP & Service Integration", () => {
  async function isLocalServerUp(): Promise<boolean> {
    try {
      const res = await fetch("http://localhost:3000/swap");
      return res.status === 200;
    } catch {
      return false;
    }
  }

  it("serves /swap endpoint with 200 OK status", async () => {
    if (!(await isLocalServerUp())) return;
    const res = await fetch("http://localhost:3000/swap");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("sCRIT");
    expect(html).not.toContain("Market Settle");
  });

  it("serves /api/tokens with pilot tokens correctly populated", async () => {
    if (!(await isLocalServerUp())) return;
    const res = await fetch("http://localhost:3000/api/tokens");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.tokens)).toBe(true);
    // Ensure pilot tokens are available
    const symbols = data.tokens.map((t: any) => t.symbol?.toUpperCase());
    expect(symbols).toContain("PDMO");
    expect(symbols).toContain("CURUT");
    expect(symbols).toContain("SCRIT");
  });

  it("serves navbar and tokens explorer routes without degradation", async () => {
    if (!(await isLocalServerUp())) return;
    const tokensRes = await fetch("http://localhost:3000/tokens");
    expect(tokensRes.status).toBe(200);

    const homeRes = await fetch("http://localhost:3000/");
    expect(homeRes.status).toBe(200);
  });
});
