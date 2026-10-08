"use client";

import React, { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

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
          gap: "6px",
          background: "rgba(217, 169, 46, 0.12)",
          border: "1px solid rgba(217, 169, 46, 0.35)",
          padding: "2px 8px",
          borderRadius: "999px",
          fontSize: "9.5px",
          fontFamily: "var(--font-mono, monospace)",
          letterSpacing: "0.04em",
          color: "#f6ede0",
          textTransform: "none",
        }}
      >
        <span style={{ color: "#d9a92e", fontWeight: 700 }}>sCRIT CA:</span>
        <span style={{ opacity: 0.9 }}>
          0x3517...d78f
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "Copied sCRIT CA to clipboard" : "Copy sCRIT Contract Address"}
          title={copied ? "Copied!" : "Click to copy full CA"}
          style={{
            background: "transparent",
            border: "none",
            padding: "2px",
            color: copied ? "#4ade80" : "#d9a92e",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            transition: "color 0.15s ease",
          }}
        >
          {copied ? <Check size={11} strokeWidth={2.5} /> : <Copy size={10} strokeWidth={2} />}
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
          alignItems: "center",
          gap: "10px",
          background: "rgba(12, 16, 14, 0.85)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(217, 169, 46, 0.28)",
          padding: "6px 14px",
          borderRadius: "999px",
          fontSize: "12px",
          fontFamily: "var(--font-mono, monospace)",
          color: "#f6ede0",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
        }}
      >
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "#22c55e",
            boxShadow: "0 0 8px #22c55e",
            display: "inline-block",
          }}
        />
        <span style={{ color: "#d9a92e", fontWeight: 700, fontSize: "11px", letterSpacing: "0.06em" }}>
          OFFICIAL sCRIT CA:
        </span>
        <span style={{ fontSize: "12px", letterSpacing: "0.02em" }}>
          0x3517...d78f
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy contract address"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            background: copied ? "rgba(34, 197, 94, 0.2)" : "rgba(217, 169, 46, 0.15)",
            border: copied ? "1px solid rgba(34, 197, 94, 0.5)" : "1px solid rgba(217, 169, 46, 0.4)",
            borderRadius: "6px",
            padding: "3px 8px",
            color: copied ? "#4ade80" : "#d9a92e",
            fontSize: "11px",
            cursor: "pointer",
            fontFamily: "inherit",
            fontWeight: 600,
            transition: "all 0.15s ease",
          }}
        >
          {copied ? <Check size={11} strokeWidth={2.5} /> : <Copy size={11} strokeWidth={2} />}
          <span>{copied ? "Copied!" : "Copy"}</span>
        </button>
        <a
          href={SCRIT_EXPLORER_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="Open in Explorer"
          style={{
            color: "rgba(246, 237, 224, 0.6)",
            display: "inline-flex",
            alignItems: "center",
            transition: "color 0.15s",
          }}
        >
          <ExternalLink size={12} strokeWidth={2} />
        </a>
      </div>
    );
  }

  // Footer Variant
  return (
    <div
      className={`scrit-ca-footer-card ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "8px",
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        padding: "8px 12px",
        borderRadius: "8px",
        fontSize: "12px",
        fontFamily: "var(--font-mono, monospace)",
        marginTop: "12px",
        maxWidth: "100%",
      }}
    >
      <span style={{ color: "#d9a92e", fontWeight: 600, fontSize: "11px" }}>sCRIT CA:</span>
      <code
        style={{
          color: "rgba(255, 255, 255, 0.9)",
          fontSize: "11px",
          wordBreak: "break-all",
        }}
      >
        {SCRIT_CA}
      </code>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy full CA"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          background: copied ? "rgba(34, 197, 94, 0.25)" : "rgba(217, 169, 46, 0.2)",
          border: "none",
          borderRadius: "4px",
          padding: "3px 8px",
          color: copied ? "#4ade80" : "#d9a92e",
          fontSize: "11px",
          cursor: "pointer",
          fontFamily: "inherit",
          marginLeft: "auto",
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
          color: "rgba(255, 255, 255, 0.5)",
          display: "inline-flex",
          alignItems: "center",
          marginLeft: "4px",
        }}
      >
        <ExternalLink size={12} strokeWidth={2} />
      </a>
    </div>
  );
}
