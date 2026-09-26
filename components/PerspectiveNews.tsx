"use client";

import React, { useState } from "react";
import { ScrollReveal } from "./ScrollReveal";

const ARTICLES = [
  {
    image: "/images/scrit_kinetic_scale.jpg",
    meta: "Research Note • Commodity Index Economics",
    title: "Physical Metallurgical Reserves vs Synthetic Tokens: Why Custodian Attestation Matters",
    link: "/proof"
  },
  {
    image: "/images/scrit_attestation_network.jpg",
    meta: "Technical Brief • Robinhood L2 Architecture",
    title: "Uniswap V4 Project-Pool Fees and the Untaxed sCRIT Base Market",
    link: "/launch"
  },
  {
    image: "/images/scrit_depository_monolith.jpg",
    meta: "Regulatory Analysis • DevBrief §11 Compliance",
    title: "Navigating Strategic Asset Classes: Precious Metals, Rare Earth Scoping, and Vault Law",
    link: "/proof"
  }
];

export function PerspectiveNews() {
  const [activeTab, setActiveTab] = useState<"insights" | "research">("insights");

  return (
    <section className="ondo-perspective-section" id="perspective">
      <div className="ondo-section-container">
        {/* Title with Masked Reveal */}
        <h2 className="ondo-perspective-title">
          <ScrollReveal type="move" delayMs={50}>
            <span>The sCRIT Perspective</span>
          </ScrollReveal>
        </h2>

        {/* Tab Pills */}
        <div className="ondo-perspective-tabs">
          <button
            type="button"
            className={`ondo-perspective-tab-pill ${activeTab === "insights" ? "is-active" : ""}`}
            onClick={() => setActiveTab("insights")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <span>Insights &amp; Intelligence</span>
          </button>
          <button
            type="button"
            className={`ondo-perspective-tab-pill ${activeTab === "research" ? "is-active" : ""}`}
            onClick={() => setActiveTab("research")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <span>Independent Research</span>
          </button>
        </div>

        {/* 3 Articles Grid with Staggered Fade */}
        <div className="ondo-perspective-grid">
          {ARTICLES.map((a, idx) => (
            <ScrollReveal key={idx} type="fade" delayMs={idx * 120} className="ondo-perspective-card-wrap">
              <a href={a.link} className="ondo-perspective-card">
                <div className="ondo-perspective-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.image} alt={a.title} className="ondo-perspective-thumb" />
                </div>
                <div className="ondo-perspective-meta-block">
                  <span className="ondo-perspective-meta-text">{a.meta}</span>
                  <h3 className="ondo-perspective-headline">{a.title}</h3>
                </div>
              </a>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
