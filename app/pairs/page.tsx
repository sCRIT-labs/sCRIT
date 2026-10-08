"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { VerificationToolbar } from "@/components/VerificationToolbar";
import { publicClientFor } from "@/lib/scrit-evm";
import { getCanonicalAddress, ADDRESSES } from "@/lib/addresses";
import {
  filterStockpilePairedPools,
  reconcileHookTax,
  discoverPoolsFromChain,
  type DiscoveredPool,
} from "@/lib/pairs/discovery";
import { formatUnits } from "viem";
import {
  Scale,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Coins,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function PairsPage() {
  const [pools, setPools] = useState<DiscoveredPool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [blockNumber, setBlockNumber] = useState<bigint | null>(null);
  const [blockAgeSecs, setBlockAgeSecs] = useState<number | null>(null);
  const [treasuryBalance, setTreasuryBalance] = useState<bigint>(0n);
  const [showLegacy, setShowLegacy] = useState(false);
  const [showNearby, setShowNearby] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Guard against overlapping scans: a full discovery run takes longer
  // than any sane poll interval, so never stack a new one on top.
  const loadingRef = useRef(false);

  async function loadChainData() {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setIsLoading(true);
    try {
      const client = publicClientFor(4663);
      const latestBlock = await client.getBlock({ blockTag: "latest" });
      setBlockNumber(latestBlock.number);
      const age = Math.floor(Date.now() / 1000) - Number(latestBlock.timestamp);
      setBlockAgeSecs(Math.max(0, age));

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
      loadingRef.current = false;
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadChainData();
    const interval = setInterval(loadChainData, 60000);
    return () => clearInterval(interval);
  }, []);

  const { canonical, legacy, nearby } = filterStockpilePairedPools(pools);

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
    <PageShell>
      <div style={{ width: "100%", paddingBottom: 60 }}>
        {/* Editorial Header */}
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
              Rail A Ecosystem · Uniswap V4 Registry
            </span>
          </div>

          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(24px, 3.8vw, 44px)",
              fontWeight: 450,
              letterSpacing: "-0.035em",
              margin: "0 0 14px",
              lineHeight: 1.15,
              color: "var(--ink)",
            }}
          >
            Every stockpile-paired pool. <em>Found by the chain, not by us.</em>
          </h1>
          <p
            style={{
              color: "#5e645d",
              fontSize: "clamp(15px, 1.8vw, 17px)",
              lineHeight: 1.6,
              margin: 0,
              maxWidth: 780,
            }}
          >
            No allowlist, no curation. If a pool runs the sCRIT hook against $CRIT, it&apos;s here,
            and so is every wei it sent to the stockpile.
          </p>
        </div>

        {/* Universal Verification Toolbar */}
        <VerificationToolbar
          networkName="Robinhood Chain"
          chainId={4663}
          blockNumber={blockNumber}
          blockAgeSecs={blockAgeSecs}
          onRecheck={loadChainData}
          isRechecking={isLoading}
          recheckLabel="RECHECK IN BROWSER"
          recheckProgressText="SCANNING LOGS..."
          subtitle="Direct client-side log scan · Zero curation allowlist"
        />

        {/* Reconciliation Bar (Always Visible) */}
        <div
          style={{
            background: "#ffffff",
            border: `1px solid ${
              reconciliation.status === "PASS" ? "var(--line-ink)" : "rgba(211, 47, 47, 0.4)"
            }`,
            borderRadius: 6,
            boxShadow: "0 4px 20px rgba(24, 26, 24, 0.03)",
            overflow: "hidden",
            marginBottom: 28,
          }}
        >
          {/* Subheader */}
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid var(--line-ink)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              background: reconciliation.status === "PASS" ? "#faf8f2" : "#fdf2f2",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Scale size={16} color="var(--signal)" />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--ink)",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Stockpile Tax Hook Reconciliation
              </span>
            </div>

            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                padding: "3px 10px",
                borderRadius: 3,
                background:
                  reconciliation.status === "PASS"
                    ? "#f0f7f1"
                    : "#fdf2f2",
                color: reconciliation.status === "PASS" ? "#1b5e20" : "#b71c1c",
                fontWeight: 700,
                border: `1px solid ${reconciliation.status === "PASS" ? "rgba(46, 125, 50, 0.3)" : "rgba(211, 47, 47, 0.3)"}`,
              }}
            >
              {reconciliation.status === "PASS"
                ? "✓ WITHIN TOLERANCE"
                : "✗ RECONCILIATION MISMATCH"}
            </span>
          </div>

          {/* Metrics row */}
          <div style={{ padding: "20px 24px" }}>
            <div
              style={{
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
                  padding: "14px 16px",
                }}
              >
                <div style={{ color: "#7d8479", fontSize: 11, fontFamily: "var(--font-mono)", textTransform: "uppercase", marginBottom: 6 }}>
                  Hook Tax All Pools (Derived)
                </div>
                <div style={{ color: "var(--ink)", fontWeight: 700, fontSize: 20, fontFamily: "var(--font-mono)" }}>
                  {reconciliation.formattedDerived} <span style={{ fontSize: 14, fontWeight: 500, color: "#7d8479" }}>$CRIT</span>
                </div>
              </div>

              <div
                style={{
                  background: "#faf8f2",
                  border: "1px solid var(--line-ink)",
                  borderRadius: 4,
                  padding: "14px 16px",
                }}
              >
                <div style={{ color: "#7d8479", fontSize: 11, fontFamily: "var(--font-mono)", textTransform: "uppercase", marginBottom: 6 }}>
                  Received by Stockpile Treasury
                </div>
                <div style={{ color: "var(--ink)", fontWeight: 700, fontSize: 20, fontFamily: "var(--font-mono)" }}>
                  {reconciliation.formattedReceived} <span style={{ fontSize: 14, fontWeight: 500, color: "#7d8479" }}>$CRIT</span>
                </div>
              </div>

              <div
                style={{
                  background: reconciliation.isWithinTolerance ? "#f0f7f1" : "#fdf2f2",
                  border: `1px solid ${reconciliation.isWithinTolerance ? "rgba(46, 125, 50, 0.25)" : "rgba(211, 47, 47, 0.3)"}`,
                  borderRadius: 4,
                  padding: "14px 16px",
                }}
              >
                <div style={{ color: reconciliation.isWithinTolerance ? "#1b5e20" : "#b71c1c", fontSize: 11, fontFamily: "var(--font-mono)", textTransform: "uppercase", marginBottom: 6 }}>
                  Difference (Tolerance &lt; 100 CRIT)
                </div>
                <div
                  style={{
                    color: reconciliation.isWithinTolerance ? "#1b5e20" : "#b71c1c",
                    fontWeight: 700,
                    fontSize: 20,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {reconciliation.formattedDiff} <span style={{ fontSize: 14, fontWeight: 500 }}>$CRIT</span>
                </div>
              </div>
            </div>

            <p
              style={{
                margin: "16px 0 0",
                fontSize: 11.5,
                color: "#636b60",
                lineHeight: 1.5,
                borderTop: "1px solid var(--line-ink)",
                paddingTop: 12,
              }}
            >
              * Tolerance rule: Allows minor arithmetic rounding and unswept fee delta pending swap batch settlement.
              If the hook tax does not route to the canonical Stockpile Treasury ({getCanonicalAddress("StockpileTreasury").slice(0, 10)}...), this bar turns red.
            </p>
          </div>
        </div>

        {/* Discovered Pools Section Card */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid var(--line-ink)",
            borderRadius: 6,
            boxShadow: "0 4px 20px rgba(24, 26, 24, 0.03)",
            overflow: "hidden",
            marginBottom: 28,
          }}
        >
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid var(--line-ink)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              background: "#faf8f2",
            }}
          >
            <div>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--ink)",
                  letterSpacing: "0.06em",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                Discovered Pools · Ranked by Stockpile Contribution
              </span>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#636b60" }}>
                Zero is a feature. Discovery reports raw on-chain state without marketing curators.
              </p>
            </div>

            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 3,
                background: "#faf8f2",
                border: "1px solid var(--line-ink)",
                color: "var(--ink)",
                fontWeight: 600,
              }}
            >
              {canonical.length} ACTIVE POOLS FOUND
            </span>
          </div>

          {isLoading ? (
            <div style={{ padding: "28px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span className="scrit-radar" style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#8c6418" }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "#8c6418", letterSpacing: "0.06em" }}>
                    DISCOVERING RAIL A POOLS FROM POOLMANAGER LOGS...
                  </span>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#7d8479" }}>
                  Searching block #82941964 to head
                </span>
              </div>
              <div className="scrit-progress-bar" style={{ height: 3, marginBottom: 24 }}>
                <div className="scrit-progress-bar-fill" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px 20px",
                      background: "#faf8f2",
                      borderRadius: 4,
                      border: "1px solid var(--line-ink)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div className="scrit-skeleton" style={{ width: 26, height: 26, borderRadius: "50%" }} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div className="scrit-skeleton" style={{ width: 150 + (i * 20) % 60, height: 16 }} />
                        <div className="scrit-skeleton" style={{ width: 80, height: 12 }} />
                      </div>
                    </div>
                    <div className="scrit-skeleton" style={{ width: 120, height: 16 }} />
                    <div className="scrit-skeleton" style={{ width: 70, height: 16 }} />
                    <div className="scrit-skeleton" style={{ width: 110, height: 18 }} />
                  </div>
                ))}
              </div>
            </div>
          ) : canonical.length === 0 ? (
            <div style={{ padding: "56px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.8 }}>⚖</div>
              <h3 style={{ color: "var(--ink)", fontSize: 18, fontFamily: "var(--font-serif)", margin: "0 0 8px" }}>
                0 Stockpile-Paired Pools Initialized
              </h3>
              <p
                style={{
                  color: "#5e645d",
                  maxWidth: 520,
                  margin: "0 auto 24px",
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                Zero is a feature. Mainnet project tokens paired against canonical $CRIT ({getCanonicalAddress("CRIT").slice(0, 10)}...)
                running Uniswap V4 hook 0x2044 will appear here automatically when deployed.
              </p>
              <Link
                href="/launch"
                className="btn btn-gold"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 20px",
                  borderRadius: 4,
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                <span>DEPLOY VIA RAIL A LAUNCHER</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="dtable" style={{ width: "100%", margin: 0 }}>
                <thead>
                  <tr>
                    <th>TOKEN / CA</th>
                    <th>CREATED</th>
                    <th>SWAPS</th>
                    <th>VOLUME ($CRIT)</th>
                    <th style={{ color: "#8c6418" }}>FED TO STOCKPILE</th>
                    <th>ISSUER LP</th>
                    <th style={{ textAlign: "right" }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {canonical.map((p) => (
                    <tr key={p.poolId}>
                      <td>
                        <Link href={`/pairs/${p.projectToken}`} style={{ textDecoration: "none" }}>
                          <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 14 }}>${p.tokenSymbol}</div>
                          <div style={{ fontSize: 11, color: "#7d8479", fontFamily: "var(--font-mono)" }}>
                            {p.projectToken.slice(0, 8)}...{p.projectToken.slice(-6)}
                          </div>
                        </Link>
                      </td>
                      <td style={{ color: "#5e645d", fontFamily: "var(--font-mono)" }}>
                        #{p.createdAtBlock.toString()}
                      </td>
                      <td style={{ color: "var(--ink)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                        {p.swapCount}
                      </td>
                      <td style={{ color: "var(--ink)", fontFamily: "var(--font-mono)" }}>
                        {Number(formatUnits(p.critVolume, 18)).toLocaleString()}
                      </td>
                      <td style={{ color: "#8c6418", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                        {Number(formatUnits(p.fedToStockpile, 18)).toLocaleString()} $CRIT
                      </td>
                      <td style={{ color: "#7d8479", fontFamily: "var(--font-mono)" }}>
                        {p.lpRecipient.slice(0, 6)}...
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 8, justifyContent: "flex-end" }}>
                          <Link
                            href={`/pairs/${p.projectToken}`}
                            className="btn btn-ghost"
                            style={{
                              padding: "4px 10px",
                              fontSize: 11,
                              borderRadius: 3,
                              textDecoration: "none",
                              fontFamily: "var(--font-mono)",
                              fontWeight: 600,
                            }}
                          >
                            VIEW
                          </Link>
                          <button
                            type="button"
                            onClick={() => copyEmbedCode(p.projectToken)}
                            className="launch-chip-btn"
                            style={{
                              padding: "4px 10px",
                              fontSize: 11,
                              borderRadius: 3,
                              fontWeight: 600,
                              color: copiedToken === p.projectToken ? "#1b5e20" : "#8c6418",
                              background: copiedToken === p.projectToken ? "#f0f7f1" : "#fdfaf3",
                              borderColor: copiedToken === p.projectToken ? "rgba(46, 125, 50, 0.3)" : "rgba(201, 146, 46, 0.35)",
                            }}
                          >
                            {copiedToken === p.projectToken ? "✓ COPIED" : "EMBED BADGE"}
                          </button>
                        </div>
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
              background: "#faf8f2",
              border: "1px solid var(--line-ink)",
              borderRadius: 6,
              padding: 18,
              marginBottom: 28,
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
                <span style={{ color: "#b71c1c", fontWeight: 700, fontSize: 12, fontFamily: "var(--font-mono)" }}>
                  ⚠ LEGACY POOLS ({legacy.length})
                </span>
                <span style={{ fontSize: 12, color: "#636b60", marginLeft: 10 }}>
                  Paired against the deprecated pre-Pons token ({ADDRESSES.deprecated.sCRIT_legacy.address.slice(0, 10)}...).
                </span>
              </div>
              <button
                type="button"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#636b60",
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontWeight: 600,
                }}
              >
                <span>{showLegacy ? "HIDE" : "EXPAND"}</span>
                {showLegacy ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {showLegacy && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line-ink)" }}>
                {legacy.map((lp) => (
                  <div
                    key={lp.poolId}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 0",
                      fontSize: 12,
                      fontFamily: "var(--font-mono)",
                      color: "#636b60",
                    }}
                  >
                    <span>${lp.tokenSymbol} ({lp.projectToken.slice(0, 10)}...)</span>
                    <span style={{ color: "#b71c1c", fontWeight: 600 }}>Paired with legacy token · Non-canonical</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Other on-chain CRIT pools (found by the same scan, never stockpile-paired) */}
        {nearby.length > 0 && (
          <div
            style={{
              background: "rgba(0,0,0,0.02)",
              border: "1px solid var(--line-ink)",
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
              onClick={() => setShowNearby(!showNearby)}
            >
              <div>
                <span style={{ color: "#636b60", fontWeight: 700, fontSize: 13, fontFamily: "var(--font-mono)" }}>
                  ◌ OTHER CRIT POOLS ({nearby.length})
                </span>
                <span style={{ fontSize: 12, color: "#7d8479", marginLeft: 10 }}>
                  Exist on-chain but run no canonical hook — never stockpile-paired.
                </span>
              </div>
              <button
                type="button"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#636b60",
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                }}
              >
                {showNearby ? "HIDE ▲" : "EXPAND ▼"}
              </button>
            </div>

            {showNearby && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line-ink)" }}>
                {nearby.map((np) => (
                  <div
                    key={np.poolId}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 0",
                      fontSize: 12,
                      fontFamily: "var(--font-mono)",
                      color: "#636b60",
                    }}
                  >
                    <span>${np.tokenSymbol} ({np.projectToken.slice(0, 10)}...)</span>
                    <span style={{ color: "#8c6418", fontWeight: 600 }}>{np.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}
