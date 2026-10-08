"use client";

import React, { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

export const SCRIT_CA = "0x351776b6fba6a910c32e46f3775aa946a724d78f";
export const SCRIT_EXPLORER_URL = `https://robinhoodchain.blockscout.com/token/${SCRIT_CA}`;

interface ScritCaBadgeProps {
  className?: string;
  variant?: "hero" | "footer" | "announcement";
}

export function ScritCaBadge({ className = "", variant = "hero" }: ScritCaBadgeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(SCRIT_CA);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
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

  if (variant === "footer") {
    return (
      <div
        className={`scrit-ca-footer ${className}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "10px",
          marginTop: "14px",
          padding: "6px 12px",
          borderRadius: "6px",
          background: "rgba(255, 255, 255, 0.04)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: "12px",
          color: "rgba(255, 255, 255, 0.7)",
          maxWidth: "100%",
          flexWrap: "wrap",
        }}
      >
        <span style={{ color: "#d9a92e", fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em" }}>
          CA
        </span>
        <code
          style={{
            color: "#ffffff",
            fontSize: "11px",
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
            aria-label="Copy CA"
            title={copied ? "Copied!" : "Copy CA"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              background: "transparent",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "4px",
              padding: "2px 7px",
              color: copied ? "#ffffff" : "rgba(255, 255, 255, 0.8)",
              fontSize: "10.5px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {copied ? <Check size={11} strokeWidth={2.5} /> : <Copy size={11} strokeWidth={2} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
          <a
            href={SCRIT_EXPLORER_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View on Blockscout"
            title="View on Blockscout"
            style={{
              color: "rgba(255, 255, 255, 0.5)",
              display: "inline-flex",
              alignItems: "center",
              padding: "2px",
              transition: "color 0.15s ease",
            }}
          >
            <ExternalLink size={12} strokeWidth={2} />
          </a>
        </div>
      </div>
    );
  }

  // Ultra-clean institutional pill (Hero, Swap, etc.)
  return (
    <div
      className={`scrit-ca-clean-pill ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        padding: "6px 14px",
        borderRadius: "999px",
        background: "rgba(10, 12, 11, 0.72)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.14)",
        fontFamily: "var(--font-mono, monospace)",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
        maxWidth: "min(620px, 94vw)",
        pointerEvents: "auto",
        transition: "border-color 0.2s ease",
      }}
    >
      <span
        style={{
          color: "#d9a92e",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.08em",
          whiteSpace: "nowrap",
        }}
      >
        sCRIT CA
      </span>

      <span
        style={{
          width: "1px",
          height: "14px",
          background: "rgba(255, 255, 255, 0.15)",
          flexShrink: 0,
        }}
        aria-hidden="true"
      />

      <code
        style={{
          color: "#f5f5f5",
          fontSize: "clamp(10px, 2.5vw, 12px)",
          letterSpacing: "0.02em",
          wordBreak: "break-all",
          userSelect: "all",
          fontFamily: "inherit",
        }}
      >
        {SCRIT_CA}
      </code>

      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          marginLeft: "auto",
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy contract address"
          title={copied ? "Copied!" : "Click to copy CA"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            background: copied ? "rgba(255, 255, 255, 0.16)" : "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.16)",
            borderRadius: "999px",
            padding: "3px 9px",
            color: copied ? "#ffffff" : "rgba(255, 255, 255, 0.85)",
            fontSize: "10.5px",
            fontFamily: "inherit",
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.15s ease",
            whiteSpace: "nowrap",
          }}
        >
          {copied ? <Check size={11} strokeWidth={2.5} /> : <Copy size={11} strokeWidth={2} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>

        <a
          href={SCRIT_EXPLORER_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="Open in Robinhood Blockscout Explorer"
          aria-label="Open in Robinhood Blockscout Explorer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            color: "rgba(255, 255, 255, 0.5)",
            padding: "3px",
            borderRadius: "4px",
            transition: "color 0.15s ease",
            textDecoration: "none",
          }}
        >
          <ExternalLink size={12} strokeWidth={2} />
        </a>
      </div>
    </div>
  );
}
