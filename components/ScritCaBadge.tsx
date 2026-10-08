"use client";

import React, { useState } from "react";
import { Check, Copy, ExternalLink, ShieldCheck } from "lucide-react";

export const SCRIT_CA = "0x351776b6fba6a910c32e46f3775aa946a724d78f";
export const SCRIT_EXPLORER_URL = `https://robinhoodchain.blockscout.com/token/${SCRIT_CA}`;

interface ScritCaBadgeProps {
  className?: string;
  variant?: "announcement" | "hero" | "footer";
}

export function ScritCaBadge({ className = "", variant = "announcement" }: ScritCaBadgeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(SCRIT_CA);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is restricted
      const textArea = document.createElement("textarea");
      textArea.value = SCRIT_CA;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (variant === "announcement") {
    return (
      <div
        className={`scrit-ca-announcement-wrap ${className}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          background: "rgba(217, 169, 46, 0.12)",
          border: "1px solid rgba(217, 169, 46, 0.35)",
          padding: "2px 10px",
          borderRadius: "999px",
          fontSize: "9.5px",
          fontFamily: "var(--font-mono, monospace)",
          letterSpacing: "0.03em",
          color: "#f6ede0",
          textTransform: "none",
          maxWidth: "100%",
        }}
      >
        <span style={{ color: "#d9a92e", fontWeight: 700, whiteSpace: "nowrap" }}>sCRIT CA:</span>
        <code
          style={{
            color: "#ffffff",
            fontFamily: "inherit",
            fontSize: "9.5px",
            letterSpacing: "0.02em",
            wordBreak: "break-all",
          }}
        >
          {SCRIT_CA}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "Copied sCRIT CA to clipboard" : "Copy sCRIT Contract Address"}
          title={copied ? "Copied!" : "Click to copy full CA"}
          style={{
            background: copied ? "rgba(34, 197, 94, 0.2)" : "transparent",
            border: "none",
            borderRadius: "4px",
            padding: "2px 6px",
            color: copied ? "#4ade80" : "#d9a92e",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "9px",
            fontWeight: 600,
            transition: "all 0.15s ease",
            whiteSpace: "nowrap",
          }}
        >
          {copied ? <Check size={11} strokeWidth={2.5} /> : <Copy size={10} strokeWidth={2} />}
          <span>{copied ? "Copied!" : "Copy"}</span>
        </button>
        <a
          href={SCRIT_EXPLORER_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="View on Robinhood Blockscout"
          aria-label="View sCRIT on Robinhood Blockscout"
          style={{
            color: "rgba(246, 237, 224, 0.6)",
            display: "inline-flex",
            alignItems: "center",
            padding: "2px",
            textDecoration: "none",
          }}
        >
          <ExternalLink size={10} strokeWidth={2} />
        </a>
      </div>
    );
  }

  if (variant === "hero") {
    return (
      <div
        className={`scrit-ca-hero-card ${className}`}
        style={{
          display: "inline-flex",
          flexDirection: "column",
          gap: "8px",
          background: "rgba(10, 14, 12, 0.9)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(217, 169, 46, 0.38)",
          padding: "10px 16px",
          borderRadius: "12px",
          color: "#f6ede0",
          boxShadow: "0 16px 36px rgba(0, 0, 0, 0.6), 0 0 24px rgba(217, 169, 46, 0.15)",
          maxWidth: "min(680px, 94vw)",
          pointerEvents: "auto",
        }}
      >
        {/* Top meta row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "8px",
            fontSize: "11px",
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#22c55e",
                boxShadow: "0 0 8px #22c55e",
                display: "inline-block",
              }}
            />
            <span style={{ color: "#d9a92e", fontWeight: 700, letterSpacing: "0.06em", fontSize: "11px" }}>
              OFFICIAL sCRIT CONTRACT ADDRESS
            </span>
          </div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              color: "rgba(246, 237, 224, 0.7)",
              fontSize: "10.5px",
            }}
          >
            <ShieldCheck size={12} color="#d9a92e" />
            Robinhood Chain Mainnet
          </span>
        </div>

        {/* Address and actions row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
            background: "rgba(0, 0, 0, 0.45)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            padding: "8px 12px",
            borderRadius: "8px",
          }}
        >
          <code
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "clamp(11px, 2.7vw, 13px)",
              fontWeight: 600,
              color: "#ffffff",
              letterSpacing: "0.03em",
              wordBreak: "break-all",
              userSelect: "all",
            }}
          >
            {SCRIT_CA}
          </code>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              marginLeft: "auto",
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copy full sCRIT contract address"
              title={copied ? "Copied!" : "Click to copy full CA"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: copied ? "rgba(34, 197, 94, 0.25)" : "rgba(217, 169, 46, 0.2)",
                border: copied ? "1px solid rgba(34, 197, 94, 0.6)" : "1px solid rgba(217, 169, 46, 0.45)",
                borderRadius: "6px",
                padding: "4px 10px",
                color: copied ? "#4ade80" : "#f2cf77",
                fontSize: "11px",
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: 600,
                transition: "all 0.15s ease",
              }}
            >
              {copied ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} strokeWidth={2} />}
              <span>{copied ? "Copied!" : "Copy CA"}</span>
            </button>

            <a
              href={SCRIT_EXPLORER_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="Inspect on Blockscout Explorer"
              aria-label="Inspect sCRIT on Robinhood Chain Blockscout"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "6px",
                padding: "4px 9px",
                color: "rgba(246, 237, 224, 0.85)",
                fontSize: "11px",
                fontFamily: "inherit",
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
            >
              <span>Blockscout</span>
              <ExternalLink size={11} strokeWidth={2} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Footer Variant
  return (
    <div
      className={`scrit-ca-footer-card ${className}`}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        gap: "6px",
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        padding: "10px 14px",
        borderRadius: "8px",
        fontSize: "12px",
        fontFamily: "var(--font-mono, monospace)",
        marginTop: "12px",
        maxWidth: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ color: "#d9a92e", fontWeight: 700, fontSize: "11px", letterSpacing: "0.06em" }}>
          OFFICIAL CONTRACT ADDRESS:
        </span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <code
          style={{
            color: "rgba(255, 255, 255, 0.95)",
            fontSize: "11.5px",
            letterSpacing: "0.02em",
            wordBreak: "break-all",
            userSelect: "all",
          }}
        >
          {SCRIT_CA}
        </code>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginLeft: "auto" }}>
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy full CA"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              background: copied ? "rgba(34, 197, 94, 0.25)" : "rgba(217, 169, 46, 0.2)",
              border: copied ? "1px solid rgba(34, 197, 94, 0.6)" : "1px solid rgba(217, 169, 46, 0.4)",
              borderRadius: "4px",
              padding: "3px 8px",
              color: copied ? "#4ade80" : "#d9a92e",
              fontSize: "11px",
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 600,
            }}
          >
            {copied ? <Check size={11} strokeWidth={2.5} /> : <Copy size={11} strokeWidth={2} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
          <a
            href={SCRIT_EXPLORER_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View contract on Blockscout"
            style={{
              color: "rgba(255, 255, 255, 0.6)",
              display: "inline-flex",
              alignItems: "center",
              padding: "2px",
            }}
          >
            <ExternalLink size={12} strokeWidth={2} />
          </a>
        </div>
      </div>
    </div>
  );
}
