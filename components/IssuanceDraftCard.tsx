"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Coins,
  Copy,
  FileCode,
  Layers,
  Percent,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react";

export interface IssuanceDraft {
  name: string;
  ticker: string;
  supply: string;
  pooled: string;
  scritAmt: string;
  description?: string;
  commodityTier?: string;
  scarcityThreshold?: string;
  rationale?: string;
}

interface IssuanceDraftCardProps {
  draft: IssuanceDraft;
  onApply?: (draft: IssuanceDraft) => void;
  isInlineWidget?: boolean;
}

export function IssuanceDraftCard({
  draft,
  onApply,
  isInlineWidget = false,
}: IssuanceDraftCardProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [applied, setApplied] = useState(false);

  // Numerical calculations
  const supplyNum = parseFloat(draft.supply || "0");
  const pooledNum = parseFloat(draft.pooled || "0");
  const scritNum = parseFloat(draft.scritAmt || "0");

  const poolPercentage =
    supplyNum > 0 ? ((pooledNum / supplyNum) * 100).toFixed(1) : "20.0";

  const impliedPrice =
    pooledNum > 0 && scritNum > 0
      ? (scritNum / pooledNum).toFixed(8).replace(/\.?0+$/, "")
      : "0.000005";

  function handleApply() {
    try {
      localStorage.setItem(
        "scrit.launch.draft",
        JSON.stringify({
          name: draft.name,
          ticker: draft.ticker,
          supply: draft.supply,
          pooled: draft.pooled,
          scritAmt: draft.scritAmt,
        })
      );
    } catch {
      // ignore storage exceptions
    }

    if (onApply) {
      onApply(draft);
      setApplied(true);
      setTimeout(() => setApplied(false), 2500);
    } else {
      setApplied(true);
      router.push("/launch?fromCopilot=true");
    }
  }

  function handleCopy() {
    const summary = [
      `sCRIT Rail A Issuance Draft`,
      `Token Name: ${draft.name}`,
      `Symbol: $${draft.ticker}`,
      `Total Supply: ${draft.supply}`,
      `Initial Pooled: ${draft.pooled} (${poolPercentage}%)`,
      `Initial sCRIT Deposit: ${draft.scritAmt} sCRIT`,
      `Implied Initial Price: ${impliedPrice} sCRIT / $${draft.ticker}`,
      draft.commodityTier ? `Scarcity Tier: ${draft.commodityTier}` : "",
      draft.description ? `Thesis: ${draft.description}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    if (navigator.clipboard) {
      void navigator.clipboard.writeText(summary).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  return (
    <div
      className="issuance-draft-card"
      style={{
        marginTop: 8,
        marginBottom: 4,
        background: "#ffffff",
        border: "1px solid rgba(201, 146, 46, 0.32)",
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: "0 4px 16px rgba(184, 134, 11, 0.08)",
        transition: "all 0.22s ease",
      }}
    >
      {/* Decorative luxury gold top accent */}
      <div
        style={{
          height: 2.5,
          background: "linear-gradient(90deg, #f5d688 0%, #d4a737 50%, #b8860b 100%)",
        }}
      />

      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 12px",
          background: "#faf8f2",
          borderBottom: "1px solid rgba(24, 26, 24, 0.07)",
          gap: 6,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Sparkles size={13} color="#8c6418" />
          <span
            className="mono-sm"
            style={{
              fontWeight: 700,
              fontSize: 10.5,
              letterSpacing: "0.07em",
              color: "#6e4e0c",
              textTransform: "uppercase",
            }}
          >
            Rail A Issuance Draft
          </span>
        </div>
        <span
          className="mono-sm"
          style={{
            fontSize: 9,
            fontWeight: 650,
            padding: "2px 6px",
            borderRadius: 3,
            background: "rgba(184, 134, 11, 0.1)",
            color: "#8c6418",
            border: "1px solid rgba(184, 134, 11, 0.22)",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <ShieldAlert size={10} />
          Human Review
        </span>
      </div>

      {/* Body Content */}
      <div style={{ padding: "12px 14px" }}>
        {/* Token Name and Ticker Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 10,
            gap: 8,
          }}
        >
          <div>
            <h4
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#181a18",
                margin: "0 0 4px",
                lineHeight: 1.25,
              }}
            >
              {draft.name || "Unnamed Token"}
            </h4>
            <div
              className="mono-sm"
              style={{
                fontSize: 10.5,
                color: "#6d746a",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span>Ticker:</span>
              <strong
                style={{
                  color: "#8c6418",
                  padding: "1px 6px",
                  borderRadius: 3,
                  background: "#f9f6ee",
                  border: "1px solid rgba(184, 134, 11, 0.28)",
                  fontSize: 11,
                }}
              >
                ${draft.ticker || "TICKER"}
              </strong>
            </div>
          </div>

          {draft.commodityTier && (
            <div
              className="mono-sm"
              style={{
                fontSize: 9.5,
                padding: "3px 8px",
                borderRadius: 4,
                background: "#f4f2ea",
                border: "1px solid rgba(24, 26, 24, 0.1)",
                color: "#464d44",
                textAlign: "right",
                flexShrink: 0,
              }}
            >
              <div>Tier: <strong>{draft.commodityTier}</strong></div>
              {draft.scarcityThreshold && (
                <div style={{ fontSize: 8.5, color: "#777e74", marginTop: 1 }}>
                  {draft.scarcityThreshold}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Unified 2x2 Key Parameters Matrix */}
        <div
          style={{
            borderRadius: 6,
            background: "#faf8f2",
            border: "1px solid rgba(24, 26, 24, 0.08)",
            overflow: "hidden",
            marginBottom: 10,
          }}
        >
          {/* Row 1: Supply & Pooled */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              borderBottom: "1px solid rgba(24, 26, 24, 0.06)",
            }}
          >
            <div style={{ padding: "8px 10px", borderRight: "1px solid rgba(24, 26, 24, 0.06)" }}>
              <div
                className="mono-sm"
                style={{
                  fontSize: 9,
                  color: "#72796e",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  marginBottom: 2,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                <Coins size={10} color="#8c6418" /> Total Supply
              </div>
              <div
                className="mono-sm"
                style={{ fontSize: 12.5, fontWeight: 700, color: "#181a18" }}
              >
                {Number(draft.supply || 0).toLocaleString()}
              </div>
            </div>

            <div style={{ padding: "8px 10px" }}>
              <div
                className="mono-sm"
                style={{
                  fontSize: 9,
                  color: "#72796e",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  marginBottom: 2,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                <Layers size={10} color="#536753" /> Initial Pooled
              </div>
              <div
                className="mono-sm"
                style={{ fontSize: 12.5, fontWeight: 700, color: "#181a18" }}
              >
                {Number(draft.pooled || 0).toLocaleString()}{" "}
                <span style={{ fontSize: 9.5, color: "#8c6418", fontWeight: 600 }}>
                  ({poolPercentage}%)
                </span>
              </div>
            </div>
          </div>

          {/* Row 2: sCRIT Paired & Implied Price */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
            }}
          >
            <div style={{ padding: "8px 10px", borderRight: "1px solid rgba(24, 26, 24, 0.06)" }}>
              <div
                className="mono-sm"
                style={{
                  fontSize: 9,
                  color: "#72796e",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  marginBottom: 2,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                <Percent size={10} color="#8c6418" /> sCRIT Paired
              </div>
              <div
                className="mono-sm"
                style={{ fontSize: 12.5, fontWeight: 700, color: "#181a18" }}
              >
                {Number(draft.scritAmt || 0).toLocaleString()} sCRIT
              </div>
            </div>

            <div style={{ padding: "8px 10px" }}>
              <div
                className="mono-sm"
                style={{
                  fontSize: 9,
                  color: "#72796e",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  marginBottom: 2,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                <TrendingUp size={10} color="#536753" /> Implied Price
              </div>
              <div
                className="mono-sm"
                style={{ fontSize: 12, fontWeight: 700, color: "#181a18" }}
              >
                {impliedPrice} <span style={{ fontSize: 9.5, color: "#666b66" }}>sCRIT</span>
              </div>
            </div>
          </div>
        </div>

        {/* Project Thesis Excerpt */}
        {draft.description && (
          <div
            style={{
              fontSize: 11.5,
              color: "#3f463c",
              lineHeight: 1.5,
              background: "#fdfbf7",
              borderLeft: "2.5px solid #d4a737",
              padding: "7px 10px",
              borderRadius: "0 4px 4px 0",
              marginBottom: 9,
            }}
          >
            <strong style={{ color: "#181a18" }}>Syndicate Thesis: </strong>
            {draft.description}
          </div>
        )}

        {/* Tax Disclosure */}
        <div
          className="mono-sm"
          style={{
            fontSize: 9.5,
            color: "#636a5f",
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 11,
            padding: "5px 8px",
            background: "#f6f4ee",
            borderRadius: 4,
            border: "1px solid rgba(24, 26, 24, 0.05)",
          }}
        >
          <span style={{ color: "#8c6418", fontWeight: 700 }}>Tax Hook:</span>
          <strong>2.5% V4 Hook Tax</strong>
          <span style={{ color: "#777e74" }}>(75% Treasury / 25% Ops)</span>
        </div>

        {/* Raw JSON inspection toggle */}
        {showJson && (
          <pre
            style={{
              fontSize: 9.5,
              fontFamily: "var(--font-mono)",
              background: "#181a18",
              color: "#e6e1d6",
              padding: 9,
              borderRadius: 4,
              overflowX: "auto",
              marginBottom: 10,
              lineHeight: 1.45,
            }}
          >
            {JSON.stringify(draft, null, 2)}
          </pre>
        )}

        {/* Action Controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "nowrap",
            gap: 6,
            borderTop: "1px solid rgba(24, 26, 24, 0.08)",
            paddingTop: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            <button
              type="button"
              onClick={handleCopy}
              className="draft-action-btn"
              style={{
                minHeight: 28,
                padding: "4px 8px",
                fontSize: 11,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                borderRadius: 4,
                background: "#ffffff",
                color: "#181a18",
                border: "1px solid rgba(24, 26, 24, 0.22)",
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {copied ? <Check size={11} color="#16a34a" /> : <Copy size={11} color="#181a18" />}
              <span style={{ color: "#181a18", fontWeight: 600 }}>{copied ? "Copied" : "Copy"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowJson((prev) => !prev)}
              className="draft-action-btn"
              title={showJson ? "Hide raw JSON" : "Inspect raw JSON"}
              style={{
                minHeight: 28,
                padding: "4px 8px",
                fontSize: 11,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                borderRadius: 4,
                background: showJson ? "#ece8dc" : "#ffffff",
                color: "#181a18",
                border: showJson
                  ? "1px solid rgba(24, 26, 24, 0.45)"
                  : "1px solid rgba(24, 26, 24, 0.22)",
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              <FileCode size={11} color={showJson ? "#8c6418" : "#181a18"} />
              <span style={{ color: "#181a18", fontWeight: 600 }}>JSON</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleApply}
            className="draft-apply-btn"
            style={{
              minHeight: 30,
              padding: "5px 11px",
              fontSize: 11,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              borderRadius: 4,
              background: "linear-gradient(135deg, #f5d688 0%, #d4a737 50%, #b8860b 100%)",
              color: "#111411",
              border: "1px solid rgba(255, 255, 255, 0.6)",
              boxShadow: "0 3px 10px rgba(184, 134, 11, 0.32)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {applied ? (
              <>
                <Check size={12} color="#111411" />
                <span style={{ color: "#111411" }}>Draft Populated</span>
              </>
            ) : (
              <>
                <span style={{ color: "#111411" }}>Apply to Launch Form</span>
                <ArrowRight size={12} color="#111411" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
