export function calcNav(
  holdingsKg: Record<string, number>,
  pricesUsdPerKg: Record<string, number>,
  supply: bigint
): { reserveUsd: number; navUsd: number | null } {
  let reserveUsd = 0;
  for (const k of Object.keys(holdingsKg)) {
    reserveUsd += (holdingsKg[k] ?? 0) * (pricesUsdPerKg[k] ?? 0);
  }
  const navUsd = supply === 0n ? null : reserveUsd / Number(supply);
  return { reserveUsd, navUsd };
}

export function calcPremium(marketUsd: number, navUsd: number): number {
  if (!Number.isFinite(navUsd) || navUsd <= 0) return 0;
  return marketUsd / navUsd - 1;
}

export function formatUsd(n: number, digits = 2): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPct(p: number): string {
  const sign = p > 0 ? "+" : "";
  return `${sign}${(p * 100).toFixed(2)}%`;
}

export type PremiumBand = "ok" | "watch" | "alert";

/**
 * Deviation bands for the no-redemption pilot (§3.3 option C).
 * ±10% watch, ±25% alert — alert means significant deviation with no
 * arbitrageur of record.
 */
export function premiumBand(p: number): PremiumBand {
  const a = Math.abs(p);
  if (a >= 0.25) return "alert";
  if (a >= 0.1) return "watch";
  return "ok";
}
