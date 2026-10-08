import { formatUnits } from "viem";
import { getCanonicalAddress } from "@/lib/addresses";

export interface DecodedLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber?: bigint | number;
}

export interface ClassifiedTransaction {
  classification:
    | "Burn"
    | "Rail A swap"
    | "Rail A launch"
    | "Attestation accepted"
    | "Governance"
    | "Unknown";
  summary: string;
  details: Record<string, any>;
  rawLogsCount: number;
}

// ERC20 Transfer(address,address,uint256) — standard topic. Robinhood Chain
// tokens issued here (Pons CRIT, legacy sCRIT, PDMO) emit a chain-observed
// variant ending ...523b3ef (verified across 2000+ logs and the first taxed
// swap receipt). Accept both so pasted burns classify either way.
export const TRANSFER_TOPIC_STD =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df288b6ed";
export const TRANSFER_TOPIC_CHAIN =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

// Uniswap v4 PoolManager topics (verified against mainnet receipts/logs).
// Initialize(PoolId id, Currency currency0, Currency currency1, uint24 fee,
//   int24 tickSpacing, IHooks hooks, uint160 sqrtPriceX96, int24 tick)
export const INITIALIZE_TOPIC =
  "0xdd466e674ea557f56295e2d0218a125ea4b4f0f6f3307b95f85e6110838d6438";
// Swap(PoolId id, address sender, int128 amount0, int128 amount1,
//   uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee).
// Verified on first taxed swap 0x2e2b78ee… (block 74493182).
export const SWAP_TOPIC =
  "0x40e9cecb9f5f1f1c5b9c97dec2917b7ee92e57ba5563708daca94dd84ad7112f";

// TradingTaxHook TaxCollected(bytes32 indexed poolId, address indexed currency,
//   uint256 totalAmount, uint256 reserveAmount, uint256 operationsAmount).
// Verified on first taxed swap receipt; keccak matches contract event.
export const TAX_COLLECTED_TOPIC =
  "0x912b8c1494e0c6c0677cf51312981d1afcb7d22bfce3eefb81b2a94b8a6c7e29";
// TimelockController topics from @openzeppelin/contracts 5.4.0 source:
// CallScheduled(bytes32 id, uint256 index, address target, uint256 value,
//   bytes data, bytes32 predecessor, uint256 delay)
export const CALL_SCHEDULED_TOPIC =
  "0x4cf4410cc57040e44862ef0f45f3dd5a5e02db8eb8add648d4b0e236f1d07dca";
// CallExecuted(bytes32 id, uint256 index, address target, uint256 value, bytes data)
export const CALL_EXECUTED_TOPIC =
  "0xc2617efa69bab66782fa219543714338489c4e9e178271560a91b82c3f612b58";

// ReserveManager PhysicalPurchaseAttested(bytes32 indexed batchId,
//   uint8 indexed commodity, uint256 massKgE12, bytes32 certificateHash,
//   address indexed custodian). Topic computed from contracts/ReserveManager.sol.
export const ATTESTATION_ACCEPTED_TOPIC =
  "0xde5cbfcc85918ae965a4a37a98d4efe3b8f07d7d9c05f4df5c0af2b7ca88ce3c";

function splitWords(data: string): string[] {
  const hex = (data || "0x").replace(/^0x/, "");
  const words: string[] = [];
  for (let i = 0; i + 64 <= hex.length; i += 64) {
    words.push(`0x${hex.slice(i, i + 64)}`);
  }
  return words;
}

