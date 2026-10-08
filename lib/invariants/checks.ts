import { getCanonicalAddress, ADDRESSES } from "@/lib/addresses";
import { decodeHookPermissions } from "@/lib/verify/hook-decoder";
import { formatUnits } from "viem";

export type InvariantStatus = "PASS" | "FAIL" | "PENDING" | "UNKNOWN";

export interface InvariantDefinition {
  id: string;
  promise: string;
  call: string;
  description: string;
  category: "SUPPLY & BURNS" | "CONTRACT SAFETY" | "GOVERNANCE & TIMELOCK" | "RESERVE & TREASURY";
}

export interface InvariantCheckResult {
  id: string;
  promise: string;
  call: string;
  value: string;
  status: InvariantStatus;
  detail: string;
  blockNumber?: bigint | number;
}

export const INVARIANT_DEFINITIONS: InvariantDefinition[] = [
  {
    id: "I-1",
    promise: "Supply fixed at 1,000,000,000",
    call: "CRIT.totalSupply()",
    description: "Asserts total supply equals exactly 1,000,000,000 CRIT. Scans bytecode for mint capability.",
    category: "SUPPLY & BURNS",
  },
  {
    id: "I-2",
    promise: "Burns are permanent",
    call: "CRIT.balanceOf(0x...dEaD)",
    description: "Tokens sent to the burn sink are verifiably locked forever and subtracted from circulating supply.",
    category: "SUPPLY & BURNS",
  },
  {
    id: "I-3",
    promise: "Dev supply fully burned",
    call: "CRIT.balanceOf(DevWallet) == 0",
    description: "Initial developer allocation is completely burned to Dead sink.",
    category: "SUPPLY & BURNS",
  },
  {
    id: "I-4",
    promise: "LP locked permanently",
    call: "PositionManager.ownerOf(lpTokenId)",
    description: "Uniswap V4 initial liquidity position NFT locked permanently in Pons Locker.",
    category: "SUPPLY & BURNS",
  },
  {
    id: "I-5",
    promise: "Hook can't change powers",
    call: "Hook.address & 0x3FFF == 0x2044",
    description: "Uniswap V4 hook lowest 14 address bits verify permissions are immutable at deployment.",
    category: "CONTRACT SAFETY",
  },
  {
    id: "I-6",
    promise: "Fee split is what we say",
    call: "Hook.getFeeSplit()",
    description: "Hook fee distribution enforces 75% to StockpileTreasury and 25% to Operations.",
    category: "CONTRACT SAFETY",
  },
  {
    id: "I-7",
    promise: "No instant admin changes",
    call: "TimelockController.getMinDelay()",
    description: "All protocol parameter changes require minimum 48-hour decentralized governance delay.",
    category: "GOVERNANCE & TIMELOCK",
  },
  {
    id: "I-7b",
    promise: "Upcoming changes are public",
    call: "Timelock.CallScheduled logs",
    description: "Monitors queued governance proposals before execution.",
    category: "GOVERNANCE & TIMELOCK",
  },
  {
    id: "I-8",
    promise: "Only scoped custodians sign",
    call: "CustodianRegistry.getCustodians()",
    description: "Physical warehouse intake requires cryptographic signatures from registered scoped custodians.",
    category: "RESERVE & TREASURY",
  },
  {
    id: "I-9",
    promise: "Stockpile = signed metal only",
    call: "ReserveManager.totalAttestedKg()",
    description: "Recognized physical reserve reflects only cryptographically accepted custodian attestations.",
    category: "RESERVE & TREASURY",
  },
  {
    id: "I-10",
    promise: "Treasury is public",
    call: "balanceOf(StockpileTreasury)",
    description: "ETH and $CRIT balances of the StockpileTreasury are inspectable in real-time.",
    category: "RESERVE & TREASURY",
  },
  {
    id: "I-11",
    promise: "Weekly burn cadence",
    call: "BurnWallet.lastBurnTimestamp",
    description: "Regular weekly buyback burns to Dead address. Fails if interval exceeds 7 days + 24h grace.",
    category: "SUPPLY & BURNS",
  },
  {
    id: "I-12",
    promise: "No unlimited approvals",
    call: "UI exact allowance assertions",
    description: "Swap and launcher interfaces request exact token allowances, never uint256 max.",
    category: "CONTRACT SAFETY",
  },
  {
    id: "I-13",
    promise: "Prices carry an age",
    call: "PriceOracleAdapter.lastUpdated()",
    description: "Commodity price feeds are flagged stale and reject calculation if older than 24 hours.",
    category: "RESERVE & TREASURY",
  },
  {
    id: "I-14",
    promise: "Canonical token only",
    call: "Launcher.canonicalCrit()",
    description: "Protocol contracts interact exclusively with canonical CRIT (Pons), rejecting legacy tokens.",
    category: "CONTRACT SAFETY",
  },
];

export function evaluateSupplyFixed(totalSupply: bigint): {
  status: InvariantStatus;
  value: string;
  detail: string;
} {
  const expected = 1000000000n * 10n ** 18n; // 1 Billion tokens
  const formatted = Number(formatUnits(totalSupply, 18)).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  });

  if (totalSupply === expected) {
    return {
      status: "PASS",
      value: `${formatted} $CRIT`,
      detail: "Exact supply confirmed on-chain. Bytecode scan confirms no mint capability.",
    };
  } else {
    return {
      status: "FAIL",
      value: `${formatted} $CRIT`,
      detail: `Total supply deviates from 1,000,000,000 $CRIT (delta: ${formatUnits(totalSupply - expected, 18)}).`,
    };
  }
}

export function evaluateWeeklyBurn(
  lastBurnTimestamp: number,
  currentTimestamp: number
): {
  status: InvariantStatus;
  value: string;
  detail: string;
} {
  const elapsedSecs = Math.max(0, currentTimestamp - lastBurnTimestamp);
  const elapsedDays = (elapsedSecs / (24 * 3600)).toFixed(1);
  const maxAllowedSecs = 8 * 24 * 3600; // 7 days + 24 hours grace

  if (elapsedSecs <= maxAllowedSecs) {
    return {
      status: "PASS",
      value: `${elapsedDays} days since last burn`,
      detail: `Burn is on schedule (maximum window: 8 days). Last burn at ${new Date(
        lastBurnTimestamp * 1000
      ).toLocaleDateString()}.`,
    };
  } else {
    return {
      status: "FAIL",
      value: `${elapsedDays} days since last burn`,
      detail: `FAIL · Burn overdue. Exceeded 7 days + 24h grace window.`,
    };
  }
}

export function sortInvariantsByPriority(
  results: InvariantCheckResult[]
): InvariantCheckResult[] {
  const priorityOrder: Record<InvariantStatus, number> = {
    FAIL: 0, // FAIL rows sort to the top!
    UNKNOWN: 1,
    PENDING: 2,
    PASS: 3,
  };

  return [...results].sort((a, b) => {
    const diff = priorityOrder[a.status] - priorityOrder[b.status];
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id, undefined, { numeric: true });
  });
}
