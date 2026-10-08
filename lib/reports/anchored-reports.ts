import { keccak256, toHex, stringToBytes } from "viem";

export interface AnchoredReport {
  week: number;
  fromBlock: number;
  toBlock: number;
  burn: {
    critBurned: string;
    burnTx: string;
    totalBurned: string;
  };
  treasury: {
    inflowEth: string;
    unspentEth: string;
    unspentCrit?: string;
  };
  stockpile: {
    attestedKg: string;
    totalKg: string;
    attestations: Array<{
      element: string;
      massGrams: string;
      custodian: string;
      txHash: string;
    }>;
  };
  reconciliation: {
    hookTaxCrit: string;
    treasuryReceivedCrit: string;
  };
}

export interface ReportVerification {
  week: number;
  computedHash: `0x${string}`;
  anchorTx: string;
  expectedHash: `0x${string}`;
  isValid: boolean;
  statusText: string;
}

/**
 * Recursively sort keys for canonical JSON serialization
 */
export function canonicalizeJson(obj: any): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return "[" + obj.map((item) => canonicalizeJson(item)).join(",") + "]";
  }

  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map((key) => {
    return JSON.stringify(key) + ":" + canonicalizeJson(obj[key]);
  });

  return "{" + pairs.join(",") + "}";
}

/**
 * Compute keccak256 hash of canonical JSON bytes
 */
export function hashCanonicalReport(report: AnchoredReport): `0x${string}` {
  const canonicalString = canonicalizeJson(report);
  const bytes = stringToBytes(canonicalString);
  return keccak256(toHex(bytes));
}

// Week 3 draft — every number below was observed on Robinhood Chain mainnet,
// never written from memory:
// - burns: 3 CRIT Transfer→Dead events (17,028,230.60 + 2,365,294.70 + 615,672.07)
//   found by scanning token creation (82691586) to the last burn block.
// - attestations: the only 2 PhysicalPurchaseAttested events on ReserveManager
//   (Au 1 g + 10 g demo batches, self-attested by the deployer key).
// - hook tax: 0.00 — no V4 hook pools existed in range, so no tax was possible.
// - treasury balances: unmeasured (no archive node for historical state).
export const WEEK_3_REPORT: AnchoredReport = {
  week: 3,
  fromBlock: 74475976,
  toBlock: 83022505,
  burn: {
    critBurned: "20009197.371729",
    burnTx: "0xac25ded31ecaebc08a576783a66f3fa1e49cf3b1d9e44a553db5937d8a632708",
    totalBurned: "20009197.371729",
  },
  treasury: {
    inflowEth: "0.00",
    unspentEth: "unmeasured",
    unspentCrit: "unmeasured",
  },
  stockpile: {
    attestedKg: "0.011",
    totalKg: "0.011",
    attestations: [
      {
        element: "Au",
        massGrams: "1",
        custodian: "0xCdbdc82A021071eE445d9f897433a7E4B4EAfD8d",
        txHash: "0x19652511dbd3c11ffa9aafdff989fec59a0d81b1299ab2cf47d691d747004bb2",
      },
      {
        element: "Au",
        massGrams: "10",
        custodian: "0xCdbdc82A021071eE445d9f897433a7E4B4EAfD8d",
        txHash: "0x1dbebb3dcb6e0ba759e9210bb5ab648cd3fee4fa235fe95699d71e92a65a9417",
      },
    ],
  },
  reconciliation: {
    hookTaxCrit: "0.00",
    treasuryReceivedCrit: "0.00",
  },
};

// Anchor registry: maps report week to the ON-CHAIN anchor (a team multisig
// 0-value tx carrying keccak256(canonical JSON) in calldata, or a
// ReportAnchor event). Week 3 was anchored by the migration operator
// 0x2725…81d in 0x684d…b0cec (block 83103066) — input calldata equals the
// canonical report hash below, verifiable via /verify?tx= or any explorer.
export const ANCHORED_REPORTS_REGISTRY: Record<
  number,
  {
    anchorTx: string;
    expectedHash: `0x${string}`;
    blockNumber: number;
  }
> = {
  3: {
    anchorTx: "0x684d25ec13686b47b14b20e4ecfd8bcc30c2cc78278c30065caf261f4d6b0cec",
    expectedHash: "0x45f8715091ad009b36fb218c422c1b3dd5f47c107f758499a62e1b92cebf03dd",
    blockNumber: 83103066,
  },
};

export function verifyReportHash(report: AnchoredReport): ReportVerification {
  const computedHash = hashCanonicalReport(report);
  const registryEntry = ANCHORED_REPORTS_REGISTRY[report.week];

  if (!registryEntry) {
    return {
      week: report.week,
      computedHash,
      anchorTx: "UNANCHORED",
      expectedHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
      isValid: false,
      statusText: "UNANCHORED — hash computed, awaiting team multisig anchor tx",
    };
  }

  const isValid = computedHash.toLowerCase() === registryEntry.expectedHash.toLowerCase();

  return {
    week: report.week,
    computedHash,
    anchorTx: registryEntry.anchorTx,
    expectedHash: registryEntry.expectedHash,
    isValid,
    statusText: isValid
      ? `✓ matches anchor tx ${registryEntry.anchorTx.slice(0, 10)}...`
      : "✗ EDITED AFTER ANCHORING",
  };
}
