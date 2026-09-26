export const MASS_DECIMALS = 12n;
export const USD_DECIMALS = 8n;
export const TOKEN_DECIMALS = 18n;
const MASS_SCALE = 10n ** MASS_DECIMALS;
const USD_SCALE = 10n ** USD_DECIMALS;
const TOKEN_SCALE = 10n ** TOKEN_DECIMALS;

/** Convert kg with 12 decimals and USD/kg with 8 decimals into USD with 8 decimals. */
export function reserveValueUsdE8(massKgE12: bigint, priceUsdPerKgE8: bigint): bigint {
  if (massKgE12 <= 0n || priceUsdPerKgE8 <= 0n) throw new Error("invalid_reserve_input");
  return massKgE12 * priceUsdPerKgE8 / MASS_SCALE;
}

/**
 * Mint newly received reserve value at current NAV. First accepted batch bootstraps
 * at $1/token; this is a valuation convention, not a peg or redemption promise.
 */
export function calculateMintAtNav(
  addedReserveUsdE8: bigint,
  currentReserveUsdE8: bigint,
  currentSupplyE18: bigint,
): bigint {
  if (addedReserveUsdE8 <= 0n) throw new Error("zero_reserve_value");
  if (currentSupplyE18 === 0n && currentReserveUsdE8 === 0n) {
    return addedReserveUsdE8 * (TOKEN_SCALE / USD_SCALE);
  }
  if (currentSupplyE18 <= 0n || currentReserveUsdE8 <= 0n) {
    throw new Error("inconsistent_reserve_state");
  }
  return addedReserveUsdE8 * currentSupplyE18 / currentReserveUsdE8;
}

export function isPriceFresh(updatedAtSeconds: bigint, nowSeconds: bigint, maxAgeSeconds = 86_400n): boolean {
  return updatedAtSeconds > 0n && updatedAtSeconds <= nowSeconds && nowSeconds - updatedAtSeconds <= maxAgeSeconds;
}
