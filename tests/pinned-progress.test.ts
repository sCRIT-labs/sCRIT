import { describe, expect, it } from "vitest";
import { calcSectionProgress, indexFor } from "../hooks/usePinnedProgress";

describe("calcSectionProgress", () => {
  it("0 when section top hits viewport bottom", () => {
    expect(calcSectionProgress(800, 400, 800)).toBe(0);
  });
  it("1 when section bottom hits viewport top", () => {
    expect(calcSectionProgress(-400, 400, 800)).toBe(1);
  });
  it("clamps outside range", () => {
    expect(calcSectionProgress(2000, 400, 800)).toBe(0);
    expect(calcSectionProgress(-2000, 400, 800)).toBe(1);
  });
  it("0 on bad input", () => {
    expect(calcSectionProgress(0, 0, 800)).toBe(0);
    expect(calcSectionProgress(0, 400, 0)).toBe(0);
  });
  it("maps progress to index", () => {
    expect(indexFor(0, 5)).toBe(0);
    expect(indexFor(0.5, 5)).toBe(2);
    expect(indexFor(0.99, 5)).toBe(4);
    expect(indexFor(1, 3)).toBe(2);
    expect(indexFor(-1, 3)).toBe(0);
    expect(indexFor(0.5, 0)).toBe(0);
  });
});
