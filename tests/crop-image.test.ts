import { describe, expect, it } from "vitest";
import { clampOffset, clampZoom, cropSquareParams, maxPanOffset } from "../lib/crop-image";

describe("crop-image utility", () => {
  it("clamps zoom within [1, 3]", () => {
    expect(clampZoom(0.5)).toBe(1);
    expect(clampZoom(2)).toBe(2);
    expect(clampZoom(5)).toBe(3);
    expect(clampZoom(NaN)).toBe(1);
  });

  it("calculates max pan offset correctly for landscape images", () => {
    // 600x400 image, 300px view, zoom 1
    // scale = max(300/600, 300/400) = 0.75
    // rendered: 600 * 0.75 = 450w, 400 * 0.75 = 300h
    // maxPan X = (450 - 300) / 2 = 75px
    // maxPan Y = (300 - 300) / 2 = 0px
    const pan = maxPanOffset(600, 400, 300, 1);
    expect(pan.x).toBe(75);
    expect(pan.y).toBe(0);
  });

  it("clamps pan offset to remain inside viewport", () => {
    const clamped = clampOffset(600, 400, 300, 1, 100, -50);
    expect(clamped.x).toBe(75);
    expect(clamped.y).toBe(0);
  });

  it("produces valid crop square coordinates within image bounds", () => {
    const params = cropSquareParams(600, 400, 300, 1, 0, 0);
    expect(params.sSize).toBeGreaterThan(0);
    expect(params.sx).toBeGreaterThanOrEqual(0);
    expect(params.sy).toBeGreaterThanOrEqual(0);
    expect(params.sx + params.sSize).toBeLessThanOrEqual(600);
    expect(params.sy + params.sSize).toBeLessThanOrEqual(400);
  });
});
