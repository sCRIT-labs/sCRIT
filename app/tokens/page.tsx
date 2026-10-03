"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import ChainLogo from "@/components/ChainLogo";
import {
  LaunchedToken,
  filterTokens,
  listLocalTokens,
  mergeTokens,
} from "@/lib/tokens";
import { HOOD_MAINNET, HOOD_TESTNET } from "@/lib/scrit";
import {
  Search,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Rocket,
  ShieldCheck,
  Coins,
  Layers,
  ArrowRight,
  Filter,
  Loader2,
} from "lucide-react";

export default function TokensPage() {
  const [tokens, setTokens] = useState<LaunchedToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeChain, setActiveChain] = useState<4663 | 46630 | "all" | "local">("all");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/tokens")
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        const dbTokens: LaunchedToken[] = Array.isArray(data.tokens) ? data.tokens : [];
        const localTokens = listLocalTokens();
        setTokens(mergeTokens(dbTokens, localTokens));
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setTokens(listLocalTokens());
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const filteredTokens = useMemo(() => {
    return filterTokens(tokens, activeChain, search);
  }, [tokens, activeChain, search]);

  function copyText(text: string, key: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2200);
    }
  }

  function getExplorer(chainId: number) {
    return chainId === 4663 ? HOOD_MAINNET.explorer : HOOD_TESTNET.explorer;
  }

  return (
    <PageShell>
      <div style={{ width: "100%", paddingBottom: 60 }}>
        {/* Page Hero Header */}
        <div style={{ marginBottom: 32, paddingTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 12px",
                  borderRadius: 2,
                  background: "rgba(83, 103, 83, 0.08)",
                  border: "1px solid rgba(83, 103, 83, 0.2)",
                  marginBottom: 12,
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
                  Rail A Ecosystem · Directory
                </span>
              </div>
              <h1
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "clamp(26px, 3.4vw, 36px)",
                  lineHeight: 1.15,
                  fontWeight: 400,
                  letterSpacing: "-0.02em",
                  color: "var(--ink)",
                  margin: "0 0 10px",
                }}
              >
                Launched Ecosystem Tokens
              </h1>
              <p
                style={{
                  color: "#5e645d",
                  fontSize: 15,
                  maxWidth: 720,
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                Explore ecosystem tokens struck via the Rail A launcher and anchored directly to{" "}
                <b style={{ color: "#8c6418" }}>sCRIT liquidity pools</b> on Robinhood Chain mainnet and testnet.
              </p>
            </div>

            <Link
              href="/launch"
              className="btn btn-gold"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                textDecoration: "none",
                fontWeight: 600,
                borderRadius: 4,
                marginBottom: 4,
              }}
            >
              <Rocket size={16} />
              <span>Launch a Token</span>
            </Link>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="token-filter-bar">
          {/* Chain Filters */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className={`launch-chip-btn ${activeChain === "all" ? "active" : ""}`}
              onClick={() => setActiveChain("all")}
              style={{ fontWeight: 600 }}
            >
              All Tokens ({tokens.length})
            </button>
            <button
              type="button"
              className={`launch-chip-btn ${activeChain === 4663 ? "active" : ""}`}
              onClick={() => setActiveChain(4663)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <ChainLogo kind="hood" size={12} />
              <span>Robinhood Mainnet (4663)</span>
            </button>
            <button
              type="button"
              className={`launch-chip-btn ${activeChain === 46630 ? "active" : ""}`}
              onClick={() => setActiveChain(46630)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <ChainLogo kind="hood" size={12} />
              <span>Robinhood Testnet (46630)</span>
            </button>
          </div>

          {/* Search Box */}
          <div
            style={{
              position: "relative",
              minWidth: 260,
              flex: "1 1 260px",
              maxWidth: 360,
            }}
          >
            <Search
              size={15}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#7d8479",
              }}
            />
            <input
              type="text"
              placeholder="Search by symbol, name, or address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="field"
              style={{
                paddingLeft: 34,
                height: 38,
                fontSize: 13,
                background: "#ffffff",
              }}
            />
          </div>
        </div>

        {/* Tokens Grid / Loading State */}
        {loading ? (
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 10px", background: "rgba(83, 103, 83, 0.06)", border: "1px solid rgba(83, 103, 83, 0.15)", borderRadius: 3, marginBottom: 16 }}>
              <Loader2 size={12} className="spin" color="var(--moss)" />
              <span className="mono-sm" style={{ fontSize: 11, color: "var(--moss)", fontWeight: 600 }}>
                Querying on-chain indexed token registry...
              </span>
            </div>
            <div className="tokens-directory-grid">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="token-card" style={{ pointerEvents: "none" }}>
                  <div className="token-card-header">
                    <div className="token-card-avatar scrit-skeleton" style={{ width: 44, height: 44, borderRadius: 8 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                        <div className="scrit-skeleton" style={{ width: 80, height: 18 }} />
                        <div className="scrit-skeleton" style={{ width: 56, height: 16, borderRadius: 3 }} />
                      </div>
                      <div className="scrit-skeleton" style={{ width: 140, height: 13 }} />
                    </div>
                  </div>

                  <div style={{ margin: "14px 0 16px" }}>
                    <div className="scrit-skeleton" style={{ width: 110, height: 18, borderRadius: 3, marginBottom: 8 }} />
                    <div className="scrit-skeleton" style={{ width: "100%", height: 12, marginBottom: 4 }} />
                    <div className="scrit-skeleton" style={{ width: "70%", height: 12 }} />
                  </div>

                  <div className="token-card-metrics" style={{ margin: "14px 0", background: "rgba(83, 103, 83, 0.04)" }}>
                    <div className="token-card-metric-col">
                      <div className="scrit-skeleton" style={{ width: 50, height: 10, marginBottom: 6 }} />
                      <div className="scrit-skeleton" style={{ width: 80, height: 14 }} />
                    </div>
                    <div className="token-card-metric-col">
                      <div className="scrit-skeleton" style={{ width: 60, height: 10, marginBottom: 6 }} />
                      <div className="scrit-skeleton" style={{ width: 70, height: 14 }} />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line-ink)" }}>
                    <div className="scrit-skeleton" style={{ flex: 1, height: 32, borderRadius: 4 }} />
                    <div className="scrit-skeleton" style={{ width: 32, height: 32, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredTokens.length > 0 ? (
          <div className="tokens-directory-grid">
            {filteredTokens.map((token) => {
              const explorer = getExplorer(token.chainId);
              return (
                <div key={token.id} className="token-card">
                  {/* Card Header: Avatar & Title */}
                  <div className="token-card-header">
                    <div className="token-card-avatar">
                      {token.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={token.logoUrl}
                          alt={token.symbol}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontWeight: 700,
                            fontSize: 13,
                            color: "var(--moss)",
                          }}
                        >
                          {token.symbol.slice(0, 3)}
                        </span>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: 16,
                            fontWeight: 700,
                            color: "var(--ink)",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          ${token.symbol}
                        </h3>
                        <span
                          className="scrit-nav-pill-active"
                          style={{
                            fontSize: 10,
                            padding: "2px 7px",
                            background: token.chainId === 4663 ? "#fbf6ea" : "#edf2ed",
                            borderColor: token.chainId === 4663 ? "rgba(184, 134, 11, 0.4)" : "rgba(83, 103, 83, 0.3)",
                            color: token.chainId === 4663 ? "#8c6418" : "#2e4a2e",
                          }}
                        >
                          {token.chainId === 4663 ? "Mainnet" : "Testnet"}
                        </span>
                      </div>
                      <p
                        style={{
                          margin: "2px 0 0",
                          fontSize: 12,
                          color: "#636b60",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {token.name}
                      </p>
                    </div>
                  </div>

                  {/* Backing Badge & Description */}
                  <div>
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: 10.5,
                        fontFamily: "var(--font-mono)",
                        color: "#536753",
                        background: "#f0f4f0",
                        border: "1px solid rgba(83, 103, 83, 0.2)",
                        padding: "2px 8px",
                        borderRadius: 3,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        fontWeight: 600,
                        marginBottom: 6,
                      }}
                    >
                      {token.backingCategory}
                    </span>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        color: "#72786f",
                        lineHeight: 1.5,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {token.description}
                    </p>
                  </div>

                  {/* Pool Economics Stats */}
                  <div className="token-card-stats">
                    <div>
                      <span className="mono-sm" style={{ color: "#7d8479", fontSize: 10.5, display: "block" }}>
                        POOLED SUPPLY
                      </span>
                      <span className="mono-sm" style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
                        {token.pooled} ${token.symbol}
                      </span>
                    </div>
                    <div>
                      <span className="mono-sm" style={{ color: "#7d8479", fontSize: 10.5, display: "block" }}>
                        {token.symbol === "SCRIT" ? "BASE PAIR" : "sCRIT ANCHOR"}
                      </span>
                      <span className="mono-sm" style={{ fontSize: 12, fontWeight: 700, color: "#8c6418" }}>
                        {token.symbol === "SCRIT"
                          ? (token.chainId === 4663 ? "0.25 ETH (WETH)" : "0.1 ETH (WETH)")
                          : `${token.scritAmount} sCRIT`}
                      </span>
                    </div>
                  </div>

                  {/* Pool Mechanism Tag */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 11,
                      fontFamily: "var(--font-mono)",
                      color: token.symbol === "SCRIT" ? "#355e3b" : token.poolType === "v4_hook" ? "#b8962e" : "#636b60",
                    }}
                  >
                    <ShieldCheck size={13} />
                    <span>
                      {token.symbol === "SCRIT"
                        ? (token.chainId === 4663
                            ? "Uniswap V4 Base Market · 0.30% LP Fee (Untaxed)"
                            : "Uniswap V3 Rehearsal · 0.30% Fee (Untaxed)")
                        : token.poolType === "v4_hook"
                        ? "Uniswap V4 Hook · 2.5% Tax (75% Reserve / 25% Ops)"
                        : "Uniswap V3 Rehearsal · 0% Hook Fee"}
                    </span>
                  </div>

                  {/* CA & Explorer Bar */}
                  <div
                    style={{
                      paddingTop: 10,
                      borderTop: "1px solid var(--line-ink)",
                      fontSize: 11,
                      fontFamily: "var(--font-mono)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ color: "#7d8479", fontWeight: 700, fontSize: 11, letterSpacing: "0.06em" }}>
                        CA :
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Link
                          href={`/swap?token=${token.address}`}
                          className="launch-chip-btn"
                          style={{
                            textDecoration: "none",
                            padding: "3px 10px",
                            fontSize: 11,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            background: "var(--signal)",
                            color: "#ffffff",
                            fontWeight: 700,
                            border: "none",
                          }}
                          title="Trade on sCRIT V4 Desk"
                        >
                          <span>Trade</span>
                          <ArrowRight size={11} />
                        </Link>

                        <button
                          type="button"
                          className="launch-chip-btn"
                          onClick={() => copyText(token.address, `token-${token.id}`)}
                          style={{ padding: "3px 8px", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}
                          title="Copy CA"
                        >
                          {copiedKey === `token-${token.id}` ? (
                            <>
                              <Check size={12} color="#b8962e" />
                              <span style={{ color: "#b8962e", fontWeight: 600 }}>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        <a
                          href={`${explorer}/tx/${token.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="launch-chip-btn"
                          style={{ textDecoration: "none", padding: "3px 8px", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}
                          title="View deploy transaction"
                        >
                          <span>Tx</span>
                          <ExternalLink size={11} />
                        </a>
                      </div>
                    </div>

                    <a
                      href={`${explorer}/address/${token.address}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "6px 10px",
                        background: "#faf8f2",
                        border: "1px solid rgba(24, 26, 24, 0.12)",
                        borderRadius: 4,
                        color: "#8c6418",
                        textDecoration: "none",
                        fontSize: 11,
                        lineHeight: 1.4,
                        wordBreak: "break-all",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--signal)";
                        e.currentTarget.style.background = "#ffffff";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "rgba(24, 26, 24, 0.12)";
                        e.currentTarget.style.background = "#faf8f2";
                      }}
                      title="Open in Robinhood Chain Explorer"
                    >
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 550 }}>{token.address}</span>
                      <ExternalLink size={11} style={{ flexShrink: 0, marginLeft: 6 }} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div
            className="scrit-reveal"
            style={{
              padding: "50px 20px",
              textAlign: "center",
              background: "#ffffff",
              border: "1px solid var(--line-ink)",
              borderRadius: 6,
              marginTop: 20,
            }}
          >
            <Coins size={36} color="#7d8479" style={{ margin: "0 auto 12px", opacity: 0.6 }} />
            <h3 style={{ fontSize: 18, color: "var(--ink)", margin: "0 0 6px" }}>
              {tokens.length === 0 ? "No tokens have been launched yet" : "No tokens matched your query"}
            </h3>
            <p style={{ fontSize: 13, color: "#636b60", margin: "0 0 16px", maxWidth: 460, marginInline: "auto" }}>
              {tokens.length === 0
                ? "Be the first verified issuer to strike a pair against sCRIT reserve liquidity on Robinhood Chain."
                : "Try adjusting your search criteria or switch network filter tabs to discover other ecosystem tokens."}
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
              {tokens.length > 0 ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setSearch("");
                    setActiveChain("all");
                  }}
                >
                  Clear Filters
                </button>
              ) : null}
              <Link href="/launch" className="btn btn-gold" style={{ textDecoration: "none" }}>
                Strike First Token Pair
              </Link>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
