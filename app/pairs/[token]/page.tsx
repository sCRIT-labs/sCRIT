"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { publicClientFor } from "@/lib/scrit-evm";
import { getCanonicalAddress } from "@/lib/addresses";
import { decodeHookPermissions } from "@/lib/verify/hook-decoder";
import {
  discoverPoolsFromChain,
  SWAP_EVENT,
  type DiscoveredPool,
} from "@/lib/pairs/discovery";
import { formatUnits } from "viem";

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
    <div className="scrit-proof-page" style={{ minHeight: "100vh", padding: "100px 24px 80px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <Link href="/pairs" style={{ color: "#e6b43b", fontFamily: "var(--font-mono, monospace)", fontSize: 12 }}>
          ← BACK TO REGISTRY
        </Link>
        <h1 style={{ color: "#fff", fontSize: "clamp(24px,3.5vw,34px)", margin: "12px 0 8px" }}>
          {pool ? `${pool.tokenSymbol} / $CRIT` : "Pair detail"}
        </h1>
        <p style={{ color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-mono, monospace)", fontSize: 12, wordBreak: "break-all" }}>
          {token} · block {blockNumber ? `#${blockNumber.toString()}` : "…"}
        </p>

        {isLoading && <p style={{ color: "#fff" }}>Reading pool from chain…</p>}
        {!isLoading && notFound && (
          <div style={{ background: "rgba(255,75,75,0.08)", border: "1px solid #ff4b4b", borderRadius: 8, padding: 24, marginTop: 24 }}>
            <div style={{ color: "#ff6b6b", fontWeight: 800 }}>NOT STOCKPILE-PAIRED</div>
            <p style={{ color: "#fff" }}>
              No pool with the canonical 0x2044 hook pairs this token against $CRIT in the scanned range.
            </p>
          </div>
        )}
        {!isLoading && pool && hook && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
            <div style={card}>
              <div style={label}>POOL KEY</div>
              <div style={mono}>poolId {pool.poolId}</div>
              <div style={mono}>token0 {pool.token0}</div>
              <div style={mono}>token1 {pool.token1}</div>
              <div style={mono}>fee {pool.fee} · created #{pool.createdAtBlock.toString()}</div>
            </div>
            <div style={card}>
              <div style={label}>HOOK CHECK — {hook.hexFlags} ({hook.activeCount} ON)</div>
              <div style={{ color: hook.hexFlags === "0x2044" ? "#3dd68c" : "#ff4b4b", fontWeight: 700 }}>
                {hook.hexFlags === "0x2044" ? "✓ Canonical 0x2044 hook" : "✗ Hook flags differ from 0x2044"}
              </div>
              <div style={mono}>beforeRemoveLiquidity {hook.flags.beforeRemoveLiquidity ? "ON — can block withdrawals" : "OFF — cannot block LP withdrawals"}</div>
            </div>
            <div style={card}>
              <div style={label}>CONTRIBUTION</div>
              <div style={mono}>{swaps.length} recent swaps · {Number(formatUnits(pool.critVolume, 18)).toLocaleString()} $CRIT volume</div>
              <div style={{ color: "#e6b43b", fontWeight: 700 }}>
                Fed to stockpile: {Number(formatUnits(pool.fedToStockpile, 18)).toLocaleString()} $CRIT (hook TaxCollected sums)
              </div>
              <div style={mono}>LP NFT holder: {pool.lpRecipient}</div>
              {pool.statsNote && <div style={mono}>stats: {pool.statsNote}</div>}
            </div>
            <div style={card}>
              <div style={label}>RECENT SWAPS</div>
              {swaps.length === 0 && <div style={mono}>No swaps in range.</div>}
              {swaps.map((s) => (
                <div key={s.tx} style={{ ...mono, marginBottom: 6 }}>
                  #{s.block.toString()} · {s.tx.slice(0, 12)}… · Δ0 {s.amount0.toString()} · Δ1 {s.amount1.toString()}
                </div>
              ))}
            </div>
            <div style={card}>
              <div style={label}>EMBED BADGE</div>
              <div style={{ background: "#0c0e0c", padding: 12, borderRadius: 6, fontFamily: "var(--font-mono, monospace)", fontSize: 12, color: "#3dd68c", wordBreak: "break-all" }}>
                {embedCode}
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(embedCode);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                style={btn}
              >
                {copied ? "✓ COPIED" : "COPY EMBED CODE"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  background: "rgba(18,20,18,0.7)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  padding: 20,
};

const label: React.CSSProperties = {
  fontFamily: "var(--font-mono, monospace)",
  fontSize: 11,
  color: "#e6b43b",
  letterSpacing: "0.08em",
  marginBottom: 8,
};

const mono: React.CSSProperties = {
  fontFamily: "var(--font-mono, monospace)",
  fontSize: 12,
  color: "rgba(255,255,255,0.75)",
  wordBreak: "break-all",
};

const btn: React.CSSProperties = {
  marginTop: 12,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#e6b43b",
  fontSize: 11,
  fontFamily: "var(--font-mono, monospace)",
  padding: "6px 12px",
  borderRadius: 4,
  cursor: "pointer",
};
