import { describe, expect, it } from "vitest";
import { calcNav, calcPremium, premiumBand } from "../lib/nav";

describe("nav", () => {
  it("computes reserve and nav", () => {
    const r = calcNav(
      { Au: 0.005, Ag: 0.2, Pt: 0.002 },
      { Au: 85000, Ag: 1100, Pt: 95000 },
      999000000n
    );
    expect(r.reserveUsd).toBeCloseTo(
      0.005 * 85000 + 0.2 * 1100 + 0.002 * 95000,
      6
    );
    expect(r.navUsd).toBeCloseTo(r.reserveUsd / 999000000, 10);
  });
  it("premium positive when market above nav", () => {
    expect(calcPremium(1.1, 1)).toBeCloseTo(0.1, 10);
  });
  it("premium negative when market below nav", () => {
    expect(calcPremium(0.9, 1)).toBeCloseTo(-0.1, 10);
  });
  it("zero nav gives zero premium", () => {
    expect(calcPremium(5, 0)).toBe(0);
  });
  it("bands deviation: ok, watch, alert", () => {
    expect(premiumBand(0.05)).toBe("ok");
    expect(premiumBand(-0.09)).toBe("ok");
    expect(premiumBand(0.1)).toBe("watch");
    expect(premiumBand(-0.15)).toBe("watch");
    expect(premiumBand(0.25)).toBe("alert");
    expect(premiumBand(-0.4)).toBe("alert");
  });
});
