import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

// RED: chain-event payloads stored as jsonb string scalars (double-encoded)
// arrive as strings. listChainEvents must normalize them to objects so the
// proof page does not render char-by-char ("0: { · 1: ...").
describe("chain event payload normalization", () => {
  it("listChainEvents normalizes string payloads to objects", async () => {
    const src = readFileSync("lib/db.ts", "utf8");
    // A normalize helper must exist that unwraps string payloads...
    expect(src).toMatch(/export function normalizeEventPayload/);
    expect(src).toMatch(/typeof current !== "string"/);
    // ...and listChainEvents must apply it to every row.
    const fn = src.slice(src.indexOf("export async function listChainEvents"));
    expect(fn).toMatch(/normalizeEventPayload\(row\.payload\)/);
  });

  it("proof page render guards non-object payloads", () => {
    const src = readFileSync("app/proof/page.tsx", "utf8");
    // Render must not call Object.entries directly on a possibly-string payload.
    expect(src).not.toMatch(/Object\.entries\(event\.payload \?\? \{\}\)/);
  });
});
