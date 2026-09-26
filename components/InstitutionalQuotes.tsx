"use client";

import React, { useState } from "react";

const QUOTES = [
  {
    author: "Pilot status",
    role: "Physical custody",
    firm: "NO CONTRACTED VAULT",
    initials: "PS",
    quote: "The repository contains no signed custody agreement or independent physical audit evidence. Basket weights are design targets, not proof of allocated inventory."
  },
  {
    author: "Pilot status",
    role: "Attestation records",
    firm: "OFF-CHAIN SERVICE",
    initials: "PS",
    quote: "EIP-712 signatures are verified by the pilot service against a registered demo key and scope. The resulting records are not on-chain reserve accounting and do not independently prove delivery."
  },
  {
    author: "Pilot status",
    role: "Launch and fee model",
    firm: "NO PEG · 2.5% V4 POOL FEE",
    initials: "PS",
    quote: "Rail A pairs project tokens with sCRIT. Mainnet project pools use a 2.5% V4 hook fee split 75/25; this does not create a price floor or count as reserve inventory."
  }
];

export function InstitutionalQuotes() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const q = QUOTES[currentIdx];

  return (
    <section className="ondo-quote-section" id="quotes">
      <div className="ondo-section-container">
        <div className="ondo-quote-stage">
          <div className="ondo-quote-card">
            {/* Top Row: Speaker Info & Firm Logo */}
            <div className="ondo-quote-header-row">
              <div className="ondo-speaker-cluster">
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "16px",
                    background: "linear-gradient(135deg, #27272a 0%, #18181b 100%)",
                    border: "1px solid rgba(217, 169, 46, 0.4)",
                    color: "#f2c94c",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: "18px",
                    fontFamily: "var(--font-mono)",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                  }}
                >
                  {q.initials}
                </div>
                <div className="ondo-speaker-text">
                  <h3 className="ondo-speaker-name">{q.author}</h3>
                  <p className="ondo-speaker-role">{q.role}</p>
                </div>
              </div>
              <div className="ondo-firm-brand">{q.firm}</div>
            </div>

            {/* Quote Body */}
            <blockquote className="ondo-quote-body">
              &ldquo;{q.quote}&rdquo;
            </blockquote>

            {/* Navigation Switchers */}
            <div className="ondo-quote-controls">
              {QUOTES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIdx(idx)}
                  className={`ondo-quote-dot ${currentIdx === idx ? "is-active" : ""}`}
                  aria-label={`Pilot status ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
