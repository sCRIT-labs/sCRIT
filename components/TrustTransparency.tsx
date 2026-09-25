"use client";

import React, { useRef, useState } from "react";
import { ScrollReveal } from "./ScrollReveal";
import { usePinnedProgress, useScrollIndex } from "@/hooks/usePinnedProgress";

const PILLARS = [
  {
    num: "01",
    title: "Allocated Bullion Backing",
    desc: "100% physically allocated LBMA Good Delivery gold (60%), fine silver (25%), and platinum (15%) stored in bonded, segregated vaults."
  },
  {
    num: "02",
    title: "EIP-712 Scoped Attestation",
    desc: "Custodians sign typed EIP-712 payloads with commodity-specific scopes. A gold vault key cannot sign for silver or platinum."
  },
  {
    num: "03",
    title: "Reserve Sourcing Integrity",
    desc: "Reserve figures increase only upon physical bar delivery. Unspent trading taxes sit in a separately disclosed treasury balance."
  },
  {
    num: "04",
    title: "Independent Bar-Count Audits",
    desc: "Periodic physical inspections by certified third-party assayers matching serial hallmarks against public on-chain certificates."
  },
  {
    num: "05",
    title: "Honest Market Pricing & NAV",
    desc: "Continuous live tracking of market premium and discount to NAV, giving traders full transparency over pool liquidity dynamics."
  }
];

export function TrustTransparency() {
  const [activeIdx, setActiveIdx] = useState(2); // Card 03 active by default
  const sectionRef = useRef<HTMLElement>(null);
  usePinnedProgress(sectionRef);
  useScrollIndex(sectionRef, PILLARS.length, setActiveIdx);

  return (
    <section ref={sectionRef} className="ondo-trust-section" id="trust">
      {/* Background LED Trading Floor Billboard */}
      <div className="ondo-trust-bg-image" />
      <div className="ondo-trust-dark-overlay" />

      <div className="ondo-section-container ondo-trust-content">
        {/* Header with Masked Text Reveal */}
        <div className="ondo-trust-header">
          <ScrollReveal type="fade" delayMs={50}>
            <span className="ondo-trust-eyebrow">Proof of Backing &amp; Custody</span>
          </ScrollReveal>

          <h2 className="ondo-trust-heading">
            <ScrollReveal type="move" delayMs={100}>
              <span>Physical Commodity Backing,</span>
            </ScrollReveal>
            <br />
            <ScrollReveal type="move" delayMs={240}>
              <span>Cryptographic Proof</span>
            </ScrollReveal>
          </h2>
          <div className="pinned-bar" aria-hidden="true" style={{ height: 2, marginTop: 16, background: "var(--gold-bright)" }} />
        </div>

        {/* 5 Cards Row with Staggered Fade */}
        <div className="ondo-trust-cards-row">
          {PILLARS.map((p, idx) => {
            const isActive = activeIdx === idx;
            return (
              <div
                key={p.num}
                className={`ondo-trust-card ${isActive ? "is-active-white" : "is-inactive-dark"}`}
                onClick={() => setActiveIdx(idx)}
                role="button"
                tabIndex={0}
                aria-label={p.title}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setActiveIdx(idx);
                  }
                }}
              >
                <div className="ondo-trust-card-top">
                  <span className="ondo-trust-num">{p.num}</span>
                  <div className="ondo-trust-arrow">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M7 17l9.2-9.2M17 17V7.8H7.8" />
                    </svg>
                  </div>
                </div>

                <div className="ondo-trust-card-body">
                  <h3 className="ondo-trust-card-title">{p.title}</h3>
                  <p className="ondo-trust-card-desc">{p.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
