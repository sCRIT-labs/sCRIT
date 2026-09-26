"use client";

import React, { useState } from "react";
import { formatUsd } from "../lib/nav";
import { SIMULATION_SUPPLY, TAX_TARGET_BPS, TAX_SPLIT_RESERVE_BPS } from "../lib/scrit";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";

export const ReserveSimulator: React.FC = () => {
  const [tradeVolume, setTradeVolume] = useState<number>(50000);
  const [priceShock, setPriceShock] = useState<number>(0); // -30% to +30%
  const [accrualMode, setAccrualMode] = useState<"mint" | "accretive">("mint");

  // Base pilot simulation numbers
  const baseReserve = 250000; // Simulated pilot baseline ($250k)
  const supply = Number(SIMULATION_SUPPLY);

  // 1% issuance / trading tax (promo 0% in pilot, but target 2.5% paska-audit)
  const taxRate = TAX_TARGET_BPS / 10000; // 2.5%
  const taxCollected = tradeVolume * taxRate;
  const reserveShare = (taxCollected * TAX_SPLIT_RESERVE_BPS) / 10000; // 75%
  const opsShare = taxCollected - reserveShare; // 25%

  // Commodity price shock effect
  const shockedReserve = (baseReserve + reserveShare) * (1 + priceShock / 100);

  // Accrual mode calculation:
  // Mint-at-NAV: new tokens minted equal to value added -> NAV stable
  // Accretive: no new tokens minted -> NAV increases per token
  const effectiveSupply = accrualMode === "mint" ? supply + (reserveShare / (baseReserve / supply)) : supply;
  const simulatedNav = shockedReserve / effectiveSupply;

  const baselineNav = baseReserve / supply;
  const navChangePct = ((simulatedNav - baselineNav) / baselineNav) * 100;

  return (
    <section className="ondo-simulator-section" id="simulator-section">
      <div className="ondo-section-container">
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <span className="ondo-eyebrow-center" style={{ color: "var(--gold-bright)", display: "inline-block", marginBottom: 8 }}>
            03.5 · Interactive Physics &amp; Economics Engine
          </span>
          <h2 className="ondo-products-heading" style={{ color: "#ffffff", marginTop: "4px" }}>
            Stress-Test the Reserve Loop
          </h2>
          <p className="ondo-products-sub" style={{ color: "#8e8e93", maxWidth: "680px", margin: "16px auto 0" }}>
            This is a model, not a live reserve. Adjust simulated trade volume and prices to compare
            accrual choices; no trade, purchase, custody, or attestation is created by this panel.
          </p>
        </div>

        <div className="sim-container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <span className="mono-sm" style={{ color: "var(--gold-bright)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                SIMULATION CONSOLE · DEV BRIEF §13
              </span>
              <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 24, margin: "4px 0 0" }}>
                Physical Reserve Cycle
              </h3>
            </div>

            {/* Accretive vs Mint-at-NAV Toggle */}
            <div style={{ display: "inline-flex", gap: 4, background: "var(--coal)", padding: 4, borderRadius: 8, border: "1px solid var(--line)" }}>
              <button
                className={`bullion-tab ${accrualMode === "mint" ? "active" : ""}`}
                onClick={() => setAccrualMode("mint")}
                title="Supply expands with newly attested metal value (Brief §5.3 recommended)"
              >
                Mint-at-NAV
              </button>
              <button
                className={`bullion-tab ${accrualMode === "accretive" ? "active" : ""}`}
                onClick={() => setAccrualMode("accretive")}
                title="Constant supply — NAV rises directly per token"
              >
                Accretive (Fixed Supply)
              </button>
            </div>
          </div>

          <div className="sim-grid">
            {/* Left Controls */}
            <div className="sim-control-group">
              {/* Slider 1: Trading Volume */}
              <div className="sim-slider-box">
                <div className="sim-slider-header">
                  <span className="sim-label">Simulated Trade Volume</span>
                  <span className="sim-val">{formatUsd(tradeVolume, 0)}</span>
                </div>
                <input
                  type="range"
                  className="sim-range"
                  min="5000"
                  max="500000"
                  step="5000"
                  value={tradeVolume}
                  onChange={(e) => setTradeVolume(Number(e.target.value))}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
                  <span>$5,000</span>
                  <span>Target 2.5% Tax Hook</span>
                  <span>$500,000</span>
                </div>
              </div>

              {/* Slider 2: Commodity Price Shock */}
              <div className="sim-slider-box">
                <div className="sim-slider-header">
                  <span className="sim-label">Commodity Price Shock · Nine Asset Basket</span>
                  <span className="sim-val" style={{ color: priceShock > 0 ? "var(--green)" : priceShock < 0 ? "var(--red)" : "var(--parchment)" }}>
                    {priceShock > 0 ? `+${priceShock}%` : `${priceShock}%`}
                  </span>
                </div>
                <input
                  type="range"
                  className="sim-range"
                  min="-30"
                  max="30"
                  step="1"
                  value={priceShock}
                  onChange={(e) => setPriceShock(Number(e.target.value))}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
                  <span>-30% Market Drop</span>
                  <span>Spot Price Shock</span>
                  <span>+30% Bullion Surge</span>
                </div>
              </div>

              {/* Fee Split Routing Visualizer */}
              <div style={{ background: "var(--coal)", padding: "16px 20px", borderRadius: 10, border: "1px solid rgba(217, 169, 46, 0.12)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontFamily: "var(--font-mono)" }}>
                  <span>Fee Skimmed: <b style={{ color: "var(--parchment)" }}>{formatUsd(taxCollected)}</b></span>
                  <span>Split: 75% Reserve / 25% Ops</span>
                </div>
                <div className="sim-split-bar">
                  <div className="sim-split-reserve" style={{ width: "75%" }} />
                  <div className="sim-split-ops" style={{ width: "25%" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
                  <span style={{ color: "var(--gold-bright)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <ArrowRight size={12} strokeWidth={2.5} />
                    {formatUsd(reserveShare)} Unspent Reserve Treasury
                  </span>
                  <span>{formatUsd(opsShare)} Custody & Ops</span>
                </div>
              </div>
            </div>

            {/* Right Result Card */}
            <div className="sim-metric-card">
              <div>
                <span className="mono-sm" style={{ color: "var(--muted)", letterSpacing: "0.1em" }}>
                  SIMULATED NAV PER sCRIT
                </span>
                <div style={{ fontSize: "clamp(36px, 4vw, 48px)", fontFamily: "var(--font-serif)", fontWeight: 700, color: "var(--gold-bright)", margin: "8px 0" }}>
                  {formatUsd(simulatedNav, 6)}
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontFamily: "var(--font-mono)" }}>
                  <span style={{ color: navChangePct >= 0 ? "var(--green)" : "var(--red)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {navChangePct >= 0 ? <TrendingUp size={14} strokeWidth={2.2} /> : <TrendingDown size={14} strokeWidth={2.2} />}
                    {navChangePct >= 0 ? `+${navChangePct.toFixed(2)}%` : `${navChangePct.toFixed(2)}%`}
                  </span>
                  <span style={{ color: "var(--muted)" }}>vs pilot baseline</span>
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16, marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <span className="mono-sm" style={{ color: "var(--muted)", display: "block" }}>SIMULATED RESERVE</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: "var(--parchment)" }}>
                    {formatUsd(shockedReserve, 0)}
                  </span>
                </div>
                <div>
                  <span className="mono-sm" style={{ color: "var(--muted)", display: "block" }}>ACCRUAL BEHAVIOR</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--gold)" }}>
                    {accrualMode === "mint" ? "Expands Supply at NAV" : "Accretes Value / Unit"}
                  </span>
                </div>
              </div>

              <p className="mono-sm" style={{ marginTop: 14, fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>
                Notice: Trade volume accumulates unspent treasury until an EIP-712 attestation confirms delivery.
                Commodity price shifts immediately impact the NAV without waiting for volume.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
