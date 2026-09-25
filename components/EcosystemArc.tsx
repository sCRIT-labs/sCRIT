"use client";

import React from "react";
import { OrbitPools } from "./OrbitPools";
import { ScrollReveal } from "./ScrollReveal";

export function EcosystemArc() {
  return (
    <section className="ondo-ecosystem-section" id="ecosystem">
      {/* Glowing Rainbow Arc SVG */}
      <div className="ondo-arc-canvas-wrapper">
        <svg viewBox="0 0 1004 506" fill="none" xmlns="http://www.w3.org/2000/svg" className="ondo-arc-svg">
          <path d="M 0 506 A 502 506 0 0 1 1004 506" stroke="url(#ecosystem-arc-gradient)" strokeWidth="2.5" fill="none" />
          <defs>
            <linearGradient id="ecosystem-arc-gradient" x1="1077.48" y1="1141.25" x2="36.0176" y2="1212.56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#7E2EC9" stopOpacity="0" />
              <stop offset="0.135773" stopColor="#7E2EC9" />
              <stop offset="0.412138" stopColor="#D4A5FF" />
              <stop offset="0.741343" stopColor="#FFE6D8" />
              <stop offset="0.907386" stopColor="#EE7B39" />
              <stop offset="1" stopColor="#EE7B39" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
        <div className="ondo-arc-glow" />
      </div>

      <div className="ondo-section-container ondo-ecosystem-content">
        <ScrollReveal type="fade" delayMs={50}>
          <span className="ondo-ecosystem-eyebrow">sCRIT Ecosystem</span>
        </ScrollReveal>

        <h2 className="ondo-ecosystem-heading">
          <ScrollReveal type="move" delayMs={100}>
            <span>Anchoring Token Launches</span>
          </ScrollReveal>
          <br />
          <ScrollReveal type="move" delayMs={240}>
            <span>To Physical Metal Density</span>
          </ScrollReveal>
        </h2>

        <ScrollReveal type="fade" delayMs={360}>
          <p className="ondo-ecosystem-sub">
            A pilot token launch flow and proposed commodity index design. Custody, reserve management, and physical audit operations are not yet established.
          </p>
        </ScrollReveal>

        <ScrollReveal type="fade" delayMs={440}>
          <div className="ondo-ecosystem-cta-wrap">
            <a href="/launch" className="ondo-ecosystem-btn-partner">
              Strike a Token Pair (Rail A)
            </a>
          </div>
        </ScrollReveal>

        {/* Living Kinetic Orbital Pools */}
        <div className="ondo-ecosystem-pools-wrap">
          <OrbitPools />
        </div>
      </div>
    </section>
  );
}
