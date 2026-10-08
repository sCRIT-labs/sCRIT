"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { publicClientFor } from "@/lib/scrit-evm";
import { getCanonicalAddress, ADDRESSES } from "@/lib/addresses";
import {
  filterStockpilePairedPools,
  reconcileHookTax,
  discoverPoolsFromChain,
  type DiscoveredPool,
} from "@/lib/pairs/discovery";
import { formatUnits } from "viem";

export default function PairsPage() {
  const [pools, setPools] = useState<DiscoveredPool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [blockNumber, setBlockNumber] = useState<bigint | null>(null);
  const [blockAgeSecs, setBlockAgeSecs] = useState<number | null>(null);
  const [treasuryBalance, setTreasuryBalance] = useState<bigint>(0n);
  const [showLegacy, setShowLegacy] = useState(false);
  const [selectedEmbedToken, setSelectedEmbedToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Fetch chain data
  async function loadChainData() {
    setIsLoading(true);
    try {
      const client = publicClientFor(4663);
      const latestBlock = await client.getBlock({ blockTag: "latest" });
      setBlockNumber(latestBlock.number);
      const age = Math.floor(Date.now() / 1000) - Number(latestBlock.timestamp);
      setBlockAgeSecs(Math.max(0, age));

      // Read StockpileTreasury CRIT balance via eth_call
      const treasuryAddr = getCanonicalAddress("StockpileTreasury");
      const critAddr = getCanonicalAddress("CRIT");

      try {
        const balData = await client.readContract({
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
        });
        setTreasuryBalance(balData as bigint);
      } catch (e) {
        console.warn("Could not read treasury CRIT balance:", e);
      }

      const discovered = await discoverPoolsFromChain(4663);
      setPools(discovered);
    } catch (err) {
      console.error("Failed to load pair registry from RPC:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadChainData();
    const interval = setInterval(loadChainData, 15000);
    return () => clearInterval(interval);
  }, []);

  const { canonical, legacy } = filterStockpilePairedPools(pools);

  // Derive total hook tax
  const totalDerivedTax = canonical.reduce((sum, p) => sum + (p.fedToStockpile * 100n) / 75n, 0n);
  const reconciliation = reconcileHookTax(totalDerivedTax, treasuryBalance);

  function copyEmbedCode(tokenAddr: string) {
    const code = `<a href="https://scritindex.tech/pairs/${tokenAddr}"><img src="https://scritindex.tech/badge/${tokenAddr}.svg" alt="Stockpile-paired"></a>`;
    navigator.clipboard.writeText(code);
    setCopiedToken(tokenAddr);
    setTimeout(() => setCopiedToken(null), 2500);
  }

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
              RAIL A REGISTRY
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 11,
                color: "rgba(255,255,255,0.45)",
              }}
            >
              CHAIN 4663 · UNISWAP V4 HOOK
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
            Every stockpile-paired pool. Found by the chain, not by us.
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
            No allowlist, no curation. If a pool runs the sCRIT hook against $CRIT, it&apos;s here,
            and so is every wei it sent to the stockpile.
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
              onClick={loadChainData}
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
              {isLoading ? "RE-CHECKING RPC..." : "↺ RECHECK IN BROWSER"}
            </button>
          </div>
        </div>

        {/* Reconciliation Bar (Always Visible) */}
        <div
          style={{
            background:
              reconciliation.status === "PASS"
                ? "rgba(61,214,140,0.06)"
                : "rgba(255,75,75,0.12)",
            border: `1px solid ${
              reconciliation.status === "PASS" ? "rgba(61,214,140,0.3)" : "#ff4b4b"
            }`,
            borderRadius: 8,
            padding: 20,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 12,
                color: reconciliation.status === "PASS" ? "#3dd68c" : "#ff6b6b",
                fontWeight: 700,
                letterSpacing: "0.06em",
              }}
            >
              PROTOCOL RECONCILIATION BAR (HOOK TAX vs TREASURY INFLOW)
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 4,
                background:
                  reconciliation.status === "PASS"
                    ? "rgba(61,214,140,0.15)"
                    : "rgba(255,75,75,0.2)",
                color: reconciliation.status === "PASS" ? "#3dd68c" : "#ff4b4b",
                fontWeight: 700,
              }}
            >
              {reconciliation.status === "PASS"
                ? "✓ WITHIN TOLERANCE"
                : "✗ RECONCILIATION MISMATCH"}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 13,
            }}
          >
            <div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginBottom: 4 }}>
                HOOK TAX ALL POOLS (DERIVED)
              </div>
              <div style={{ color: "#ffffff", fontWeight: 700, fontSize: 16 }}>
                {reconciliation.formattedDerived} $CRIT
              </div>
            </div>

            <div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginBottom: 4 }}>
                RECEIVED BY STOCKPILE TREASURY
              </div>
              <div style={{ color: "#ffffff", fontWeight: 700, fontSize: 16 }}>
                {reconciliation.formattedReceived} $CRIT
              </div>
            </div>

            <div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginBottom: 4 }}>
                DIFFERENCE (TOLERANCE &lt; 100 CRIT)
              </div>
              <div
                style={{
                  color: reconciliation.isWithinTolerance ? "#3dd68c" : "#ff4b4b",
                  fontWeight: 700,
                  fontSize: 16,
                }}
              >
                {reconciliation.formattedDiff} $CRIT
              </div>
            </div>
          </div>

          <p
            style={{
              margin: "12px 0 0",
              fontSize: 11,
              color: "rgba(255,255,255,0.4)",
              fontFamily: "var(--font-mono, monospace)",
              lineHeight: 1.4,
            }}
          >
            * Tolerance rule: Allows minor arithmetic rounding and unswept fee delta pending swap batch settlement.
            If the hook tax does not route to the canonical Timelock treasury ({getCanonicalAddress("StockpileTreasury").slice(0, 10)}...), this bar turns red.
          </p>
        </div>

        {/* Registry Table Section */}
        <div
          style={{
            background: "rgba(18,20,18,0.7)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            overflow: "hidden",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <span
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 12,
                  color: "#e6b43b",
                  letterSpacing: "0.08em",
                  fontWeight: 600,
                }}
              >
                DISCOVERED POOLS (RANKED BY STOCKPILE CONTRIBUTION)
              </span>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                Zero is a feature. Discovery reports raw on-chain state without marketing curators.
              </p>
            </div>

            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 11,
                color: "rgba(255,255,255,0.6)",
              }}
            >
              {canonical.length} ACTIVE POOLS FOUND
            </span>
          </div>

          {canonical.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>⚖</div>
              <h3 style={{ color: "#ffffff", fontSize: 18, margin: "0 0 8px" }}>
                0 Stockpile-Paired Pools Initialized
              </h3>
              <p
                style={{
                  color: "rgba(255,255,255,0.5)",
                  maxWidth: 520,
                  margin: "0 auto 20px",
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                Zero is a feature. Mainnet project tokens paired against canonical $CRIT ({getCanonicalAddress("CRIT").slice(0, 10)}...)
                running Uniswap V4 hook 0x2044 will appear here automatically when deployed.
              </p>
              <Link
                href="/launch"
                style={{
                  display: "inline-block",
                  background: "#e6b43b",
                  color: "#121411",
                  fontFamily: "var(--font-mono, monospace)",
                  fontWeight: 700,
                  fontSize: 12,
                  padding: "8px 18px",
                  borderRadius: 4,
                  textDecoration: "none",
                }}
              >
                DEPLOY VIA RAIL A LAUNCHER
              </Link>
            </div>
          ) : (
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
                    <th style={{ padding: "12px 20px" }}>TOKEN / CA</th>
                    <th style={{ padding: "12px 16px" }}>CREATED</th>
                    <th style={{ padding: "12px 16px" }}>SWAPS</th>
                    <th style={{ padding: "12px 16px" }}>VOLUME ($CRIT)</th>
                    <th style={{ padding: "12px 16px", color: "#e6b43b" }}>FED TO STOCKPILE</th>
                    <th style={{ padding: "12px 16px" }}>ISSUER LP</th>
                    <th style={{ padding: "12px 20px", textAlign: "right" }}>BADGE</th>
                  </tr>
                </thead>
                <tbody>
                  {canonical.map((p) => (
                    <tr
                      key={p.poolId}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        fontFamily: "var(--font-mono, monospace)",
                      }}
                    >
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ fontWeight: 700, color: "#ffffff" }}>{p.tokenSymbol}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                          {p.token1.slice(0, 8)}...{p.token1.slice(-6)}
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", color: "rgba(255,255,255,0.7)" }}>
                        #{p.createdAtBlock.toString()}
                      </td>
                      <td style={{ padding: "14px 16px", color: "#ffffff" }}>{p.swapCount}</td>
                      <td style={{ padding: "14px 16px", color: "#ffffff" }}>
                        {Number(formatUnits(p.critVolume, 18)).toLocaleString()}
                      </td>
                      <td style={{ padding: "14px 16px", color: "#e6b43b", fontWeight: 700 }}>
                        {Number(formatUnits(p.fedToStockpile, 18)).toLocaleString()} $CRIT
                      </td>
                      <td style={{ padding: "14px 16px", color: "rgba(255,255,255,0.6)" }}>
                        {p.lpRecipient.slice(0, 6)}...
                      </td>
                      <td style={{ padding: "14px 20px", textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => copyEmbedCode(p.token1)}
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            color: copiedToken === p.token1 ? "#3dd68c" : "#e6b43b",
                            fontSize: 11,
                            fontFamily: "var(--font-mono, monospace)",
                            padding: "4px 8px",
                            borderRadius: 4,
                            cursor: "pointer",
                          }}
                        >
                          {copiedToken === p.token1 ? "✓ COPIED" : "EMBED BADGE"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Collapsed Legacy Section */}
        {legacy.length > 0 && (
          <div
            style={{
              background: "rgba(255,75,75,0.04)",
              border: "1px solid rgba(255,75,75,0.2)",
              borderRadius: 8,
              padding: 16,
              marginBottom: 32,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
              }}
              onClick={() => setShowLegacy(!showLegacy)}
            >
              <div>
                <span style={{ color: "#ff6b6b", fontWeight: 700, fontSize: 13, fontFamily: "var(--font-mono, monospace)" }}>
                  ⚠ LEGACY POOLS ({legacy.length})
                </span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginLeft: 10 }}>
                  Paired against the deprecated pre-Pons token ({ADDRESSES.deprecated.sCRIT_legacy.address.slice(0, 10)}...).
                </span>
              </div>
              <button
                type="button"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#ff6b6b",
                  cursor: "pointer",
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 12,
                }}
              >
                {showLegacy ? "HIDE ▲" : "EXPAND ▼"}
              </button>
            </div>

            {showLegacy && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,75,75,0.15)" }}>
                {legacy.map((lp) => (
                  <div
                    key={lp.poolId}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 0",
                      fontSize: 12,
                      fontFamily: "var(--font-mono, monospace)",
                      color: "rgba(255,255,255,0.7)",
                    }}
                  >
                    <span>{lp.tokenSymbol} ({lp.token1.slice(0, 10)}...)</span>
                    <span style={{ color: "#ff6b6b" }}>DEPRECATED PAIR</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Badge Embed Code Preview */}
        <div
          style={{
            background: "rgba(18,20,18,0.7)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            padding: 24,
          }}
        >
          <h3
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 13,
              color: "#e6b43b",
              letterSpacing: "0.08em",
              margin: "0 0 12px",
            }}
          >
            DYNAMIC BADGE INTEGRATION
          </h3>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, margin: "0 0 16px", lineHeight: 1.5 }}>
            Every Rail A token builder can embed a dynamic SVG badge that queries Robinhood Chain live.
            If the token uses any other hook or token, the badge automatically renders <b>NOT STOCKPILE-PAIRED</b>.
          </p>

          <div
            style={{
              background: "#0c0e0c",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 6,
              padding: 12,
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 12,
              color: "#3dd68c",
              wordBreak: "break-all",
            }}
          >
            &lt;a href=&quot;https://scritindex.tech/pairs/[token]&quot;&gt;&lt;img src=&quot;https://scritindex.tech/badge/[token].svg&quot; alt=&quot;Stockpile-paired&quot;&gt;&lt;/a&gt;
          </div>
        </div>
      </div>
    </div>
  );
}
