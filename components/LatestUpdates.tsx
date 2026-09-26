"use client";

import React, { useRef, useState } from "react";
import { ScrollReveal } from "./ScrollReveal";
import { useScrollIndex } from "@/hooks/usePinnedProgress";

const UPDATES = [
  {
    id: 1,
    tag: "Pilot Basket · Target",
    title: "A defined basket, with current holdings left unclaimed",
    summary: "The starter design targets nine commodities across precious metals, rare earths, and lithium. Target weights are not inventory.",
    image: "/images/scrit_depository_monolith.jpg",
    link: "/proof",
    shortLabel: "Target basket"
  },
  {
    id: 2,
    tag: "Attestation · Off-chain",
    title: "The pilot service checks signed batch records",
    summary: "Authorized keys and commodity scopes are checked before a record is accepted. Attestations are not on-chain reserve state and do not prove delivery independently.",
    image: "/images/scrit_attestation_network.jpg",
    link: "/proof",
    shortLabel: "Service-checked records"
  },
  {
    id: 3,
    tag: "Mechanism · Rail A",
    title: "Project tokens can launch against sCRIT",
    summary: "Mainnet TOKEN/sCRIT pools use a 2.5% V4 hook fee split 75/25. Collected fees are not reserve inventory until a batch is attested.",
    image: "/images/scrit_kinetic_scale.jpg",
    link: "/launch",
    shortLabel: "TOKEN / sCRIT pools"
  }
];

export function LatestUpdates() {
  const [activeIdx, setActiveIdx] = useState(1);
  const sectionRef = useRef<HTMLElement>(null);
  useScrollIndex(sectionRef, UPDATES.length, setActiveIdx);

  return (
    <section ref={sectionRef} className="ondo-latest-section" id="latest">
      <div className="ondo-section-narrow">
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <h2 className="ondo-section-title-split" style={{ display: "inline-block", margin: 0 }}>
            <ScrollReveal type="move" delayMs={50}>
              <span style={{ marginRight: "0.28em", color: "#000000" }}>See the Latest</span>
            </ScrollReveal>
            <ScrollReveal type="move" delayMs={150}>
              <span style={{ color: "#8e8e93" }}>from sCRIT</span>
            </ScrollReveal>
          </h2>
        </div>

        {/* Expandable Horizontal Accordion (Ondo Exact Behavior) */}
        <div className="ondo-accordion-row">
          {UPDATES.map((item, idx) => {
            const isExpanded = activeIdx === idx;

            if (isExpanded) {
              return (
                <div key={item.id} className="ondo-accordion-pillar is-expanded">
                  {/* Left Media */}
                  <div className="ondo-card-media-left">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image}
                      alt={item.title}
                      className="ondo-card-img"
                    />
                  </div>

                  {/* Right Content */}
                  <div className="ondo-card-info-right">
                    <ScrollReveal type="fade" delayMs={50}>
                      <span className="ondo-card-meta-tag">{item.tag}</span>
                    </ScrollReveal>
                    <ScrollReveal type="fade" delayMs={120}>
                      <h3 className="ondo-card-headline">{item.title}</h3>
                    </ScrollReveal>
                    <ScrollReveal type="fade" delayMs={180}>
                      <p className="ondo-card-desc">{item.summary}</p>
                    </ScrollReveal>
                    <ScrollReveal type="fade" delayMs={240}>
                      <a href={item.link} className="ondo-card-btn-read">
                        Read More
                      </a>
                    </ScrollReveal>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={item.id}
                onClick={() => setActiveIdx(idx)}
                className="ondo-accordion-pillar is-collapsed"
                role="button"
                tabIndex={0}
                aria-label={`Open ${item.title}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setActiveIdx(idx);
                  }
                }}
              >
                <div className="ondo-collapsed-icon">
                  {idx + 1}
                </div>
                <div className="ondo-collapsed-label">
                  {item.shortLabel}
                </div>
                <div style={{ width: 14, height: 14, opacity: 0.5, flexShrink: 0 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