export function classifyReceiptLogs(logs: DecodedLog[]): ClassifiedTransaction {  const canonicalCrit = getCanonicalAddress("CRIT").toLowerCase();
  const canonicalDead = getCanonicalAddress("Dead").toLowerCase();
  const canonicalHook = getCanonicalAddress("TradingTaxHook").toLowerCase();
  const canonicalTimelock = getCanonicalAddress("TimelockController").toLowerCase();
  const canonicalReserveManager = getCanonicalAddress("ReserveManager").toLowerCase();

  for (const log of logs) {
    const logAddr = log.address.toLowerCase();
    const topic0 = log.topics?.[0]?.toLowerCase();

    // 1. Check for Burn ($CRIT Transfer -> Dead)
    if (
      logAddr === canonicalCrit &&
      (topic0 === TRANSFER_TOPIC_STD || topic0 === TRANSFER_TOPIC_CHAIN)
    ) {
      const toHex = log.topics[2];
      if (toHex) {
        const toAddress = `0x${toHex.slice(26)}`.toLowerCase();
        if (toAddress === canonicalDead) {
          const fromAddress = `0x${log.topics[1]?.slice(26) || ""}`;
          const amountRaw = BigInt(log.data || "0x0");
          const amountFormatted = Number(formatUnits(amountRaw, 18)).toLocaleString("en-US", {
            maximumFractionDigits: 2,
          });
          const blockStr = log.blockNumber ? ` in block ${log.blockNumber}` : "";

          return {
            classification: "Burn",
            summary: `${amountFormatted} $CRIT sent to 0x...dEaD${blockStr}. These tokens can never move again.`,
            details: {
              token: "CRIT",
              amount: amountFormatted,
              amountRaw: amountRaw.toString(),
              from: fromAddress,
              to: getCanonicalAddress("Dead"),
              blockNumber: log.blockNumber?.toString(),
            },
            rawLogsCount: logs.length,
          };
        }
      }
    }

    // 2. Check for Attestation Accepted
    if (logAddr === canonicalReserveManager || topic0 === ATTESTATION_ACCEPTED_TOPIC) {
      return {
        classification: "Attestation accepted",
        summary: "Physical warehouse attestation cryptographically accepted on-chain by ReserveManager.",
        details: {
          reserveManager: log.address,
          topic: topic0,
          data: log.data,
        },
        rawLogsCount: logs.length,
      };
    }

    // 2b. Check for hook TaxCollected (exact on-chain fee accounting)
    if (topic0 === TAX_COLLECTED_TOPIC) {
      const words = splitWords(log.data);
      const total = words.length > 0 ? BigInt(words[0]) : 0n;
      const reserve = words.length > 1 ? BigInt(words[1]) : 0n;
      const ops = words.length > 2 ? BigInt(words[2]) : 0n;
      const fmt = (v: bigint) =>
        Number(formatUnits(v, 18)).toLocaleString("en-US", { maximumFractionDigits: 2 });
      return {
        classification: "Rail A swap",
        summary: `Hook tax collected: ${fmt(total)} (75% → ${fmt(reserve)} stockpile, 25% → ${fmt(ops)} ops).`,
        details: {
          poolManager: log.address,
          hook: canonicalHook,
          poolId: log.topics[1],
          currency: log.topics[2] ? `0x${log.topics[2].slice(26)}` : undefined,
          totalTax: total.toString(),
          reserveAmount: reserve.toString(),
          opsAmount: ops.toString(),
          blockNumber: log.blockNumber?.toString(),
        },
        rawLogsCount: logs.length,
      };
    }

    // 3. Check for Rail A Swap (Uniswap V4 Swap involving hook)
    if (topic0 === SWAP_TOPIC) {
      return {
        classification: "Rail A swap",
        summary: "Uniswap V4 pool swap executed through TradingTaxHook. 2.5% tax assessed with 75% routing to StockpileTreasury.",
        details: {
          poolManager: log.address,
          hook: canonicalHook,
          topic: topic0,
        },
        rawLogsCount: logs.length,
      };
    }

    // 4. Check for Rail A Launch (Uniswap V4 Initialize)
    if (topic0 === INITIALIZE_TOPIC) {
      return {
        classification: "Rail A launch",
        summary: "New Rail A project pair initialized on Uniswap V4 with canonical 0x2044 TradingTaxHook.",
        details: {
          poolManager: log.address,
          hook: canonicalHook,
          topic: topic0,
        },
        rawLogsCount: logs.length,
      };
    }

    // 5. Check for Governance (TimelockController)
    if (
      logAddr === canonicalTimelock ||
      topic0 === CALL_SCHEDULED_TOPIC ||
      topic0 === CALL_EXECUTED_TOPIC
    ) {
      const isExecuted = topic0 === CALL_EXECUTED_TOPIC;
      return {
        classification: "Governance",
        summary: isExecuted
          ? "Timelock governance call executed on-chain."
          : "Timelock governance call scheduled with mandatory timelock delay.",
        details: {
          timelock: log.address,
          action: isExecuted ? "CallExecuted" : "CallScheduled",
          topic: topic0,
        },
        rawLogsCount: logs.length,
      };
    }
  }

  // Fallback
  return {
    classification: "Unknown",
    summary: "Not an identified sCRIT protocol transaction.",
    details: {
      logCount: logs.length,
      firstLogAddress: logs[0]?.address,
    },
    rawLogsCount: logs.length,
  };
}
