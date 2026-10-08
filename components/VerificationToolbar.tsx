"use client";

import React from "react";
import { RefreshCw } from "lucide-react";

interface VerificationToolbarProps {
  networkName?: string;
  chainId?: number;
  blockNumber: bigint | number | null;
  blockAgeSecs?: number | null;
  onRecheck?: () => void;
  isRechecking?: boolean;
  recheckLabel?: string;
  recheckProgressText?: string;
  extraControls?: React.ReactNode;
  subtitle?: string;
}

/**
 * Universal Cryptographic Verification Toolbar for sCRIT Credibility Pages
 * Provides consistent, institutional-grade layout for live chain metadata and recheck controls.
 */
export function VerificationToolbar({
  networkName = "Robinhood Chain",
  chainId = 4663,
  blockNumber,
  blockAgeSecs,
  onRecheck,
  isRechecking = false,
  recheckLabel = "RECHECK IN BROWSER",
  recheckProgressText,
  extraControls,
  subtitle = "Direct client-side RPC read · Zero server proxy",
}: VerificationToolbarProps) {
  const formattedBlock =
    blockNumber !== null && blockNumber !== undefined && blockNumber > 0n
      ? `#${BigInt(blockNumber).toLocaleString("en-US")}`
      : "CONNECTING...";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 14,
        padding: "12px 18px",
        background: "#ffffff",
        border: "1px solid var(--line-ink, rgba(24, 26, 24, 0.12))",
        borderRadius: 6,
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.02)",
        marginBottom: 24,
      }}
    >
      {/* Left: Chain Metadata & Live Pulse */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 14px",
            background: "#faf8f2",
            border: "1px solid rgba(24, 26, 24, 0.1)",
            borderRadius: 4,
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 12,
            color: "#181a18",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }}>
            <span
              className="animate-ping"
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                background: "#2e7d32",
                opacity: 0.75,
              }}
            />
            <span
              style={{
                position: "relative",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#2e7d32",
              }}
            />
          </span>
          <span style={{ fontWeight: 700, color: "var(--ink)" }}>{networkName}</span>
          <span style={{ color: "#7d8479" }}>·</span>
          <span style={{ fontWeight: 600 }}>{formattedBlock}</span>
          {blockAgeSecs !== null && blockAgeSecs !== undefined && (
            <span style={{ color: "#8c6418", fontWeight: 500 }}>({blockAgeSecs}s ago)</span>
          )}
        </div>

        {subtitle && (
          <span
            style={{
              fontSize: 11.5,
              color: "#636b60",
              fontFamily: "var(--font-mono, monospace)",
              whiteSpace: "nowrap",
            }}
          >
            {subtitle}
          </span>
        )}
      </div>

      {/* Right: Actions / Extra Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {extraControls}

        {onRecheck && (
          <button
            type="button"
            onClick={onRecheck}
            disabled={isRechecking}
            className="scrit-verify-btn"
            style={{ whiteSpace: "nowrap" }}
          >
            <RefreshCw size={13} className={isRechecking ? "animate-spin" : ""} />
            <span>
              {isRechecking
                ? recheckProgressText || "RE-CHECKING RPC..."
                : recheckLabel}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
