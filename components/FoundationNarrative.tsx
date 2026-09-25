"use client";

import React from "react";
import { ScrollReveal } from "./ScrollReveal";
import { CounterNumber } from "./CounterNumber";

const STATS = [
  {
    num: "3",
    prefix: "",
    suffix: "",
    label: "Target Basket Assets",
    desc: "Design weights: gold 60%, silver 25%, platinum 15%. They do not represent current physical holdings."
  },
  {
    num: "100",
    prefix: "",
    suffix: "%",
    label: "Off-Chain Attestation Records",
    desc: "The pilot service checks typed signatures and scope. Records are not reserve contract state or independent proof of delivery."
  },
  {
    num: "0",
    prefix: "",
    suffix: "%",
    label: "Pilot Swap Tax",
    desc: "Project-pool swap tax is 0% in this pilot. Market depth and price stability are not guaranteed."
  },
  {
    num: "75",
    prefix: "",
    suffix: "%",
    label: "Reserve Fee Routing",
    desc: "The proposed 75/25 split is inactive. No fee is automatically converted into bullion purchases."
  }
];

export function FoundationNarrative() {
  return (
    <section className="ondo-foundation-section" id="foundation">
      <div className="ondo-section-container">
        <div className="ondo-foundation-grid">
          {/* Left Column: Sticky Title (Ondo Exact Pinned Header) */}
          <div className="ondo-foundation-col-left">
            <h2 className="ondo-foundation-sticky-title">
              <ScrollReveal type="move" delayMs={50}>
                <span>sCRIT is testing a pilot design</span>
              </ScrollReveal>
              <br />
              <ScrollReveal type="move" delayMs={200}>
                <span>for token launch liquidity.</span>
              </ScrollReveal>
            </h2>
          </div>

          {/* Right Column: Scrolling Metrics with Rolling Numbers */}
          <div className="ondo-foundation-col-right">
            {STATS.map((s, i) => (
              <div key={i} className="ondo-foundation-stat-row">
                <ScrollReveal type="fade" delayMs={i * 80}>
                  <div className="ondo-foundation-number">
                    <CounterNumber value={s.num} prefix={s.prefix} suffix={s.suffix} />
                  </div>
                </ScrollReveal>
                <div className="ondo-foundation-meta">
                  <ScrollReveal type="fade" delayMs={i * 80 + 60}>
                    <h3 className="ondo-foundation-label">{s.label}</h3>
                  </ScrollReveal>
                  <ScrollReveal type="fade" delayMs={i * 80 + 120}>
                    <p className="ondo-foundation-desc">{s.desc}</p>
                  </ScrollReveal>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
