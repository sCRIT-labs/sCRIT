"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageShell } from "@/components/PageShell";
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
} from "lucide-react";

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
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const pools = await discoverPoolsFromChain(4663);
        const match =
          pools.find((p) => p.projectToken.toLowerCase() === token) ?? null;
        if (!mounted) return;
        if (!match) {
          setNotFound(true);
          setIsLoading(false);
          return;
        }
        setPool(match);
        const client = publicClientFor(4663);
        const head = await client.getBlockNumber();
        setBlockNumber(head);
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
        if (mounted) setNotFound(true);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    if (token) load();
    return () => {
      mounted = false;
    };
  }, [token]);

  const hook = pool ? decodeHookPermissions(pool.hook) : null;
  const embedCode = `<a href="https://scritindex.tech/pairs/${token}"><img src="https://scritindex.tech/badge/${token}.svg" alt="Stockpile-paired"></a>`;

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

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
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
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  wordBreak: "break-all",
                  margin: 0,
                }}
              >
                Token: {token} · Verified Block: {blockNumber ? `#${blockNumber.toString()}` : "READING..."}
              </p>
            </div>
          </div>
        </div>

        {isLoading && (
          <div
            style={{
              padding: 48,
              textAlign: "center",
              background: "#ffffff",
              border: "1px solid var(--line-ink)",
              borderRadius: 6,
              color: "#5e645d",
              fontFamily: "var(--font-mono)",
            }}
          >
            Scanning Robinhood Chain logs for pool state...
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
                  {Number(formatUnits(pool.fedToStockpile, 18)).toLocaleString()} $CRIT
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
                  {Number(formatUnits(pool.critVolume, 18)).toLocaleString()} $CRIT
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
                    src={`/badge/${token}.svg`}
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
