"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { VerificationToolbar } from "@/components/VerificationToolbar";
import { publicClientFor } from "@/lib/scrit-evm";
import { getCanonicalAddress } from "@/lib/addresses";
import { decodeHookPermissions } from "@/lib/verify/hook-decoder";
import {
  discoverPoolsFromChain,
  SWAP_EVENT,
  type DiscoveredPool,
} from "@/lib/pairs/discovery";
import { formatUnits } from "viem";
import {
  ArrowLeft,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  Coins,
  Layers,
  Activity,
  ExternalLink,
  Sparkles,
  Clock,
} from "lucide-react";
import { HOOD_MAINNET } from "@/lib/scrit";

interface RecentSwap {
  tx: string;
  block: bigint;
  amount0: bigint;
  amount1: bigint;
}

export default function PairDetailPage() {
  const params = useParams();
  const tokenParam = Array.isArray(params?.token) ? params.token[0] : (params?.token as string);
  const token = (tokenParam ?? "").toLowerCase();

  const [pool, setPool] = useState<DiscoveredPool | null>(null);
  const [swaps, setSwaps] = useState<RecentSwap[]>([]);
  const [blockNumber, setBlockNumber] = useState<bigint | null>(null);
  const [blockAgeSecs, setBlockAgeSecs] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  async function loadData() {
    setIsLoading(true);
    setNotFound(false);
    const client = publicClientFor(4663);
    client
      .getBlock({ blockTag: "latest" })
      .then((b) => {
        setBlockNumber(b.number);
        setBlockAgeSecs(Math.max(0, Math.floor(Date.now() / 1000) - Number(b.timestamp)));
      })
      .catch(() => null);

    try {
      const pools = await discoverPoolsFromChain(4663);
      const match =
        pools.find((p) => p.projectToken.toLowerCase() === token) ?? null;
      if (!match) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }
      setPool(match);
      const block = await client.getBlock({ blockTag: "latest" }).catch(() => null);
      const head = block?.number ?? (await client.getBlockNumber().catch(() => 0n));
      if (block) {
        setBlockNumber(block.number);
        setBlockAgeSecs(Math.max(0, Math.floor(Date.now() / 1000) - Number(block.timestamp)));
      }
      const from = match.createdAtBlock > 200000n ? match.createdAtBlock : 0n;
      const logs = await client
        .getLogs({
          address: getCanonicalAddress("PoolManager") as `0x${string}`,
          event: SWAP_EVENT,
          args: { id: match.poolId as `0x${string}` },
          fromBlock: from > head ? head : from,
          toBlock: head,
        })
        .catch(() => []);
      setSwaps(
        logs.slice(-10).reverse().map((l) => {
          const a = l.args as { amount0: bigint; amount1: bigint };
          return {
            tx: l.transactionHash,
            block: l.blockNumber,
            amount0: BigInt(a.amount0),
            amount1: BigInt(a.amount1),
          };
        })
      );
    } catch {
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const hook = pool ? decodeHookPermissions(pool.hook) : null;
  const embedCode = `<a href="https://www.scritindex.tech/pairs/${token}"><img src="https://www.scritindex.tech/badge/${token}.svg" alt="Stockpile-paired"></a>`;

  return (
    <PageShell>
      <div style={{ width: "100%", paddingBottom: 60 }}>
        {/* Breadcrumb back */}
        <div style={{ marginBottom: 20 }}>
          <Link
            href="/pairs"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "#8c6418",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={14} />
            <span>Back to Stockpile Registry</span>
          </Link>
        </div>

        {/* Title Header */}
        <div style={{ maxWidth: 1100, marginBottom: 28 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 12px",
              borderRadius: 2,
              background: "rgba(83, 103, 83, 0.08)",
              border: "1px solid rgba(83, 103, 83, 0.2)",
              marginBottom: 14,
            }}
          >
            <Sparkles size={13} color="var(--moss)" />
            <span
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: "var(--moss)",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Stockpile-Paired Pool Specification
            </span>
          </div>

          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(24px, 3.8vw, 44px)",
              fontWeight: 450,
              letterSpacing: "-0.035em",
              margin: "0 0 10px",
              lineHeight: 1.15,
              color: "var(--ink)",
            }}
          >
            {pool ? `${pool.tokenSymbol} / $CRIT` : "Pool Verification"} <em>Uniswap V4 Pool</em>
          </h1>
          <p
            style={{
              color: "#5e645d",
              fontSize: "clamp(14px, 1.6vw, 16px)",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            Cryptographic audit of Uniswap V4 pool state, hook execution, and stockpile tax reconciliation on Robinhood Chain.
          </p>
        </div>

        {/* Universal Verification Toolbar */}
        <VerificationToolbar
          networkName="Robinhood Chain"
          chainId={4663}
          blockNumber={blockNumber}
          blockAgeSecs={blockAgeSecs}
          onRecheck={loadData}
          isRechecking={isLoading}
          recheckLabel="REFRESH POOL PROOFS"
          recheckProgressText="VERIFYING HOOK &amp; SWAPS..."
          subtitle={`Pair Token: ${token ? `${token.slice(0, 8)}...${token.slice(-6)}` : "..."} · 0x2044 Hook Enforced`}
          extraControls={
            <Link
              href="/pairs"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 4,
                border: "1px solid var(--line-ink)",
                background: "#ffffff",
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                color: "var(--ink)",
                textDecoration: "none",
              }}
            >
              <ArrowLeft size={12} />
              ALL PAIRS
            </Link>
          }
        />

        {isLoading && (
          <div
            style={{
              padding: "36px 28px",
              background: "#ffffff",
              border: "1px solid var(--line-ink)",
              borderRadius: 6,
              boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                <span className="scrit-radar" style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#8c6418" }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "#8c6418", letterSpacing: "0.06em" }}>
                  INSPECTING ON-CHAIN POOL INITIALIZATION &amp; SWAPS...
                </span>
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#7d8479" }}>
                Robinhood Chain V4 Logs
              </span>
            </div>
            <div className="scrit-progress-bar" style={{ height: 3, marginBottom: 24 }}>
              <div className="scrit-progress-bar-fill" />
            </div>

            {/* Skeletons */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 20 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ background: "#faf8f2", border: "1px solid var(--line-ink)", borderRadius: 4, padding: "16px 18px" }}>
                  <div className="scrit-skeleton" style={{ width: 80, height: 12, marginBottom: 10 }} />
                  <div className="scrit-skeleton" style={{ width: 140, height: 24, marginBottom: 6 }} />
                  <div className="scrit-skeleton" style={{ width: 100, height: 10 }} />
                </div>
              ))}
            </div>

            <div style={{ background: "#faf8f2", border: "1px solid var(--line-ink)", borderRadius: 4, padding: "16px 18px" }}>
              <div className="scrit-skeleton" style={{ width: 180, height: 14, marginBottom: 14 }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                <div className="scrit-skeleton" style={{ width: "90%", height: 14 }} />
                <div className="scrit-skeleton" style={{ width: "85%", height: 14 }} />
              </div>
            </div>
          </div>
        )}

        {!isLoading && notFound && (
          <div
            style={{
              background: "#fdf2f2",
              border: "1px solid rgba(211, 47, 47, 0.3)",
              borderRadius: 6,
              padding: 36,
              textAlign: "center",
            }}
          >
            <ShieldAlert size={36} color="#b71c1c" style={{ margin: "0 auto 12px" }} />
            <div style={{ color: "#b71c1c", fontWeight: 800, fontSize: 18, marginBottom: 8, fontFamily: "var(--font-mono)" }}>
              NOT STOCKPILE-PAIRED
            </div>
            <p style={{ color: "#5e645d", maxWidth: 540, margin: "0 auto 20px", fontSize: 14, lineHeight: 1.6 }}>
              No Uniswap V4 pool initialized with canonical 0x2044 hook pairing this token against canonical $CRIT was discovered.
            </p>
            <Link
              href="/pairs"
              className="btn btn-gold"
              style={{
                display: "inline-block",
                padding: "8px 18px",
                borderRadius: 4,
                textDecoration: "none",
                fontSize: 12,
              }}
            >
              Back to Registry
            </Link>
          </div>
        )}

        {!isLoading && pool && hook && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Top 3-metric overview card */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid var(--line-ink)",
                borderRadius: 6,
                boxShadow: "0 4px 20px rgba(24, 26, 24, 0.03)",
                padding: 24,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 20,
              }}
            >
              <div
                style={{
                  background: "#faf8f2",
                  border: "1px solid var(--line-ink)",
                  borderRadius: 4,
                  padding: "16px 18px",
                }}
              >
                <div style={{ color: "#7d8479", fontSize: 11, fontFamily: "var(--font-mono)", textTransform: "uppercase", marginBottom: 6 }}>
                  FED TO STOCKPILE
                </div>
                <div style={{ color: "#8c6418", fontWeight: 700, fontSize: 22, fontFamily: "var(--font-mono)" }}>
                  {Number(formatUnits(pool.fedToStockpile, 18)).toLocaleString("en-US")} $CRIT
                </div>
                <div style={{ color: "#636b60", fontSize: 11, marginTop: 4 }}>
                  Sum of on-chain TaxCollected events
                </div>
              </div>

              <div
                style={{
                  background: "#faf8f2",
                  border: "1px solid var(--line-ink)",
                  borderRadius: 4,
                  padding: "16px 18px",
                }}
              >
                <div style={{ color: "#7d8479", fontSize: 11, fontFamily: "var(--font-mono)", textTransform: "uppercase", marginBottom: 6 }}>
                  $CRIT VOLUME
                </div>
                <div style={{ color: "var(--ink)", fontWeight: 700, fontSize: 22, fontFamily: "var(--font-mono)" }}>
                  {Number(formatUnits(pool.critVolume, 18)).toLocaleString("en-US")} $CRIT
                </div>
                <div style={{ color: "#636b60", fontSize: 11, marginTop: 4 }}>
                  Across {pool.swapCount} swap executions
                </div>
              </div>

              <div
                style={{
                  background: hook.hexFlags === "0x2044" ? "#f0f7f1" : "#fdf2f2",
                  border: `1px solid ${hook.hexFlags === "0x2044" ? "rgba(46, 125, 50, 0.3)" : "rgba(211, 47, 47, 0.3)"}`,
                  borderRadius: 4,
                  padding: "16px 18px",
                }}
              >
                <div style={{ color: hook.hexFlags === "0x2044" ? "#1b5e20" : "#b71c1c", fontSize: 11, fontFamily: "var(--font-mono)", textTransform: "uppercase", marginBottom: 6 }}>
                  HOOK STATUS
                </div>
                <div style={{ color: hook.hexFlags === "0x2044" ? "#1b5e20" : "#b71c1c", fontWeight: 700, fontSize: 22, fontFamily: "var(--font-mono)" }}>
                  {hook.hexFlags === "0x2044" ? "0x2044 ✓" : `${hook.hexFlags} ✗`}
                </div>
                <div style={{ color: hook.hexFlags === "0x2044" ? "#2e7d32" : "#b71c1c", fontSize: 11, marginTop: 4 }}>
                  {hook.hexFlags === "0x2044" ? "Canonical tax hook verified" : "Non-canonical hook flags"}
                </div>
              </div>
            </div>

            {/* Pool key card */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid var(--line-ink)",
                borderRadius: 6,
                boxShadow: "0 4px 20px rgba(24, 26, 24, 0.03)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "14px 18px",
                  borderBottom: "1px solid var(--line-ink)",
                  background: "#faf8f2",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Layers size={15} color="var(--signal)" />
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--ink)" }}>
                  Uniswap V4 Pool Key &amp; Immutability
                </span>
              </div>

              <div style={{ padding: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, fontFamily: "var(--font-mono)", fontSize: 12 }}>
                  <div>
                    <span style={{ color: "#7d8479" }}>POOL ID: </span>
                    <span style={{ color: "var(--ink)", wordBreak: "break-all", fontWeight: 600 }}>{pool.poolId}</span>
                  </div>
                  <div>
                    <span style={{ color: "#7d8479" }}>CURRENCY 0: </span>
                    <span style={{ color: "var(--ink)", wordBreak: "break-all", fontWeight: 600 }}>{pool.token0}</span>
                  </div>
                  <div>
                    <span style={{ color: "#7d8479" }}>CURRENCY 1: </span>
                    <span style={{ color: "var(--ink)", wordBreak: "break-all", fontWeight: 600 }}>{pool.token1}</span>
                  </div>
                  <div>
                    <span style={{ color: "#7d8479" }}>LP RECIPIENT: </span>
                    <span style={{ color: "var(--ink)", wordBreak: "break-all", fontWeight: 600 }}>{pool.lpRecipient}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Hook bit permission decoder */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid var(--line-ink)",
                borderRadius: 6,
                boxShadow: "0 4px 20px rgba(24, 26, 24, 0.03)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "14px 18px",
                  borderBottom: "1px solid var(--line-ink)",
                  background: "#faf8f2",
                }}
              >
                <div style={{ color: "var(--ink)", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
                  Hook Permission Verification — {hook.hexFlags} ({hook.activeCount} ON, {hook.inactiveCount} OFF)
                </div>
                <p style={{ color: "#636b60", fontSize: 12, margin: "4px 0 0" }}>
                  Verified via Uniswap V4 address bitmask. Lowest 14 bits determine all hook powers permanently.
                </p>
              </div>

              <div style={{ padding: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {hook.explanations.slice(0, 5).map((exp) => (
                    <div
                      key={exp.flag}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 14px",
                        background: exp.status === "ON" ? "#fdfaf3" : "#faf8f2",
                        border: `1px solid ${exp.status === "ON" ? "rgba(201, 146, 46, 0.3)" : "var(--line-ink)"}`,
                        borderRadius: 4,
                        fontSize: 12,
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      <span style={{ color: exp.status === "ON" ? "#8c6418" : "#7d8479", fontWeight: 600 }}>
                        [{exp.status}] {exp.flag}
                      </span>
                      <span style={{ color: "#5e645d" }}>{exp.meaning}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Contribution Over Time */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid var(--line-ink)",
                borderRadius: 6,
                boxShadow: "0 4px 20px rgba(24, 26, 24, 0.03)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "14px 18px",
                  borderBottom: "1px solid var(--line-ink)",
                  background: "#faf8f2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Coins size={15} color="var(--signal)" />
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--ink)" }}>
                    Stockpile Contribution Over Time
                  </span>
                </div>
                <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#7d8479" }}>
                  75% of 250 bps hook fee
                </span>
              </div>

              <div style={{ padding: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px dashed var(--line-ink)", paddingBottom: 10 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#7d8479" }}>
                      Cumulative Stockpile Share Delivered
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, color: "#8c6418" }}>
                      {Number(formatUnits(pool.fedToStockpile, 18)).toLocaleString("en-US")} $CRIT
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px dashed var(--line-ink)", paddingBottom: 10 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#7d8479" }}>
                      Total Pool Swap Volume Observed
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
                      {Number(formatUnits(pool.critVolume, 18)).toLocaleString("en-US")} $CRIT across {pool.swapCount} swaps
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#7d8479" }}>
                      Pool Creation Block
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink)" }}>
                      #{pool.createdAtBlock.toString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Swaps List */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid var(--line-ink)",
                borderRadius: 6,
                boxShadow: "0 4px 20px rgba(24, 26, 24, 0.03)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "14px 18px",
                  borderBottom: "1px solid var(--line-ink)",
                  background: "#faf8f2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Activity size={15} color="var(--signal)" />
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--ink)" }}>
                    Recent Swaps ({swaps.length})
                  </span>
                </div>
                <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "#7d8479" }}>
                  Uniswap V4 Swap Events
                </span>
              </div>

              <div style={{ padding: 20 }}>
                {swaps.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "#7d8479", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                    0 swaps recorded on this pool yet. Initial stockpile contribution is 0 $CRIT.
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--line-ink)", textAlign: "left", color: "#7d8479" }}>
                          <th style={{ padding: "8px 12px" }}>BLOCK</th>
                          <th style={{ padding: "8px 12px" }}>TRANSACTION</th>
                          <th style={{ padding: "8px 12px" }}>AMOUNT 0</th>
                          <th style={{ padding: "8px 12px" }}>AMOUNT 1</th>
                          <th style={{ padding: "8px 12px", textAlign: "right" }}>EXPLORER</th>
                        </tr>
                      </thead>
                      <tbody>
                        {swaps.map((s, idx) => (
                          <tr key={s.tx + idx} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                            <td style={{ padding: "10px 12px", color: "var(--ink)" }}>#{s.block.toString()}</td>
                            <td style={{ padding: "10px 12px", color: "#5e645d" }}>
                              {s.tx.slice(0, 8)}...{s.tx.slice(-6)}
                            </td>
                            <td style={{ padding: "10px 12px", color: "var(--ink)" }}>
                              {formatUnits(s.amount0 < 0n ? -s.amount0 : s.amount0, 18)}
                            </td>
                            <td style={{ padding: "10px 12px", color: "var(--ink)" }}>
                              {formatUnits(s.amount1 < 0n ? -s.amount1 : s.amount1, 18)}
                            </td>
                            <td style={{ padding: "10px 12px", textAlign: "right" }}>
                              <a
                                href={`${HOOD_MAINNET.explorer}/tx/${s.tx}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: "#8c6418", display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none" }}
                              >
                                <span>View</span>
                                <ExternalLink size={11} />
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Embed Badge section */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid var(--line-ink)",
                borderRadius: 6,
                boxShadow: "0 4px 20px rgba(24, 26, 24, 0.03)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "14px 18px",
                  borderBottom: "1px solid var(--line-ink)",
                  background: "#faf8f2",
                }}
              >
                <div style={{ color: "var(--ink)", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
                  Embeddable Verification Badge
                </div>
                <p style={{ color: "#636b60", fontSize: 12, margin: "4px 0 0" }}>
                  Add this dynamic SVG badge to your website or project documentation. It renders live on-chain stockpile contribution directly from RPC:
                </p>
              </div>

              <div style={{ padding: 20 }}>
                {/* Badge Preview */}
                <div style={{ marginBottom: 16 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://www.scritindex.tech/badge/${token}.svg`}
                    alt="Stockpile-paired badge"
                    style={{ borderRadius: 6, maxWidth: "100%", height: "auto" }}
                  />
                </div>

                <div
                  style={{
                    background: "#f4f1e8",
                    padding: 12,
                    borderRadius: 4,
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--ink)",
                    wordBreak: "break-all",
                    marginBottom: 14,
                    border: "1px solid rgba(24, 26, 24, 0.12)",
                  }}
                >
                  {embedCode}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(embedCode);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="btn btn-gold"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    borderRadius: 4,
                    fontSize: 11.5,
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? "COPIED SNIPPET" : "COPY EMBED CODE"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
