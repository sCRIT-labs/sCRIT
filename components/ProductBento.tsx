"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bullion3D } from "./Bullion3D";
import { usePilotData } from "../hooks/usePilotData";
import { ScrollReveal } from "./ScrollReveal";
import { BASKET } from "@/lib/scrit-basket";
import { useScrollIndex } from "@/hooks/usePinnedProgress";

const TABS = ["index", "raila", "railb"] as const;

const BASKET_META: Record<string, { name: string; color: string; ink: string }> = {
  Au: { name: "Gold", color: "#d9a92e", ink: "#221c05" },
  Ag: { name: "Silver", color: "#c9c9d1", ink: "#1a1a1a" },
  Pt: { name: "Platinum", color: "#8e8e96", ink: "#ffffff" },
};

export function ProductBento() {
  const [tabIdx, setTabIdx] = useState(0);
  const selectedProduct = TABS[tabIdx];
  const { reserveUsd } = usePilotData();
  const [chartsAnimated, setChartsAnimated] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  useScrollIndex(sectionRef, TABS.length, setTabIdx);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setChartsAnimated(true);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="ondo-products-section" id="products">
      <div className="ondo-section-container">
        {/* Header with Masked Text Reveal */}
        <div className="ondo-products-header">
          <ScrollReveal type="fade" delayMs={50}>
            <span className="ondo-eyebrow-center">Our Products</span>
          </ScrollReveal>

          <h2 className="ondo-products-heading">
            <ScrollReveal type="move" delayMs={100}>
              <span>A New Standard</span>
            </ScrollReveal>
            <br />
            <ScrollReveal type="move" delayMs={240}>
              <span>for Tokenized Commodities.</span>
            </ScrollReveal>
          </h2>

          <ScrollReveal type="fade" delayMs={360}>
            <p className="ondo-products-sub">
              A set of onchain products bridging physical LBMA-accredited vault reserves and global decentralized finance.
            </p>
          </ScrollReveal>
        </div>

        {/* 2-Column Bento Layout */}
        <div className="ondo-bento-grid-2col">
          {/* Left Column: Product Selector & Active Card */}
          <div className="ondo-bento-col-left">
            {/* Active Card with Smooth Transitions */}
            <div className="ondo-bento-card-main">
              <div className="ondo-bento-card-header">
                <div className="ondo-globe-icon-box">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </div>
              </div>

              <h3 className="ondo-bento-product-title" style={{ transition: "all 0.3s ease" }}>
                {selectedProduct === "index" && "sCRIT Index Token"}
                {selectedProduct === "raila" && "Rail A · Index Launchpad (AMM)"}
                {selectedProduct === "railb" && "Rail B · Physical Lot Order Book"}
              </h3>

              <p className="ondo-bento-product-desc" style={{ minHeight: "56px", transition: "all 0.3s ease" }}>
                {selectedProduct === "index" &&
                  "The benchmark index token backed by allocated physical LBMA Gold (60%), Fine Silver (25%), and Platinum (15%) held in accredited Swiss custody vaults with EIP-712 attestations."}
                {selectedProduct === "raila" &&
                  "Community & project launchpad where every token is paired against sCRIT. 1% issuance fee and 75% of swap tolls automatically convert into physical bullion accumulation."}
                {selectedProduct === "railb" &&
                  "Central limit order book for individually certified, high-value non-fungible lots (certified diamonds, assay-stamped scandium ingots) fractionalized into 100 units."}
              </p>

              <div className="ondo-bento-badge-row">
                <span className="ondo-bento-tag">
                  {selectedProduct === "index" ? "LBMA 60/25/15" : selectedProduct === "raila" ? "Locked to sCRIT" : "100 Units / Lot"}
                </span>
                <span className="ondo-bento-tag">
                  {selectedProduct === "index" ? "EIP-712 Attested" : selectedProduct === "raila" ? "75% Fee to Reserves" : "GIA / Assay Certified"}
                </span>
              </div>

              {/* Embedded 3D Bullion Ingot Viewer */}
              <div className="ondo-bento-bullion-container">
                <Bullion3D activeMetal={selectedProduct === "index" ? "au" : selectedProduct === "raila" ? "ag" : "pt"} />
              </div>

              {/* Footer row with chain icons and CTA */}
              <div className="ondo-bento-action-row">
                <div className="ondo-chain-icons-group">
                  <span className="ondo-chain-chip is-active-chip" title="Robinhood Chain (Pilot L2)">ROBINHOOD</span>
                  <span className="ondo-chain-chip" title="Ethereum Mainnet Base">ETHEREUM</span>
                </div>
                <a href={selectedProduct === "raila" ? "/launch" : "#simulator"} className="ondo-bento-btn-discover">
                  {selectedProduct === "raila" ? "Strike a Pair" : `Explore ${selectedProduct === "index" ? "sCRIT Index" : "Rail B"}`}
                </a>
              </div>
            </div>

            {/* Product Selectors */}
            <div className="ondo-bento-inactive-tabs">
              <button
                type="button"
                className={`ondo-tab-selector-bar ${selectedProduct === "index" ? "is-selected" : ""}`}
                onClick={() => setTabIdx(0)}
              >
                <span>sCRIT Index Token</span>
                <span className="ondo-tab-chevron">›</span>
              </button>
              <button
                type="button"
                className={`ondo-tab-selector-bar ${selectedProduct === "raila" ? "is-selected" : ""}`}
                onClick={() => setTabIdx(1)}
              >
                <span>Rail A · Index Launchpad (AMM)</span>
                <span className="ondo-tab-chevron">›</span>
              </button>
              <button
                type="button"
                className={`ondo-tab-selector-bar ${selectedProduct === "railb" ? "is-selected" : ""}`}
                onClick={() => setTabIdx(2)}
              >
                <span>Rail B · Physical Lots (CLOB)</span>
                <span className="ondo-tab-chevron">›</span>
              </button>
            </div>
          </div>

          {/* Right Column: TVL, Assets, and Holders Cards */}
          <div className="ondo-bento-col-right">
            {/* Top Card: Current TVL Chart */}
            <div className="ondo-bento-card-tvl">
              <span className="ondo-tvl-label">Current TVL</span>
              <div className="ondo-tvl-value">${(reserveUsd || 999000000).toLocaleString("en-US")}</div>
              {/* Line Chart Graphic with animated draw */}
              <div className="ondo-tvl-chart-visual">
                <svg viewBox="0 0 400 120" fill="none" className="ondo-chart-svg">
                  <path
                    d="M0 100 Q 80 85 140 70 T 260 40 T 400 15"
                    stroke="#2e5bff"
                    strokeWidth="3"
                    fill="none"
                    className={`ondo-chart-path ${chartsAnimated ? "is-animated" : ""}`}
                  />
                  <path
                    d="M0 100 Q 80 85 140 70 T 260 40 T 400 15 L 400 120 L 0 120 Z"
                    fill="url(#chart-gradient)"
                    opacity={chartsAnimated ? 0.15 : 0}
                    style={{ transition: "opacity 1s ease 0.5s" }}
                  />
                  <defs>
                    <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2e5bff" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Dashed Grid Lines */}
                  <line x1="0" y1="30" x2="400" y2="30" stroke="#f0f0f4" strokeDasharray="4 4" />
                  <line x1="0" y1="60" x2="400" y2="60" stroke="#f0f0f4" strokeDasharray="4 4" />
                  <line x1="0" y1="90" x2="400" y2="90" stroke="#f0f0f4" strokeDasharray="4 4" />
                </svg>
              </div>
            </div>

            {/* Bottom Row: 2 Split Cards */}
            <div className="ondo-bento-split-row">
              {/* Pilot Basket Card: live weights from lib/scrit-basket */}
              <div className="ondo-bento-card-stat">
                <span className="ondo-stat-small-label">Pilot Reserve Basket</span>
                <div className="ondo-stat-big-number">{BASKET.length} Metals</div>
                <div className="ondo-basket-rows">
                  {BASKET.map((b, i) => {
                    const meta = BASKET_META[b.symbol];
                    const pct = b.weightBps / 100;
                    return (
                      <div key={b.symbol} className="ondo-basket-row">
                        <div className="ondo-basket-top">
                          <span
                            className="ondo-basket-dot"
                            style={{ backgroundColor: meta.color, color: meta.ink }}
                          >
                            {b.symbol}
                          </span>
                          <span className="ondo-basket-name">{meta.name} · {b.grade}</span>
                          <span className="ondo-basket-pct">{pct}%</span>
                        </div>
                        <div className="ondo-basket-track">
                          <div
                            className="ondo-basket-fill"
                            style={{
                              width: chartsAnimated ? `${pct}%` : "0%",
                              backgroundColor: meta.color,
                              transitionDelay: `${150 + i * 150}ms`,
                            }}
                          />
                        </div>
                        <span className="ondo-basket-tier">{b.tier}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Unique Holders Card with Scroll Grow Animation */}
              <div className="ondo-bento-card-stat">
                <span className="ondo-stat-small-label">Unique Protocol Holders</span>
                <div className="ondo-stat-big-number">~224,500</div>
                {/* Bar chart visual */}
                <div className="ondo-bars-visual">
                  <div
                    className={`ondo-bar ${chartsAnimated ? "is-animated" : ""}`}
                    style={{ height: "30%", transitionDelay: "100ms" }}
                  />
                  <div
                    className={`ondo-bar ${chartsAnimated ? "is-animated" : ""}`}
                    style={{ height: "48%", transitionDelay: "250ms" }}
                  />
                  <div
                    className={`ondo-bar ${chartsAnimated ? "is-animated" : ""}`}
                    style={{ height: "70%", transitionDelay: "400ms" }}
                  />
                  <div
                    className={`ondo-bar is-tall ${chartsAnimated ? "is-animated" : ""}`}
                    style={{ height: "95%", transitionDelay: "550ms" }}
                  >
                    <span className="ondo-bar-tooltip">~224,500</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
