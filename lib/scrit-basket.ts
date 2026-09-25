export type BasketRow = {
  symbol: "Au" | "Ag" | "Pt";
  weightBps: number;
  tier: "Rare" | "Standard" | "Ultra Rare";
  grade: string;
};

export const BASKET: BasketRow[] = [
  { symbol: "Au", weightBps: 6000, tier: "Rare", grade: "LBMA 999.9" },
  { symbol: "Ag", weightBps: 2500, tier: "Standard", grade: "999 bars" },
  { symbol: "Pt", weightBps: 1500, tier: "Ultra Rare", grade: "9995 sponge" },
];

export const TIER_RULE =
  "Standard >= 10,000 t/yr · Rare 1,000–10,000 t/yr · Ultra Rare < 1,000 t/yr (USGS, confirm before launch)";

/**
 * Lithium decision (§3.2) — EXCLUDED at 0% for pilot. Any nonzero lithium
 * weight in code is a bug until the commodities lead clears warehouse +
 * price-feed with a signed provider. Options kept open: deep cap, LME-style
 * warrants, or swap for nickel/cobalt. See docs/decisions.md.
 */
export const LITHIUM_DECISION = {
  status: "excluded",
  weightBps: 0,
  reason:
    "~1.7t Li2CO3 per $250k reserve vs ~0.7kg gold; hygroscopic; separate humidity-controlled warehouse + second custodian/audit trail; volatile pricing; thin feeds",
  options: ["deep-cap", "lme-warrants", "swap-ni-co"],
} as const;

export const UNAVAILABLE = [
  { symbol: "Li", reason: "Warehouse + oracle pending" },
  { symbol: "Nd", reason: "Custody + price feed pending" },
  { symbol: "Dy", reason: "Custody + price feed pending" },
  { symbol: "Tb", reason: "Custody + price feed pending" },
  { symbol: "Sc", reason: "Custody + price feed pending" },
  { symbol: "U", reason: "Licensing required (BAPETEN) — not available" },
  { symbol: "Diamond", reason: "Rail B only — lot marketplace pending" },
] as const;
