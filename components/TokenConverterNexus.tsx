"use client";

import React, { useState } from "react";
import { ScrollReveal } from "./ScrollReveal";

type TokenItem = {
  sym: string;
  name: string;
  issuer: string;
  grad: [string, string];
};

const TOKENS: TokenItem[] = [
  { sym: "AU", name: "Physical Gold Bar", issuer: "LBMA Good Delivery 999.9 · pilot record", grad: ["#fef08a", "#ca8a04"] },
  { sym: "AG", name: "Physical Silver Lot", issuer: "Commercial Fine Silver 999 · pilot record", grad: ["#f1f5f9", "#94a3b8"] },
  { sym: "PT", name: "Platinum Ingot", issuer: "Sponge Ingot 999.5 · pilot record", grad: ["#e0e7ff", "#6366f1"] },
];

export function TokenConverterNexus() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const token = TOKENS[selectedIdx];

  return (
    <section className="ondo-nexus-section" id="nexus">
      <div className="ondo-section-container">
        {/* Header with Masked Text Reveal */}
        <div className="ondo-nexus-header">
          <ScrollReveal type="fade" delayMs={50}>
            <span className="ondo-nexus-eyebrow">Nexus Engine</span>
          </ScrollReveal>

          <h2 className="ondo-nexus-heading">
            <ScrollReveal type="move" delayMs={100}>
              <span>Physical Commodity Rails,</span>
            </ScrollReveal>
            <br />
            <ScrollReveal type="move" delayMs={240}>
              <span>Your Onchain Pairs</span>
            </ScrollReveal>
          </h2>
        </div>

        {/* Horizontal Large Token Carousel */}
        <div className="ondo-nexus-token-scroller">
          {TOKENS.map((t, idx) => {
            const isSelected = selectedIdx === idx;
            return (
              <button
                key={t.sym}
                type="button"
                onClick={() => setSelectedIdx(idx)}
                className={`ondo-nexus-token-item ${isSelected ? "is-selected-token" : "is-dim-token"}`}
              >
                <div
                  className="ondo-nexus-token-icon-svg"
                  style={{
                    background: `linear-gradient(135deg, ${t.grad[0]}, ${t.grad[1]})`,
                    color: idx === 0 || idx === 1 ? "#1c1917" : "#ffffff",
                  }}
                >
                  {t.sym}
                </div>
                <div style={{ textAlign: "left" }}>
                  <span className="ondo-nexus-token-symbol">{t.sym}</span>
                  <span className="ondo-nexus-token-subname">{t.name}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom Description & CTA */}
        <div className="ondo-nexus-footer-block">
          <ScrollReveal type="fade" delayMs={100}>
            <p className="ondo-nexus-desc">
              Nexus previews how attested pilot records map to onchain pair liquidity. Selected asset: <strong style={{ color: "#ffffff" }}>{token.name}</strong> ({token.issuer}). Pd, Cu, Ni, rare earths and other commodities are unavailable in pilot.
            </p>
          </ScrollReveal>

          <ScrollReveal type="fade" delayMs={200}>
            <a href="#simulator" className="ondo-nexus-btn-cta">
              Simulate {token.sym} Reserve Economics
            </a>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
