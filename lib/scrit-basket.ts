/** Starter basket from Revision v3.1: HREE-led narrative & copy. Targets are not custody claims. */
export const SLEEVES = [
  { id: "hree",    label: "HREE",               color: "#e2b65a" },
  { id: "magnet",  label: "Magnet & minor REE", color: "#8db4d8" },
  { id: "pgm",     label: "PGMs",               color: "#b8b8c0" },
  { id: "battery", label: "Battery",            color: "#50e3c2" },
  { id: "ballast", label: "Monetary ballast",   color: "#d9a92e" },
] as const;

export type SleeveId = (typeof SLEEVES)[number]["id"];
export type SleeveLabel = (typeof SLEEVES)[number]["label"];

export const COMMODITIES = ["Dy", "Tb", "Nd", "Sc", "Pt", "Pd", "Li", "Au", "Ag"] as const;
export type CommoditySymbol = (typeof COMMODITIES)[number];
export type RailBCommoditySymbol = CommoditySymbol | "Diamond";

export type BasketRow = {
  symbol: CommoditySymbol;
  name: string;
  sleeve: SleeveId;
  sleeveLabel: SleeveLabel;
  assetClass: SleeveLabel; // Backwards-compatible alias for existing views
  weightBps: number;
  tier: "Rare" | "Standard" | "Ultra Rare";
  grade: string;
  productionReference: string;
};

export const BASKET: BasketRow[] = [
  { symbol: "Dy", name: "Dysprosium", sleeve: "hree",    sleeveLabel: "HREE",               assetClass: "HREE",               weightBps: 2500, tier: "Rare",       grade: "4N metal",                     productionReference: "~1,200 t/yr" },
  { symbol: "Tb", name: "Terbium",    sleeve: "hree",    sleeveLabel: "HREE",               assetClass: "HREE",               weightBps: 1500, tier: "Ultra Rare", grade: "4N oxide",                     productionReference: "~400 t/yr" },
  { symbol: "Nd", name: "Neodymium",  sleeve: "magnet",  sleeveLabel: "Magnet & minor REE", assetClass: "Magnet & minor REE", weightBps: 1000, tier: "Standard",   grade: "3N5 metal",                    productionReference: "~30,000 t/yr" },
  { symbol: "Sc", name: "Scandium",   sleeve: "magnet",  sleeveLabel: "Magnet & minor REE", assetClass: "Magnet & minor REE", weightBps:  500, tier: "Ultra Rare", grade: "4N oxide",                     productionReference: "~25 t/yr" },
  { symbol: "Pt", name: "Platinum",   sleeve: "pgm",     sleeveLabel: "PGMs",               assetClass: "PGMs",               weightBps: 1000, tier: "Ultra Rare", grade: "9995 sponge / ingot",          productionReference: "~180 t/yr" },
  { symbol: "Pd", name: "Palladium",  sleeve: "pgm",     sleeveLabel: "PGMs",               assetClass: "PGMs",               weightBps:  500, tier: "Ultra Rare", grade: "9995 sponge",                  productionReference: "~200 t/yr" },
  { symbol: "Li", name: "Lithium",    sleeve: "battery", sleeveLabel: "Battery",            assetClass: "Battery",            weightBps:  500, tier: "Standard",   grade: "Li₂CO₃, battery grade 99.5%",   productionReference: "~180,000 t LCE/yr" },
  { symbol: "Au", name: "Gold",       sleeve: "ballast", sleeveLabel: "Monetary ballast",   assetClass: "Monetary ballast",   weightBps: 2000, tier: "Rare",       grade: "LBMA Good Delivery, 999.9",    productionReference: "~3,000 t/yr" },
  { symbol: "Ag", name: "Silver",     sleeve: "ballast", sleeveLabel: "Monetary ballast",   assetClass: "Monetary ballast",   weightBps:  500, tier: "Standard",   grade: "999 bars",                     productionReference: "~25,000 t/yr" },
];

export const COMMODITY_INDEX = Object.fromEntries(COMMODITIES.map((symbol, index) => [symbol, index])) as Record<CommoditySymbol, number>;
export const DIAMOND_INDEX = 9;
export const TIER_RULE = "Standard ≥ 10,000 t/yr · Rare 1,000–10,000 t/yr · Ultra Rare < 1,000 t/yr. Production references are order-of-magnitude estimates from the development brief; source verification is pending.";
export const TARGET_WEIGHT_TOTAL_BPS = BASKET.reduce((sum, row) => sum + row.weightBps, 0);

if (TARGET_WEIGHT_TOTAL_BPS !== 10000) {
  throw new Error(`Basket weights must sum to 10000 bps (100%), got ${TARGET_WEIGHT_TOTAL_BPS}`);
}

export const LITHIUM_DECISION = {
  status: "included-in-design-target",
  weightBps: 500,
  reason: "Lithium is included at the 5% starter target. Industrial custody, price sourcing, and real holdings are not established by this software.",
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
