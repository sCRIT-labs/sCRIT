export const V4_MAINNET_STATE_VIEW = "0xf3334192d15450cdd385c8b70e03f9a6bd9e673b" as const;
export const V4_BASE_POOL_FEE = 3_000;
export const V4_BASE_POOL_TICK_SPACING = 60;

const Q192 = 1n << 192n;
const ONE_ETHER = 10n ** 18n;

/** Convert the V4 native-ETH/sCRIT pool price (currency1 per currency0) to ETH per sCRIT. */
export function ethPerScritFromSqrtPrice(sqrtPriceX96: bigint, scritDecimals: number): number {
  if (sqrtPriceX96 <= 0n || !Number.isInteger(scritDecimals) || scritDecimals < 0 || scritDecimals > 36) return 0;
  const sqrtSquared = sqrtPriceX96 * sqrtPriceX96;
  const tokenScale = 10n ** BigInt(scritDecimals);
  const ethScale = ONE_ETHER;
  const ethPerScritE18 = (Q192 * tokenScale * ONE_ETHER) / (sqrtSquared * ethScale);
  return Number(ethPerScritE18) / Number(ONE_ETHER);
}

export function marketPriceUsd(ethPerScrit: number, ethUsd: number): number | null {
  if (!Number.isFinite(ethPerScrit) || ethPerScrit <= 0 || !Number.isFinite(ethUsd) || ethUsd <= 0) return null;
  const value = ethPerScrit * ethUsd;
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function calcPremiumPercent(marketUsd: number, navUsd: number): number | null {
  if (!Number.isFinite(marketUsd) || marketUsd <= 0 || !Number.isFinite(navUsd) || navUsd <= 0) return null;
  return (marketUsd / navUsd - 1) * 100;
}
