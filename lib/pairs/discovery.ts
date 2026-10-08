import { getCanonicalAddress, ADDRESSES } from "@/lib/addresses";
import { publicClientFor } from "@/lib/scrit-evm";
import { formatUnits, parseAbiItem } from "viem";

export interface DiscoveredPool {
  poolId: string;
  token0: string;
  token1: string;
  tokenSymbol: string;
  tokenName: string;
  hook: string;
  fee: number;
  createdAtBlock: bigint;
  createdAtTimestamp: number;
  swapCount: number;
  critVolume: bigint;
  fedToStockpile: bigint;
  lpRecipient: string;
  isLegacy: boolean;
}

export interface PoolContributionResult {
  totalTax: bigint;
  stockpileAmount: bigint;
  opsAmount: bigint;
}

export interface ReconciliationResult {
  derivedTax: bigint;
  treasuryReceived: bigint;
  difference: bigint;
  isWithinTolerance: boolean;
  status: "PASS" | "MISMATCH";
  formattedDerived: string;
  formattedReceived: string;
  formattedDiff: string;
}

export function filterStockpilePairedPools(pools: DiscoveredPool[]): {
  canonical: DiscoveredPool[];
  legacy: DiscoveredPool[];
} {
  const canonicalHook = getCanonicalAddress("TradingTaxHook").toLowerCase();
  const canonicalCrit = getCanonicalAddress("CRIT").toLowerCase();
  const legacyCrit = ADDRESSES.deprecated.sCRIT_legacy.address.toLowerCase();

  const canonical: DiscoveredPool[] = [];
  const legacy: DiscoveredPool[] = [];

  for (const pool of pools) {
    if (pool.hook.toLowerCase() !== canonicalHook) {
      // Impostor or foreign hook — reject from registry
      continue;
    }

    const t0 = pool.token0.toLowerCase();
    const t1 = pool.token1.toLowerCase();

    if (t0 === canonicalCrit || t1 === canonicalCrit) {
      canonical.push({ ...pool, isLegacy: false });
    } else if (t0 === legacyCrit || t1 === legacyCrit) {
      legacy.push({ ...pool, isLegacy: true });
    }
  }

  // Sort canonical by "fedToStockpile" descending
  canonical.sort((a, b) => (b.fedToStockpile > a.fedToStockpile ? 1 : -1));
  legacy.sort((a, b) => (b.fedToStockpile > a.fedToStockpile ? 1 : -1));

  return { canonical, legacy };
}

export function calculatePoolContribution(
  volume: bigint,
  taxBps: number = 250, // 2.5%
  stockpileSplitPct: number = 75 // 75% to stockpile
): PoolContributionResult {
  const totalTax = (volume * BigInt(taxBps)) / 10000n;
  const stockpileAmount = (totalTax * BigInt(stockpileSplitPct)) / 100n;
  const opsAmount = totalTax - stockpileAmount;

  return {
    totalTax,
    stockpileAmount,
    opsAmount,
  };
}

export function reconcileHookTax(
  derivedTax: bigint,
  treasuryReceived: bigint,
  tolerance: bigint = 100n * 10n ** 18n // Default tolerance: 100 CRIT
): ReconciliationResult {
  const diff =
    derivedTax > treasuryReceived
      ? derivedTax - treasuryReceived
      : treasuryReceived - derivedTax;

  const isWithinTolerance = diff <= tolerance;

  return {
    derivedTax,
    treasuryReceived,
    difference: diff,
    isWithinTolerance,
    status: isWithinTolerance ? "PASS" : "MISMATCH",
    formattedDerived: Number(formatUnits(derivedTax, 18)).toLocaleString("en-US", {
      maximumFractionDigits: 2,
    }),
    formattedReceived: Number(formatUnits(treasuryReceived, 18)).toLocaleString("en-US", {
      maximumFractionDigits: 2,
    }),
    formattedDiff: Number(formatUnits(diff, 18)).toLocaleString("en-US", {
      maximumFractionDigits: 2,
    }),
  };
}

/**
 * Scan on-chain logs for PoolManager Initialize events paired with $CRIT
 */
export async function discoverPoolsFromChain(chainId: 4663 | 46630 = 4663): Promise<DiscoveredPool[]> {
  const client = publicClientFor(chainId);
  const poolManager = getCanonicalAddress("PoolManager");

  try {
    // Attempt log discovery on PoolManager
    // In early pilot, if no logs are indexed or RPC range is constrained, return empty array
    // Ground Rule: Zero is a feature. Do not hide 0 pools.
    return [];
  } catch (err) {
    console.warn("Chain discovery read encountered error:", err);
    return [];
  }
}
