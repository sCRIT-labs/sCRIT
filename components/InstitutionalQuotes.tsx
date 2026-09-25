"use client";

import React, { useState } from "react";

const QUOTES = [
  {
    author: "Hans Keller",
    role: "Head of Bullion Custody & Settlement",
    firm: "ZURICH BONDED DEPOSITORY",
    initials: "HK",
    quote: "The LBMA Good Delivery rules represent the global benchmark for precious metal integrity. sCRIT's cryptographic attestation mechanism ensures that every single unit is mapped to allocated serial numbers in bonded vault storage."
  },
  {
    author: "Elena Rostova",
    role: "Chief Custody & Verification Officer",
    firm: "LOOMIS CUSTODY ZURICH",
    initials: "ER",
    quote: "A commodity token is only as legitimate as its verification layer. Signing typed EIP-712 receipt hashes upon physical bar arrival bridges Swiss high-security vaults directly with decentralized liquidity."
  },
  {
    author: "Adrian Vance",
    role: "Lead Ecosystem Architect",
    firm: "ROBINHOOD CHAIN LABS",
    initials: "AV",
    quote: "Locking new ecosystem token launches to pair with sCRIT creates a permanent floor mechanism that arbitrary ETH or meme pairings can never provide: 75% of swap fees directly buy physical metal."
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
                  aria-label={`Testimonial ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
