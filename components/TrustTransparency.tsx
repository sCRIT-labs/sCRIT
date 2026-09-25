"use client";

import React, { useRef, useState } from "react";
import { ScrollReveal } from "./ScrollReveal";
import { usePinnedProgress, useScrollIndex } from "@/hooks/usePinnedProgress";

const PILLARS = [
  {
    num: "01",
    title: "Target Basket",
    desc: "The pilot design targets 60% gold, 25% silver, and 15% platinum. No allocated inventory is established by this page."
  },
  {
    num: "02",
    title: "Scoped EIP-712 Records",
    desc: "The service checks signatures from registered keys against commodity scopes before accepting a batch record."
  },
  {
    num: "03",
    title: "Off-Chain Reserve View",
    desc: "Reported mass and NAV are derived from accepted service records; physical delivery is not independently proved by this software."
  },
  {
    num: "04",
    title: "Physical Audit",
    desc: "No independent physical audit report is currently represented in this repository."
  },
  {
    num: "05",
    title: "Manual Price Inputs",
    desc: "Commodity inputs are entered manually and marked stale after 24 hours. They are not a live oracle or market quote."
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
            <span className="ondo-trust-eyebrow">Pilot Evidence &amp; Open Work</span>
          </ScrollReveal>

          <h2 className="ondo-trust-heading">
            <ScrollReveal type="move" delayMs={100}>
              <span>Reserve Design,</span>
            </ScrollReveal>
            <br />
            <ScrollReveal type="move" delayMs={240}>
              <span>Evidence, and Limits</span>
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
