/** Starter basket from Dev Brief v3 §3.1. Targets are not custody claims. */
export const COMMODITIES = ["Au", "Ag", "Pt", "Pd", "Nd", "Dy", "Tb", "Sc", "Li"] as const;
export type CommoditySymbol = (typeof COMMODITIES)[number];
export type RailBCommoditySymbol = CommoditySymbol | "Diamond";

export type BasketRow = {
  symbol: CommoditySymbol;
  name: string;
  assetClass: "Precious" | "Rare earth" | "Battery";
  weightBps: number;
  tier: "Rare" | "Standard" | "Ultra Rare";
  grade: string;
  productionReference: string;
};

export const BASKET: BasketRow[] = [
  { symbol: "Au", name: "Gold", assetClass: "Precious", weightBps: 3000, tier: "Rare", grade: "LBMA Good Delivery, 999.9", productionReference: "~3,000 t/yr" },
  { symbol: "Ag", name: "Silver", assetClass: "Precious", weightBps: 500, tier: "Standard", grade: "999 bars", productionReference: "~25,000 t/yr" },
  { symbol: "Pt", name: "Platinum", assetClass: "Precious", weightBps: 1200, tier: "Ultra Rare", grade: "9995 sponge / ingot", productionReference: "~180 t/yr" },
  { symbol: "Pd", name: "Palladium", assetClass: "Precious", weightBps: 800, tier: "Ultra Rare", grade: "9995 sponge", productionReference: "~200 t/yr" },
  { symbol: "Nd", name: "Neodymium", assetClass: "Rare earth", weightBps: 800, tier: "Standard", grade: "3N5 metal", productionReference: "~30,000 t/yr" },
  { symbol: "Dy", name: "Dysprosium", assetClass: "Rare earth", weightBps: 1200, tier: "Rare", grade: "4N metal", productionReference: "~1,200 t/yr" },
  { symbol: "Tb", name: "Terbium", assetClass: "Rare earth", weightBps: 800, tier: "Ultra Rare", grade: "4N oxide", productionReference: "~400 t/yr" },
  { symbol: "Sc", name: "Scandium", assetClass: "Rare earth", weightBps: 700, tier: "Ultra Rare", grade: "4N oxide", productionReference: "~25 t/yr" },
  { symbol: "Li", name: "Lithium", assetClass: "Battery", weightBps: 1000, tier: "Standard", grade: "Li₂CO₃, battery grade 99.5%", productionReference: "~180,000 t LCE/yr" },
];

export const COMMODITY_INDEX = Object.fromEntries(COMMODITIES.map((symbol, index) => [symbol, index])) as Record<CommoditySymbol, number>;
export const DIAMOND_INDEX = 9;
export const TIER_RULE = "Standard ≥ 10,000 t/yr · Rare 1,000–10,000 t/yr · Ultra Rare < 1,000 t/yr. Production references are order-of-magnitude estimates from the development brief; source verification is pending.";
export const TARGET_WEIGHT_TOTAL_BPS = BASKET.reduce((sum, row) => sum + row.weightBps, 0);
export const LITHIUM_DECISION = {
  status: "included-in-design-target",
  weightBps: 1000,
  reason: "Lithium is included at the 10% starter target. Industrial custody, price sourcing, and real holdings are not established by this software.",
} as const;
export const UNAVAILABLE = [
  { symbol: "U", reason: "Exploration only · nuclear-material licensing required · not in MVP" },
  { symbol: "Diamond", reason: "Rail B only · individually certified lots; never part of the index" },
] as const;

export function isCommoditySymbol(value: string): value is CommoditySymbol {
  return (COMMODITIES as readonly string[]).includes(value);
}

export const TRADING_TAX_BPS = 250;
export const RESERVE_SPLIT_BPS = 7500;
export const OPERATIONS_SPLIT_BPS = 2500;
