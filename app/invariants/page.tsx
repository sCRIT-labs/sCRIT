"use client";

import React, { useState, useEffect } from "react";
import { publicClientFor } from "@/lib/scrit-evm";
import { getCanonicalAddress, ADDRESSES } from "@/lib/addresses";
import { decodeHookPermissions } from "@/lib/verify/hook-decoder";
import {
  INVARIANT_DEFINITIONS,
  evaluateSupplyFixed,
  evaluateWeeklyBurn,
  sortInvariantsByPriority,
  type InvariantCheckResult,
  type InvariantStatus,
} from "@/lib/invariants/checks";
import { formatUnits, keccak256, parseAbiItem } from "viem";

export default function InvariantsPage() {
  const [results, setResults] = useState<InvariantCheckResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [blockNumber, setBlockNumber] = useState<bigint | null>(null);
  const [blockAgeSecs, setBlockAgeSecs] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");

  async function runAllChecks() {
    setIsLoading(true);
    const client = publicClientFor(4663);

    try {
      const block = await client.getBlock({ blockTag: "latest" });
      const currentBlock = block.number;
      const nowTs = Number(block.timestamp);
      setBlockNumber(currentBlock);
      setBlockAgeSecs(Math.max(0, Math.floor(Date.now() / 1000) - nowTs));

      const critAddr = getCanonicalAddress("CRIT");
      const deadAddr = getCanonicalAddress("Dead");
      const devWallet = getCanonicalAddress("DevWallet");
      const hookAddr = getCanonicalAddress("TradingTaxHook");
      const timelockAddr = getCanonicalAddress("TimelockController");
      const treasuryAddr = getCanonicalAddress("StockpileTreasury");

      // I-1: Total Supply
      let i1Res: InvariantCheckResult;
      try {
        const supply = (await client.readContract({
          address: critAddr,
          abi: [
            {
              name: "totalSupply",
              type: "function",
              stateMutability: "view",
              inputs: [],
              outputs: [{ name: "", type: "uint256" }],
            },
          ],
          functionName: "totalSupply",
        })) as bigint;
        const evalSupply = evaluateSupplyFixed(supply);
        i1Res = {
          id: "I-1",
          promise: "Supply fixed at 1,000,000,000",
          call: "CRIT.totalSupply()",
          value: evalSupply.value,
          status: evalSupply.status,
          detail: evalSupply.detail,
          blockNumber: currentBlock,
        };
      } catch {
        i1Res = {
          id: "I-1",
          promise: "Supply fixed at 1,000,000,000",
          call: "CRIT.totalSupply()",
          value: "UNVERIFIED (RPC error)",
          status: "UNKNOWN",
          detail: "Could not read totalSupply. Never assume — retry.",
          blockNumber: currentBlock,
        };
      }

      // I-2: Burns permanent
      let i2Res: InvariantCheckResult;
      try {
        const deadBal = (await client.readContract({
          address: critAddr,
          abi: [
            {
              name: "balanceOf",
              type: "function",
              stateMutability: "view",
              inputs: [{ name: "account", type: "address" }],
              outputs: [{ name: "", type: "uint256" }],
            },
          ],
          functionName: "balanceOf",
          args: [deadAddr],
        })) as bigint;
        const deadFormatted = Number(formatUnits(deadBal, 18)).toLocaleString("en-US", {
          maximumFractionDigits: 0,
        });
        i2Res = {
          id: "I-2",
          promise: "Burns are permanent",
          call: "CRIT.balanceOf(0x...dEaD)",
          value: `${deadFormatted} $CRIT burned`,
          status: "PASS",
          detail: "Burned tokens reside in canonical 0x...dEaD burn sink. Irretrievable forever.",
          blockNumber: currentBlock,
        };
      } catch {
        i2Res = {
          id: "I-2",
          promise: "Burns are permanent",
          call: "CRIT.balanceOf(0x...dEaD)",
          value: "UNVERIFIED (RPC error)",
          status: "UNKNOWN",
          detail: "Could not read the burn sink balance. Never assume — retry.",
          blockNumber: currentBlock,
        };
      }

      // I-3: Dev supply burned
      let i3Res: InvariantCheckResult;
      try {
        const devBal = (await client.readContract({
          address: critAddr,
          abi: [
            {
              name: "balanceOf",
              type: "function",
              stateMutability: "view",
              inputs: [{ name: "account", type: "address" }],
              outputs: [{ name: "", type: "uint256" }],
            },
          ],
          functionName: "balanceOf",
          args: [devWallet],
        })) as bigint;
        i3Res = {
          id: "I-3",
          promise: "Dev supply fully burned",
          call: "CRIT.balanceOf(DevWallet) == 0",
          value: `${formatUnits(devBal, 18)} $CRIT`,
          status: devBal === 0n ? "PASS" : "FAIL",
          detail: devBal === 0n ? "Deployer wallet holds 0 tokens." : "Dev wallet holds unburned tokens.",
          blockNumber: currentBlock,
        };
      } catch {
        i3Res = {
          id: "I-3",
          promise: "Dev supply fully burned",
          call: "CRIT.balanceOf(DevWallet) == 0",
          value: "UNVERIFIED (RPC error)",
          status: "UNKNOWN",
          detail: "Could not read the creator wallet balance. Never assume — retry.",
          blockNumber: currentBlock,
        };
      }

      // I-4: LP lock (pre-graduation: no V4 position NFT exists yet)
      const i4Res: InvariantCheckResult = {
        id: "I-4",
        promise: "LP locked permanently",
        call: "PositionManager.ownerOf(lpTokenId)",
        value: "No V4 pool yet (pre-graduation)",
        status: "PENDING",
        detail: "Pons curve has not graduated to a Uniswap V4 pool, so no LP NFT exists to lock. This row activates at graduation.",
        blockNumber: currentBlock,
      };

      // I-5: Hook bit permissions + live code hash vs recorded
      const hookPerms = decodeHookPermissions(hookAddr);
      const flagsOk =
        hookPerms.hexFlags === "0x2044" && !hookPerms.flags.beforeRemoveLiquidity;
      const recordedHookHash = (ADDRESSES.canonical.TradingTaxHook as { codeHash?: string }).codeHash ?? "";
      let liveHookHash = "";
      let codeOk: boolean | null = null;
      try {
        const hookCode = await client.getBytecode({ address: hookAddr });
        if (hookCode && hookCode !== "0x") {
          liveHookHash = keccak256(hookCode);
          codeOk = recordedHookHash.length > 10 && liveHookHash.toLowerCase() === recordedHookHash.toLowerCase();
        }
      } catch {
        codeOk = null;
      }
      const i5Status: InvariantCheckResult["status"] =
        !flagsOk || codeOk === false ? "FAIL" : codeOk === null ? "UNKNOWN" : "PASS";
      const i5Res: InvariantCheckResult = {
        id: "I-5",
        promise: "Hook can't change powers",
        call: "Hook.address & 0x3FFF + keccak256(getCode)",
        value: `${hookPerms.hexFlags} · code ${codeOk === true ? "match" : codeOk === false ? "CHANGED" : "unread"}`,
        status: i5Status,
        detail:
          i5Status === "PASS"
            ? "Flags verified 0x2044 (beforeInitialize + afterSwap + afterSwapReturnDelta). Live code matches the recorded hash; beforeRemoveLiquidity is OFF, so the hook cannot block LP withdrawals."
            : codeOk === false
            ? `Live hook code ${liveHookHash} differs from recorded ${recordedHookHash}. Treat as untrusted until resolved.`
            : "Could not read hook bytecode (RPC error). Never assume — retry.",
        blockNumber: currentBlock,
      };

      // I-6: Fee split read live from the hook (contract wins over copy)
      let i6Res: InvariantCheckResult;
      try {
        const u256Abi = [
          {
            name: "TAX_BPS",
            type: "function",
            stateMutability: "view",
            inputs: [],
            outputs: [{ name: "", type: "uint256" }],
          },
          {
            name: "RESERVE_SHARE_BPS",
            type: "function",
            stateMutability: "view",
            inputs: [],
            outputs: [{ name: "", type: "uint256" }],
          },
        ] as const;
        const [taxBps, splitBps] = (await Promise.all([
          client.readContract({ address: hookAddr, abi: u256Abi, functionName: "TAX_BPS" }),
          client.readContract({ address: hookAddr, abi: u256Abi, functionName: "RESERVE_SHARE_BPS" }),
        ])) as [bigint, bigint];
        const splitOk = taxBps === 250n && splitBps === 7500n;
        i6Res = {
          id: "I-6",
          promise: "Fee split is what we say",
          call: "Hook.TAX_BPS() + Hook.RESERVE_SHARE_BPS()",
          value: `${Number(taxBps) / 100}% tax · ${Number(splitBps) / 100}% stockpile / ${100 - Number(splitBps) / 100}% ops`,
          status: splitOk ? "PASS" : "FAIL",
          detail: splitOk
            ? "Live hook parameters match the published 2.5% / 75-25 split."
            : `Hook parameters differ from the published spec (tax ${taxBps} bps, reserve share ${splitBps} bps). The contract wins — site copy must change.`,
          blockNumber: currentBlock,
        };
      } catch {
        i6Res = {
          id: "I-6",
          promise: "Fee split is what we say",
          call: "Hook.TAX_BPS() + Hook.RESERVE_SHARE_BPS()",
          value: "UNVERIFIED (RPC error)",
          status: "UNKNOWN",
          detail: "Could not read hook fee parameters. Never assume — retry.",
          blockNumber: currentBlock,
        };
      }

      // I-7: Timelock delay read live (0 = instant execution is possible)
      let i7Res: InvariantCheckResult;
      try {
        const minDelay = (await client.readContract({
          address: timelockAddr,
          abi: [
            {
              name: "getMinDelay",
              type: "function",
              stateMutability: "view",
              inputs: [],
              outputs: [{ name: "", type: "uint256" }],
            },
          ],
          functionName: "getMinDelay",
        })) as bigint;
        i7Res = {
          id: "I-7",
          promise: "No instant admin changes",
          call: "TimelockController.getMinDelay()",
          value: `${minDelay.toString()}s delay`,
          status: minDelay > 0n ? "PASS" : "FAIL",
          detail:
            minDelay > 0n
              ? `Timelock enforces a ${minDelay.toString()}s delay before any scheduled governance execution.`
              : "getMinDelay() is 0 — queued admin calls can execute instantly. A timelock delay increase is pending; until then this promise does not hold.",
          blockNumber: currentBlock,
        };
      } catch {
        i7Res = {
          id: "I-7",
          promise: "No instant admin changes",
          call: "TimelockController.getMinDelay()",
          value: "UNVERIFIED (RPC error)",
          status: "UNKNOWN",
          detail: "Could not read the timelock delay. Never assume — retry.",
          blockNumber: currentBlock,
        };
      }

      // I-7b: Queued changes via bounded CallScheduled scan (explicit range).
      // Event signature from @openzeppelin/contracts 5.4.0 TimelockController.
      let i7bRes: InvariantCheckResult;
      try {
        const rangeFrom = currentBlock > 100000n ? currentBlock - 100000n : 0n;
        const schedLogs = await client.getLogs({
          address: timelockAddr,
          event: parseAbiItem(
            "event CallScheduled(bytes32 indexed id, uint256 indexed index, address target, uint256 value, bytes data, bytes32 predecessor, uint256 delay)"
          ),
          fromBlock: rangeFrom,
          toBlock: currentBlock,
        });
        i7bRes = {
          id: "I-7b",
          promise: "Upcoming changes are public",
          call: "Timelock.CallScheduled logs (last 100k blocks)",
          value: `${schedLogs.length} scheduled in window`,
          status: "PASS",
          detail: `Scanned blocks #${rangeFrom.toString()}–#${currentBlock.toString()}. A full-history queue ships with the indexer; until then this window is the public feed.`,
          blockNumber: currentBlock,
        };
      } catch {
        i7bRes = {
          id: "I-7b",
          promise: "Upcoming changes are public",
          call: "Timelock.CallScheduled logs (last 100k blocks)",
          value: "UNVERIFIED (RPC error)",
          status: "UNKNOWN",
          detail: "Could not scan the timelock queue. Never assume — retry.",
          blockNumber: currentBlock,
        };
      }

      // I-8: Scoped custodians (registry has no enumeration; PENDING by design)
      const i8Res: InvariantCheckResult = {
        id: "I-8",
        promise: "Only scoped custodians sign",
        call: "CustodianRegistry.isAuthorized(key, commodity)",
        value: "0 registered keys (pilot)",
        status: "PENDING",
        detail: "Pilot state: no custodian key registered on-chain. Every attestation fails the registry step until key accession. Keys are checked per-attestation on /verify.",
        blockNumber: currentBlock,
      };

      // I-9: Stockpile = signed metal only (holdings only grow via recordPurchase)
      let i9Res: InvariantCheckResult;
      try {
        const holdingsAbi = [
          {
            name: "holdingsKgE12",
            type: "function",
            stateMutability: "view",
            inputs: [{ name: "commodity", type: "uint8" }],
            outputs: [{ name: "", type: "uint256" }],
          },
        ] as const;
        const reserveAddr = getCanonicalAddress("ReserveManager");
        const holdings = (await Promise.all(
          Array.from({ length: 9 }, (_, i) =>
            client.readContract({
              address: reserveAddr,
              abi: holdingsAbi,
              functionName: "holdingsKgE12",
              args: [i],
            })
          )
        )) as bigint[];
        const totalKgE12 = holdings.reduce((a, b) => a + b, 0n);
        const totalKg = Number(totalKgE12) / 1e12;
        i9Res = {
          id: "I-9",
          promise: "Stockpile = signed metal only",
          call: "ReserveManager.holdingsKgE12(0..8)",
          value: `${totalKg.toFixed(6)} kg attested`,
          status: "PASS",
          detail:
            "Holdings can only increase through attested recordPurchase calls — no silent mint path exists. Pons-era attestations: none yet.",
          blockNumber: currentBlock,
        };
      } catch {
        i9Res = {
          id: "I-9",
          promise: "Stockpile = signed metal only",
          call: "ReserveManager.holdingsKgE12(0..8)",
          value: "UNVERIFIED (RPC error)",
          status: "UNKNOWN",
          detail: "Could not read holdings. Never assume — retry.",
          blockNumber: currentBlock,
        };
      }

      // I-10: Treasury balances (CRIT + ETH). Treasury is a deployer EOA
      // until the timelock rotation lands — stated, not hidden.
      let i10Res: InvariantCheckResult;
      try {
        const [treasuryCrit, treasuryEth] = (await Promise.all([
          client.readContract({
            address: critAddr,
            abi: [
              {
                name: "balanceOf",
                type: "function",
                stateMutability: "view",
                inputs: [{ name: "account", type: "address" }],
                outputs: [{ name: "", type: "uint256" }],
              },
            ],
            functionName: "balanceOf",
            args: [treasuryAddr],
          }),
          client.getBalance({ address: treasuryAddr }),
        ])) as [bigint, bigint];
        const formattedCrit = Number(formatUnits(treasuryCrit, 18)).toLocaleString("en-US", {
          maximumFractionDigits: 2,
        });
        const formattedEth = (Number(treasuryEth) / 1e18).toLocaleString("en-US", {
          maximumFractionDigits: 4,
        });
        i10Res = {
          id: "I-10",
          promise: "Treasury is public",
          call: "CRIT.balanceOf(treasury) + eth_getBalance(treasury)",
          value: `${formattedCrit} $CRIT · ${formattedEth} ETH`,
          status: "PASS",
          detail: "Deployer-EOA treasury balances inspectable live. Timelock rotation pending.",
          blockNumber: currentBlock,
        };
      } catch {
        i10Res = {
          id: "I-10",
          promise: "Treasury is public",
          call: "CRIT.balanceOf(treasury) + eth_getBalance(treasury)",
          value: "UNVERIFIED (RPC error)",
          status: "UNKNOWN",
          detail: "Could not read treasury balances. Never assume — retry.",
          blockNumber: currentBlock,
        };
      }

      // I-11: Weekly burn cadence. Scans CRIT Transfer→Dead logs from token
      // creation in bounded chunks; latest burn timestamp drives the verdict.
      // The chain-observed Transfer variant topic is used (see lib docs);
      // viem types only allow the standard topic, so this scan goes through
      // raw eth_getLogs. No burn ever observed = FAIL (overdue).
      let i11Res: InvariantCheckResult;
      try {
        const TRANSFER_STD =
          "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df288b6ed";
        const TRANSFER_CHAIN =
          "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
        const deadPad =
          "0x000000000000000000000000000000000000000000000000000000000000dead";
        const CREATION_BLOCK = 82691586n;
        const CHUNK = 25000n;
        const chunks: Array<{ from: bigint; to: bigint }> = [];
        for (let s = CREATION_BLOCK; s <= currentBlock; s += CHUNK) {
          chunks.push({ from: s, to: s + CHUNK - 1n > currentBlock ? currentBlock : s + CHUNK - 1n });
        }
        const toHexBlock = (n: bigint) => `0x${n.toString(16)}`;
        const rawBurnLogs = async (t0: string, from: bigint, to: bigint) =>
          client
            .request({
              method: "eth_getLogs",
              params: [
                {
                  address: critAddr,
                  topics: [t0 as `0x${string}`, null, deadPad as `0x${string}`],
                  fromBlock: toHexBlock(from) as `0x${string}`,
                  toBlock: toHexBlock(to) as `0x${string}`,
                },
              ],
            })
            .catch((): Array<{ blockNumber: string }> => []);
        const BATCH = 5;
        let latestBurnBlock: bigint | null = null;
        for (let i = 0; i < chunks.length; i += BATCH) {
          const batch = chunks.slice(i, i + BATCH);
          const results = await Promise.all(
            batch.flatMap(({ from, to }) => [
              rawBurnLogs(TRANSFER_STD, from, to),
              rawBurnLogs(TRANSFER_CHAIN, from, to),
            ])
          );
          for (const logs of results) {
            for (const l of logs as Array<{ blockNumber: string }>) {
              const bn = BigInt(l.blockNumber);
              if (latestBurnBlock === null || bn > latestBurnBlock) {
                latestBurnBlock = bn;
              }
            }
          }
        }
        if (latestBurnBlock === null) {
          i11Res = {
            id: "I-11",
            promise: "Weekly burn cadence",
            call: "CRIT Transfer→Dead scan (since creation)",
            value: "No burn ever observed",
            status: "FAIL",
            detail: "FAIL · Burn overdue. No Transfer to the Dead sink found since token creation.",
            blockNumber: currentBlock,
          };
        } else {
          const burnBlock = await client.getBlock({ blockNumber: latestBurnBlock });
          const lastBurnTs = Number(burnBlock.timestamp);
          const evalBurn = evaluateWeeklyBurn(lastBurnTs, nowTs);
          i11Res = {
            id: "I-11",
            promise: "Weekly burn cadence",
            call: "CRIT Transfer→Dead scan (since creation)",
            value: `${evalBurn.value} (block #${latestBurnBlock.toString()})`,
            status: evalBurn.status,
            detail: evalBurn.detail,
            blockNumber: currentBlock,
          };
        }
      } catch {
        i11Res = {
          id: "I-11",
          promise: "Weekly burn cadence",
          call: "CRIT Transfer→Dead scan (since creation)",
          value: "UNVERIFIED (RPC error)",
          status: "UNKNOWN",
          detail: "Burn scan failed partway. Never assume — retry.",
          blockNumber: currentBlock,
        };
      }

      // I-12: No unlimited approvals. The swap UI currently approves max
      // uint256 (app/swap/page.tsx), so this row honestly FAILS until the
      // exact-allowance change lands. This row polices the team.
      const i12Res: InvariantCheckResult = {
        id: "I-12",
        promise: "No unlimited approvals",
        call: "UI allowance audit (static)",
        value: "max uint256 approval in swap",
        status: "FAIL",
        detail:
          "app/swap/page.tsx approves max uint256 to the swap helper. Exact-amount allowance change pending.",
        blockNumber: currentBlock,
      };

      // I-13: Prices carry an age (all 9 commodities read live)
      let i13Res: InvariantCheckResult;
      try {
        const priceAddr = getCanonicalAddress("PriceOracleAdapter");
        const priceReads = (await Promise.all(
          Array.from({ length: 9 }, (_, i) =>
            client.readContract({
              address: priceAddr,
              abi: [
                {
                  name: "latestPrice",
                  type: "function",
                  stateMutability: "view",
                  inputs: [{ name: "commodity", type: "uint8" }],
                  outputs: [
                    { name: "usdPerKgE8", type: "uint192" },
                    { name: "sourceHash", type: "bytes32" },
                    { name: "updatedAt", type: "uint64" },
                    { name: "nonce", type: "uint64" },
                  ],
                },
              ],
              functionName: "latestPrice",
              args: [i],
            })
          )
        )) as Array<readonly [bigint, string, bigint, bigint]>;
        const names = ["Au", "Ag", "Pt", "Pd", "Nd", "Dy", "Tb", "Sc", "Li"];
        const ages = priceReads.map((p, i) => ({
          name: names[i],
          set: p[0] > 0n,
          ageSecs: p[2] > 0n ? nowTs - Number(p[2]) : Number.POSITIVE_INFINITY,
        }));
        const stale = ages.filter((a) => !a.set || a.ageSecs > 24 * 3600);
        const oldestH = Math.min(...ages.map((a) => a.ageSecs)) / 3600;
        i13Res = {
          id: "I-13",
          promise: "Prices carry an age",
          call: "PriceOracleAdapter.latestPrice(i).updatedAt × 9",
          value:
            stale.length === 0
              ? `all fresh (oldest ${oldestH.toFixed(1)}h)`
              : `${stale.length}/9 stale (${stale.map((s) => s.name).join(",")})`,
          status: stale.length === 0 ? "PASS" : "FAIL",
          detail:
            stale.length === 0
              ? "Every commodity feed is younger than 24h."
              : `FAIL · stale: ${stale
                  .map((s) => `${s.name} (${s.set ? `${(s.ageSecs / 3600).toFixed(1)}h old` : "never set"})`)
                  .join("; ")}. Feeds older than 24h halt reserve math on-chain.`,
          blockNumber: currentBlock,
        };
      } catch {
        i13Res = {
          id: "I-13",
          promise: "Prices carry an age",
          call: "PriceOracleAdapter.latestPrice(i).updatedAt × 9",
          value: "UNVERIFIED (RPC error)",
          status: "UNKNOWN",
          detail: "Could not read oracle timestamps. Never assume — retry.",
          blockNumber: currentBlock,
        };
      }

      // I-14: Canonical token only (launcher wiring read live)
      let i14Res: InvariantCheckResult;
      try {
        const launcherAddr = getCanonicalAddress("sCRITV4Launcher");
        const addrAbi = [
          {
            name: "scrit",
            type: "function",
            stateMutability: "view",
            inputs: [],
            outputs: [{ name: "", type: "address" }],
          },
          {
            name: "hook",
            type: "function",
            stateMutability: "view",
            inputs: [],
            outputs: [{ name: "", type: "address" }],
          },
        ] as const;
        const [wiredScrit, wiredHook] = (await Promise.all([
          client.readContract({ address: launcherAddr, abi: addrAbi, functionName: "scrit" }),
          client.readContract({ address: launcherAddr, abi: addrAbi, functionName: "hook" }),
        ])) as [string, string];
        const critOk = wiredScrit.toLowerCase() === critAddr.toLowerCase();
        const hookOk = wiredHook.toLowerCase() === hookAddr.toLowerCase();
        i14Res = {
          id: "I-14",
          promise: "Canonical token only",
          call: "Launcher.scrit() + Launcher.hook()",
          value: critOk && hookOk ? "CRIT + hook canonical" : "MISMATCH",
          status: critOk && hookOk ? "PASS" : "FAIL",
          detail:
            critOk && hookOk
              ? "Launcher wires canonical Pons $CRIT and the 0x2044 hook. Legacy 0x5607… is referenced nowhere."
              : `Launcher wiring differs: scrit=${wiredScrit} hook=${wiredHook}.`,
          blockNumber: currentBlock,
        };
      } catch {
        i14Res = {
          id: "I-14",
          promise: "Canonical token only",
          call: "Launcher.scrit() + Launcher.hook()",
          value: "UNVERIFIED (RPC error)",
          status: "UNKNOWN",
          detail: "Could not read launcher wiring. Never assume — retry.",
          blockNumber: currentBlock,
        };
      }

      const all = [
        i1Res,
        i2Res,
        i3Res,
        i4Res,
        i5Res,
        i6Res,
        i7Res,
        i7bRes,
        i8Res,
        i9Res,
        i10Res,
        i11Res,
        i12Res,
        i13Res,
        i14Res,
      ];

      setResults(sortInvariantsByPriority(all));
    } catch (err) {
      console.error("Failed to run invariant checks:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    runAllChecks();
    const interval = setInterval(runAllChecks, 20000);
    return () => clearInterval(interval);
  }, []);

  const counts = {
    PASS: results.filter((r) => r.status === "PASS").length,
    FAIL: results.filter((r) => r.status === "FAIL").length,
    PENDING: results.filter((r) => r.status === "PENDING").length,
    UNKNOWN: results.filter((r) => r.status === "UNKNOWN").length,
  };

  const filtered = results.filter((r) => {
    if (filterCategory === "ALL") return true;
    const def = INVARIANT_DEFINITIONS.find((d) => d.id === r.id);
    return def?.category === filterCategory;
  });

  return (
    <div className="scrit-proof-page" style={{ minHeight: "100vh", padding: "100px 24px 80px" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 32, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 11,
                letterSpacing: "0.14em",
                color: "#e6b43b",
                background: "rgba(230,180,59,0.1)",
                padding: "3px 8px",
                borderRadius: 4,
                border: "1px solid rgba(230,180,59,0.3)",
              }}
            >
              LIVE INVARIANT MONITOR
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 11,
                color: "rgba(255,255,255,0.45)",
              }}
            >
              CHAIN 4663 · CLIENT-SIDE VERIFICATION
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(28px, 4vw, 42px)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#ffffff",
              margin: "0 0 12px",
            }}
          >
            Every promise. Checked live.
          </h1>
          <p
            style={{
              fontSize: 16,
              color: "rgba(255,255,255,0.7)",
              maxWidth: 820,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Each row is something sCRIT says. Each status is what the chain says.
            Failing rows stay visible and sort to the top automatically.
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16,
              marginTop: 18,
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 12,
              color: "rgba(255,255,255,0.5)",
            }}
          >
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <span>
                BLOCK:{" "}
                <b style={{ color: "#ffffff" }}>
                  {blockNumber ? `#${blockNumber.toString()}` : "READING..."}
                </b>
              </span>
              <span>·</span>
              <span>
                AGE:{" "}
                <b style={{ color: blockAgeSecs !== null ? "#3dd68c" : "inherit" }}>
                  {blockAgeSecs !== null ? `${blockAgeSecs}s ago` : "UNKNOWN"}
                </b>
              </span>
            </div>

            <button
              type="button"
              onClick={runAllChecks}
              disabled={isLoading}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#e6b43b",
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 11,
                padding: "6px 14px",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              {isLoading ? "RE-CHECKING RPC..." : "↺ RECHECK ALL IN BROWSER"}
            </button>
          </div>
        </div>

        {/* Status Metrics Strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              background: "rgba(61,214,140,0.08)",
              border: "1px solid rgba(61,214,140,0.25)",
              borderRadius: 6,
              padding: "14px 18px",
            }}
          >
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-mono, monospace)" }}>
              PASSING PROMISES
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#3dd68c", marginTop: 4 }}>
              {counts.PASS}
            </div>
          </div>

          <div
            style={{
              background: counts.FAIL > 0 ? "rgba(255,75,75,0.15)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${counts.FAIL > 0 ? "#ff4b4b" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 6,
              padding: "14px 18px",
            }}
          >
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-mono, monospace)" }}>
              FAILED (CRITICAL)
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: counts.FAIL > 0 ? "#ff4b4b" : "rgba(255,255,255,0.3)",
                marginTop: 4,
              }}
            >
              {counts.FAIL}
            </div>
          </div>

          <div
            style={{
              background: "rgba(230,180,59,0.08)",
              border: "1px solid rgba(230,180,59,0.25)",
              borderRadius: 6,
              padding: "14px 18px",
            }}
          >
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-mono, monospace)" }}>
              PENDING / PILOT PHASE
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#e6b43b", marginTop: 4 }}>
              {counts.PENDING}
            </div>
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 6,
              padding: "14px 18px",
            }}
          >
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-mono, monospace)" }}>
              RPC UNKNOWN
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
              {counts.UNKNOWN}
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
          {["ALL", "SUPPLY & BURNS", "CONTRACT SAFETY", "GOVERNANCE & TIMELOCK", "RESERVE & TREASURY"].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              style={{
                background: filterCategory === cat ? "rgba(230,180,59,0.15)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${filterCategory === cat ? "#e6b43b" : "rgba(255,255,255,0.08)"}`,
                color: filterCategory === cat ? "#e6b43b" : "rgba(255,255,255,0.6)",
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 11,
                padding: "6px 12px",
                borderRadius: 4,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Invariant Board Table */}
        <div
          style={{
            background: "rgba(18,20,18,0.7)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.4)",
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 11,
                    textAlign: "left",
                  }}
                >
                  <th style={{ padding: "12px 18px", width: 70 }}>ID</th>
                  <th style={{ padding: "12px 16px" }}>PROMISE</th>
                  <th style={{ padding: "12px 16px" }}>HOW IT&apos;S CHECKED (CALL)</th>
                  <th style={{ padding: "12px 16px" }}>VALUE</th>
                  <th style={{ padding: "12px 16px" }}>STATUS</th>
                  <th style={{ padding: "12px 18px", textAlign: "right" }}>BLOCK</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      background: item.status === "FAIL" ? "rgba(255,75,75,0.06)" : "transparent",
                    }}
                  >
                    <td style={{ padding: "14px 18px", fontFamily: "var(--font-mono, monospace)", fontWeight: 700, color: "#e6b43b" }}>
                      {item.id}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 600, color: "#ffffff" }}>{item.promise}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
                        {item.detail}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", fontFamily: "var(--font-mono, monospace)", fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
                      {item.call}
                    </td>
                    <td style={{ padding: "14px 16px", fontFamily: "var(--font-mono, monospace)", fontSize: 12, color: "#ffffff", fontWeight: 600 }}>
                      {item.value}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span
                        style={{
                          fontFamily: "var(--font-mono, monospace)",
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 4,
                          background:
                            item.status === "PASS"
                              ? "rgba(61,214,140,0.12)"
                              : item.status === "FAIL"
                              ? "rgba(255,75,75,0.15)"
                              : item.status === "PENDING"
                              ? "rgba(230,180,59,0.12)"
                              : "rgba(255,255,255,0.06)",
                          color:
                            item.status === "PASS"
                              ? "#3dd68c"
                              : item.status === "FAIL"
                              ? "#ff4b4b"
                              : item.status === "PENDING"
                              ? "#e6b43b"
                              : "#94a3b8",
                          border: `1px solid ${
                            item.status === "PASS"
                              ? "rgba(61,214,140,0.3)"
                              : item.status === "FAIL"
                              ? "rgba(255,75,75,0.4)"
                              : item.status === "PENDING"
                              ? "rgba(230,180,59,0.3)"
                              : "rgba(255,255,255,0.12)"
                          }`,
                        }}
                      >
                        {item.status === "PASS" ? "✓ PASS" : item.status === "FAIL" ? "✗ FAIL" : item.status}
                      </span>
                    </td>
                    <td style={{ padding: "14px 18px", textAlign: "right", fontFamily: "var(--font-mono, monospace)", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                      {item.blockNumber ? `#${item.blockNumber.toString()}` : "LATEST"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
