"use client";

import React from "react";
import { ScrollReveal } from "./ScrollReveal";
import { CounterNumber } from "./CounterNumber";

const STATS = [
  {
    num: "3",
    prefix: "",
    suffix: "",
    label: "Physical Basket Assets (Pilot)",
    desc: "Day-1 allocated reserve: LBMA Gold (60%), Fine Silver (25%), and Platinum (15%) secured in accredited vaults."
  },
  {
    num: "100",
    prefix: "",
    suffix: "%",
    label: "Attestation-Gated Reserve",
    desc: "Reserve figures increase only upon cryptographic EIP-712 attestation from registered custody partners."
  },
  {
    num: "0",
    prefix: "",
    suffix: "%",
    label: "Base Market Toll (sCRIT/ETH)",
    desc: "The primary price-discovery pool operates with zero protocol tax, preserving deep liquidity for index holders."
  },
  {
    num: "75",
    prefix: "",
    suffix: "%",
    label: "Swap Fee to Physical Reserve",
    desc: "Three-quarters of all project pool trading fees automatically convert into allocated physical bullion purchases."
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
                <span>sCRIT is building the permanent floor</span>
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
