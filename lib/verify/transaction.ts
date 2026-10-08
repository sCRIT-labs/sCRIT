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

// ERC20 Transfer(address,address,uint256)
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

// Uniswap v4 PoolManager topics
// Initialize(PoolId id, Currency currency0, Currency currency1, uint24 fee, int24 tickSpacing, IHooks hooks)
const INITIALIZE_TOPIC = "0x409540c49eb9f8845e2bf102f64f40f09805d762f0fcfc3175c58a8a9bc6f23b";
// Swap(PoolId id, address sender, int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee)
const SWAP_TOPIC = "0x40e4533e429ff6d45ed7e188265a78125642a8a863ec32ff00078db0f269a9ff";

// TimelockController topics
// CallScheduled(bytes32 id, uint256 index, address target, uint256 value, bytes data, bytes32 predecessor, uint256 delay)
const CALL_SCHEDULED_TOPIC = "0xd8aa0f3194971a2a116679f7c2090f6939c8d4e01a2a8d7e41d55e5351469e63";
// CallExecuted(bytes32 id, uint256 index, address target, uint256 value, bytes data)
const CALL_EXECUTED_TOPIC = "0x3bf937a06019a8684d2847c25140f0c088325a74e54e4df9193231d62c3e1e55";

// ReserveManager: AttestationAccepted(bytes32 digest, address indexed custodian, string element, uint256 massGrams, uint256 nonce)
const ATTESTATION_ACCEPTED_TOPIC = "0x9810ad9efce022066fa5a85ae7e6a6be963bb4446b025d57b16d123a669bc052";

export function classifyReceiptLogs(logs: DecodedLog[]): ClassifiedTransaction {
  const canonicalCrit = getCanonicalAddress("CRIT").toLowerCase();
  const canonicalDead = getCanonicalAddress("Dead").toLowerCase();
  const canonicalHook = getCanonicalAddress("TradingTaxHook").toLowerCase();
  const canonicalTimelock = getCanonicalAddress("TimelockController").toLowerCase();
  const canonicalReserveManager = getCanonicalAddress("ReserveManager").toLowerCase();

  for (const log of logs) {
    const logAddr = log.address.toLowerCase();
    const topic0 = log.topics?.[0]?.toLowerCase();

    // 1. Check for Burn ($CRIT Transfer -> Dead)
    if (logAddr === canonicalCrit && topic0 === TRANSFER_TOPIC) {
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
