import { getCanonicalAddress, ADDRESSES } from "@/lib/addresses";
import { publicClientFor } from "@/lib/scrit-evm";
import { formatUnits, parseAbiItem, type PublicClient } from "viem";

export interface DiscoveredPool {
  poolId: string;
  token0: string;
  token1: string;
  projectToken: string;
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
  statsNote?: string;
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

// Event ABIs use elementary types whose keccak matches the verified on-chain
// topics (never invent signatures):
// - Initialize topic 0xdd466e67… (matched hundreds of pools in a mainnet scan)
// - Swap topic 0x40e9cecb… (first taxed swap receipt 0x2e2b78ee…)
// - TaxCollected 0x912b8c14… (same receipt; keccak matches contract event)
// - LaunchedV4 from contracts/sCRITV4Launcher.sol
export const INITIALIZE_EVENT = parseAbiItem(
  "event Initialize(bytes32 indexed id, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address hooks, uint160 sqrtPriceX96, int24 tick)"
);
export const SWAP_EVENT = parseAbiItem(
  "event Swap(bytes32 indexed id, address indexed sender, int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee)"
);
export const TAX_EVENT = parseAbiItem(
  "event TaxCollected(bytes32 indexed poolId, address indexed currency, uint256 totalAmount, uint256 reserveAmount, uint256 operationsAmount)"
);
export const LAUNCHED_EVENT = parseAbiItem(
  "event LaunchedV4(address indexed token, address indexed creator, bytes32 indexed poolId, uint256 positionId, uint128 liquidity, uint256 tokenAmount, uint256 scritAmount)"
);

export const INITIALIZE_TOPIC =
  "0xdd466e674ea557f56295e2d0218a125ea4b4f0f6f3307b95f85e6110838d6438";
export const SWAP_TOPIC =
  "0x40e9cecb9f5f1f1c5b9c97dec2917b7ee92e57ba5563708daca94dd84ad7112f";
export const TAX_COLLECTED_TOPIC =
  "0x912b8c1494e0c6c0677cf51312981d1afcb7d22bfce3eefb81b2a94b8a6c7e29";
export const LAUNCHED_V4_TOPIC =
  "0x64a8e85d3b82d98cea1310bd2c5c6781c9a41b8a1beef3920ff9dfb364d6c494";

// Canonical hook deploy block (migrated 2026-10-08). Full-range canonical
// scan starts here — small and grows slowly.
const CANONICAL_HOOK_DEPLOY_BLOCK = 82941964n;
// Legacy windows are bounded: full history ships with the indexer.
const LEGACY_SCAN_WINDOW = 200_000n;
const LOG_CHUNK = 10_000n;
const STATS_CHUNK = 25_000n;
const STATS_CHUNK_CAP = 40;

type LogRow = {
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any;
};

async function scanEvent(
  client: PublicClient,
  req: {
    address: `0x${string}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    event: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args?: any;
    fromBlock: bigint;
    toBlock: bigint;
  }
): Promise<LogRow[]> {
  const out: LogRow[] = [];
  if (req.fromBlock > req.toBlock) return out;
  const ranges: Array<{ from: bigint; to: bigint }> = [];
  for (let s = req.fromBlock; s <= req.toBlock; s += LOG_CHUNK) {
    ranges.push({ from: s, to: s + LOG_CHUNK - 1n > req.toBlock ? req.toBlock : s + LOG_CHUNK - 1n });
  }
  const BATCH = 6;
  for (let i = 0; i < ranges.length; i += BATCH) {
    const batch = await Promise.all(
      ranges.slice(i, i + BATCH).map(async (r) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const logs = (await client
          .getLogs({
            address: req.address,
            event: req.event,
            args: req.args,
            fromBlock: r.from,
            toBlock: r.to,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any)
          .catch(() => [])) as Array<{
          blockNumber: bigint;
          transactionHash: `0x${string}`;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          args?: any;
        }>;
        return logs;
      })
    );
    for (const logs of batch) {
      for (const l of logs) {
        out.push({ blockNumber: l.blockNumber, transactionHash: l.transactionHash, args: l.args });
      }
    }
  }
  return out;
}

interface RawPool {
  poolId: string;
  token0: string;
  token1: string;
  hook: string;
  fee: number;
  createdAtBlock: bigint;
}

async function scanInitialize(
  client: PublicClient,
  poolManager: `0x${string}`,
  fromBlock: bigint,
  toBlock: bigint
): Promise<RawPool[]> {
  if (fromBlock > toBlock) return [];
  const logs = await scanEvent(client, {
    address: poolManager,
    event: INITIALIZE_EVENT,
    fromBlock,
    toBlock,
  });
  const pools: RawPool[] = [];
  const seen = new Set<string>();
  for (const l of logs) {
    const a = l.args as {
      id: string;
      currency0: string;
      currency1: string;
      fee: number;
      hooks: string;
    };
    const poolId = String(a.id).toLowerCase();
    if (seen.has(poolId)) continue;
    seen.add(poolId);
    pools.push({
      poolId,
      token0: String(a.currency0).toLowerCase(),
      token1: String(a.currency1).toLowerCase(),
      hook: String(a.hooks).toLowerCase(),
      fee: Number(a.fee),
      createdAtBlock: l.blockNumber,
    });
  }
  return pools;
}

const ERC20_META_ABI = [
  parseAbiItem("function symbol() view returns (string)"),
  parseAbiItem("function name() view returns (string)"),
  parseAbiItem("function decimals() view returns (uint8)"),
];

const metaCache = new Map<string, { symbol: string; name: string; decimals: number }>();

async function tokenMeta(
  client: PublicClient,
  token: string
): Promise<{ symbol: string; name: string; decimals: number }> {
  const key = token.toLowerCase();
  const hit = metaCache.get(key);
  if (hit) return hit;
  const fallback = { symbol: "UNKNOWN", name: "Unknown Token", decimals: 18 };
  try {
    const [symbol, name, decimals] = (await Promise.all([
      client.readContract({ address: token as `0x${string}`, abi: ERC20_META_ABI, functionName: "symbol" }).catch(() => "UNKNOWN"),
      client.readContract({ address: token as `0x${string}`, abi: ERC20_META_ABI, functionName: "name" }).catch(() => "Unknown Token"),
      client.readContract({ address: token as `0x${string}`, abi: ERC20_META_ABI, functionName: "decimals" }).catch(() => 18),
    ])) as [string, string, number];
    const meta = { symbol: String(symbol), name: String(name), decimals: Number(decimals) || 18 };
    metaCache.set(key, meta);
    return meta;
  } catch {
    return fallback;
  }
}

interface PoolStats {
  swaps: number;
  critVolume: bigint;
  fedReserve: bigint;
  taxTotal: bigint;
  note: string;
}

const statsCache = new Map<string, PoolStats & { toBlock: bigint }>();

async function poolStats(
  client: PublicClient,
  pool: RawPool,
  crit: string,
  hook: string,
  head: bigint
): Promise<PoolStats> {
  const cached = statsCache.get(pool.poolId);
  let swaps = cached?.swaps ?? 0;
  let critVolume = cached?.critVolume ?? 0n;
  let fedReserve = cached?.fedReserve ?? 0n;
  let taxTotal = cached?.taxTotal ?? 0n;
  const from = cached ? cached.toBlock + 1n : pool.createdAtBlock;
  if (from > head) {
    return { swaps, critVolume, fedReserve, taxTotal, note: cached?.note ?? "" };
  }
  // Bounded: newest pools scan fully; huge ranges are capped and labeled.
  const ranges: Array<{ from: bigint; to: bigint }> = [];
  let capped = false;
  for (let s = from; s <= head; s += STATS_CHUNK) {
    if (ranges.length >= STATS_CHUNK_CAP) {
      capped = true;
      break;
    }
    ranges.push({ from: s, to: s + STATS_CHUNK - 1n > head ? head : s + STATS_CHUNK - 1n });
  }
  const scannedTo = ranges.length > 0 ? ranges[ranges.length - 1].to : from - 1n;
  const BATCH = 5;
  const critIs0 = pool.token0 === crit;
  for (let i = 0; i < ranges.length; i += BATCH) {
    const batch = ranges.slice(i, i + BATCH);
    const [swapBatches, taxBatches] = await Promise.all([
      Promise.all(
        batch.map((r) =>
          scanEvent(client, {
            address: getCanonicalAddress("PoolManager") as `0x${string}`,
            event: SWAP_EVENT,
            args: { id: pool.poolId as `0x${string}` },
            fromBlock: r.from,
            toBlock: r.to,
          })
        )
      ),
      Promise.all(
        batch.map((r) =>
          scanEvent(client, {
            address: hook as `0x${string}`,
            event: TAX_EVENT,
            args: { poolId: pool.poolId as `0x${string}` },
            fromBlock: r.from,
            toBlock: r.to,
          })
        )
      ),
    ]);
    for (const logs of swapBatches) {
      for (const l of logs) {
        const a = l.args as { amount0: bigint; amount1: bigint };
        const critDelta = critIs0 ? BigInt(a.amount0) : BigInt(a.amount1);
        critVolume += critDelta >= 0n ? critDelta : -critDelta;
        swaps += 1;
      }
    }
    for (const logs of taxBatches) {
      for (const l of logs) {
        const a = l.args as {
          currency: string;
          totalAmount: bigint;
          reserveAmount: bigint;
        };
        taxTotal += BigInt(a.totalAmount);
        if (String(a.currency).toLowerCase() === crit) {
          fedReserve += BigInt(a.reserveAmount);
        }
      }
    }
  }
  const note = capped
    ? `stats window capped at last ${(Number(scannedTo - from) / 1e6).toFixed(1)}M blocks`
    : "full history since pool creation";
  statsCache.set(pool.poolId, { swaps, critVolume, fedReserve, taxTotal, note, toBlock: scannedTo });
  return { swaps, critVolume, fedReserve, taxTotal, note };
}

interface CursorState {
  toBlock: bigint;
  pools: Map<string, RawPool>;
  launcherToBlock: bigint;
  launchByPool: Map<string, { positionId: bigint; creator: string }>;
}

const cursors = new Map<number, CursorState>();

function cursorFor(chainId: number): CursorState {
  let c = cursors.get(chainId);
  if (!c) {
    c = { toBlock: 0n, pools: new Map(), launcherToBlock: 0n, launchByPool: new Map() };
    cursors.set(chainId, c);
  }
  return c;
}

async function launchInfo(
  client: PublicClient,
  chainId: number,
  poolId: string,
  head: bigint
): Promise<{ lpRecipient: string }> {
  const cursor = cursorFor(chainId);
  const launcher = getCanonicalAddress("sCRITV4Launcher") as `0x${string}`;
  // Canonical V4 PositionManager (Robinhood mainnet). Falls back to the
  // launch creator when the NFT lookup is unavailable.
  const pm = "0x58daec3116aae6d93017baaea7749052e8a04fa7" as `0x${string}`;
  try {
    if (cursor.launcherToBlock < head) {
      const from = cursor.launcherToBlock === 0n ? 82941994n : cursor.launcherToBlock + 1n;
      if (from <= head) {
        const logs = await scanEvent(client, {
          address: launcher,
          event: LAUNCHED_EVENT,
          fromBlock: from,
          toBlock: head,
        });
        for (const l of logs) {
          const a = l.args as { poolId: string; positionId: bigint; creator: string };
          const pid = String(a.poolId).toLowerCase();
          if (!cursor.launchByPool.has(pid)) {
            cursor.launchByPool.set(pid, {
              positionId: BigInt(a.positionId),
              creator: String(a.creator).toLowerCase(),
            });
          }
        }
      }
      cursor.launcherToBlock = head;
    }
  } catch {
    // Launcher scan is best-effort; recipient stays unresolved.
  }
  const launch = cursor.launchByPool.get(poolId.toLowerCase());
  if (!launch) {
    return { lpRecipient: "unresolved" };
  }
  try {
    const owner = (await client.readContract({
      address: pm,
      abi: [parseAbiItem("function ownerOf(uint256 tokenId) view returns (address)")],
      functionName: "ownerOf",
      args: [launch.positionId],
    })) as string;
    return { lpRecipient: owner.toLowerCase() };
  } catch {
    return { lpRecipient: launch.creator };
  }
}

async function enrichPool(
  client: PublicClient,
  chainId: number,
  pool: RawPool,
  head: bigint,
  isLegacy: boolean
): Promise<DiscoveredPool> {
  const crit = getCanonicalAddress("CRIT").toLowerCase();
  const hook = getCanonicalAddress("TradingTaxHook").toLowerCase();
  const projectToken = pool.token0 === crit ? pool.token1 : pool.token0;
  const meta = await tokenMeta(client, projectToken);
  const stats = await poolStats(client, pool, crit, hook, head);
  const { lpRecipient } = await launchInfo(client, chainId, pool.poolId, head);
  let createdAtTimestamp = 0;
  try {
    const blk = await client.getBlock({ blockNumber: pool.createdAtBlock });
    createdAtTimestamp = Number(blk.timestamp);
  } catch {
    createdAtTimestamp = 0;
  }
  return {
    poolId: pool.poolId,
    token0: pool.token0,
    token1: pool.token1,
    projectToken,
    tokenSymbol: meta.symbol,
    tokenName: meta.name,
    hook: pool.hook,
    fee: pool.fee,
    createdAtBlock: pool.createdAtBlock,
    createdAtTimestamp,
    swapCount: stats.swaps,
    critVolume: stats.critVolume,
    // Exact on-chain fee accounting beats derived math (brief §2.3).
    fedToStockpile: stats.fedReserve,
    lpRecipient,
    isLegacy,
    statsNote: stats.note,
  };
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
 * Discover stockpile-paired pools from PoolManager Initialize logs.
 * Canonical hook: full scan from hook deploy block, cursor-cached and
 * incremental afterwards. Legacy window is bounded (full legacy history
 * ships with the indexer). Ground rule: zero is a feature — an empty
 * result renders, it never throws.
 */
export async function discoverPoolsFromChain(chainId: 4663 | 46630 = 4663): Promise<DiscoveredPool[]> {
  const client = publicClientFor(chainId);
  const poolManager = getCanonicalAddress("PoolManager");
  const canonicalHook = getCanonicalAddress("TradingTaxHook").toLowerCase();
  const canonicalCrit = getCanonicalAddress("CRIT").toLowerCase();
  const legacyCrit = ADDRESSES.deprecated.sCRIT_legacy.address.toLowerCase();
  const legacyHook = ADDRESSES.deprecated.TaxHook_legacy.address.toLowerCase();
  const cursor = cursorFor(chainId);

  try {
    const head = await client.getBlockNumber();
    // Canonical range: incremental from cursor (first run starts at hook deploy).
    const canonFrom = cursor.toBlock === 0n ? CANONICAL_HOOK_DEPLOY_BLOCK : cursor.toBlock + 1n;
    if (canonFrom <= head) {
      const fresh = await scanInitialize(client, poolManager, canonFrom, head);
      for (const p of fresh) {
        const prev = cursor.pools.get(p.poolId);
        if (!prev || p.createdAtBlock < prev.createdAtBlock) cursor.pools.set(p.poolId, p);
      }
      cursor.toBlock = head;
    }
    // Legacy range: bounded recent window only.
    const legacyFrom = head > LEGACY_SCAN_WINDOW ? head - LEGACY_SCAN_WINDOW : 0n;
    const legacyPools = await scanInitialize(client, poolManager, legacyFrom, head);

    const out: DiscoveredPool[] = [];
    for (const pool of cursor.pools.values()) {
      const hookOk = pool.hook === canonicalHook;
      const touchesCrit = pool.token0 === canonicalCrit || pool.token1 === canonicalCrit;
      const touchesLegacyToken =
        pool.token0 === legacyCrit || pool.token1 === legacyCrit;
      if (hookOk && (touchesCrit || touchesLegacyToken)) {
        out.push(await enrichPool(client, chainId, pool, head, !touchesCrit));
        continue;
      }
      if (pool.hook === legacyHook && touchesLegacyToken) {
        out.push(await enrichPool(client, chainId, pool, head, true));
      }
    }
    for (const pool of legacyPools) {
      if (pool.hook !== legacyHook) continue;
      if (pool.token0 !== legacyCrit && pool.token1 !== legacyCrit) continue;
      if (cursor.pools.has(pool.poolId)) continue;
      out.push(await enrichPool(client, chainId, pool, head, true));
    }
    return out;
  } catch (err) {
    console.warn("Chain discovery read encountered error:", err);
    return [];
  }
}
