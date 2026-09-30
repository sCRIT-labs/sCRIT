"use client";

import React from "react";
import Link from "next/link";
import { ScrollReveal } from "./ScrollReveal";
import { HOOD_MAINNET } from "@/lib/scrit";
import { ArrowUpRight } from "lucide-react";
import { ScritLogo } from "./ScritLogo";

export function InstitutionalFooter({ theme = "light" }: { theme?: "light" | "dark" }) {
  const isDark = theme === "dark";

  return (
    <footer
      className="ondo-footer-root"
      style={{
        background: isDark ? "#000000" : "#ffffff",
        color: isDark ? "#ffffff" : "#000000",
      }}
    >
      {/* 1. Pilot information card */}
      <div className="ondo-section-container">
        <div className="ondo-footer-subscribe-card">
          {/* Background Vault Facade */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/scrit_depository_facade.jpg"
            alt=""
            className="ondo-footer-bg-facade"
          />
          <div className="ondo-footer-facade-overlay" />

          <div className="ondo-footer-subscribe-content">
            <h2 className="ondo-footer-hero-headline">
              <ScrollReveal type="move" delayMs={50}>
                <span>Reserve records, in view</span>
              </ScrollReveal>
              <br />
              <ScrollReveal type="move" delayMs={160}>
                <span>Explore pilot mechanics,</span>
              </ScrollReveal>
              <br />
              <ScrollReveal type="move" delayMs={280}>
                <span>reserve evidence, and token launch.</span>
              </ScrollReveal>
            </h2>
            <div className="ondo-footer-form-row">
              <Link href="/proof" className="ondo-footer-btn-signup">Inspect proof of reserve <ArrowUpRight size={15} /></Link>
              <Link href="/launch" className="ondo-footer-secondary-link">Explore token launch</Link>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Navigation & Legal Disclaimers */}
      <div
        className="ondo-footer-white-bottom"
        style={{
          padding: "80px 24px 60px",
          background: isDark ? "#000000" : "#ffffff",
          color: isDark ? "#ffffff" : "#000000",
          borderTop: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "none",
        }}
      >
        <div className="ondo-section-container">
          <div className="ondo-footer-links-grid">
            {/* Col 1: Brand & Logo */}
            <div className="ondo-footer-brand-col">
              <Link
                href="/"
                className="ondo-footer-logo-title"
                style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  marginBottom: "16px",
                  color: isDark ? "#ffffff" : "#000000",
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                <ScritLogo size={24} />
              </Link>
              <p
                style={{
                  fontSize: "14px",
                  color: isDark ? "#8e8e93" : "#636366",
                  lineHeight: "1.6",
                  marginBottom: "18px",
                  maxWidth: "260px",
                }}
              >
                Commodity index and token launch pilot on Robinhood Chain, with reserve records maintained off-chain.
              </p>

              {/* Official Social & GitHub Links */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "8px",
                  marginBottom: "20px",
                }}
              >
                <a
                  href="https://x.com/getsCRIT"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Follow sCRIT on X (@getsCRIT)"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "5px 11px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: 600,
                    textDecoration: "none",
                    background: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)",
                    color: isDark ? "#ffffff" : "#111411",
                    border: isDark ? "1px solid rgba(255, 255, 255, 0.14)" : "1px solid rgba(0, 0, 0, 0.1)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  <span>@getsCRIT</span>
                </a>

                <a
                  href="https://github.com/sCRIT-labs/sCRIT"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="sCRIT repository on GitHub"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "5px 11px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: 600,
                    textDecoration: "none",
                    background: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)",
                    color: isDark ? "#ffffff" : "#111411",
                    border: isDark ? "1px solid rgba(255, 255, 255, 0.14)" : "1px solid rgba(0, 0, 0, 0.1)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  <span>GitHub</span>
                </a>
              </div>

              <div style={{ fontSize: "12px", color: isDark ? "#636366" : "#8e8e93" }}>
                &copy; {new Date().getFullYear()} sCRIT Protocol. Open source contracts.
              </div>
            </div>

            {/* Col 2: Protocol */}
            <div>
              <h4 className="ondo-footer-col-heading">Protocol</h4>
              <ul className="ondo-footer-links-list">
                <li><Link href="/issuer">Issuer Clearance Desk</Link></li>
                <li><Link href="/launch">Strike a Pair (Rail A)</Link></li>
                <li><Link href="/tokens">Tokens Directory</Link></li>
                <li><Link href="/proof">Proof of Reserve</Link></li>
                <li><Link href="/lots">Certified Lots (Rail B)</Link></li>
                <li><Link href="/copilot">Copilot AI Guide</Link></li>
                <li><Link href="/#products">Nine-Asset Basket Targets</Link></li>
              </ul>
            </div>

            {/* Col 3: Infrastructure */}
            <div>
              <h4 className="ondo-footer-col-heading">Infrastructure &amp; Code</h4>
              <ul className="ondo-footer-links-list">
                <li><a href="https://github.com/sCRIT-labs/sCRIT" target="_blank" rel="noopener noreferrer">GitHub Repository</a></li>
                <li><a href="https://x.com/getsCRIT" target="_blank" rel="noopener noreferrer">Official X (@getsCRIT)</a></li>
                <li><Link href="/admin">Manual pilot operations</Link></li>
                <li><a href="/api/prices" target="_blank" rel="noreferrer">Prices Feed API (JSON)</a></li>
                <li><a href="/api/custodians" target="_blank" rel="noreferrer">Custodian Registry (JSON)</a></li>
                <li><a href={HOOD_MAINNET.explorer} target="_blank" rel="noreferrer">Robinhood Blockscout</a></li>
              </ul>
            </div>

            {/* Col 4: Compliance */}
            <div>
              <h4 className="ondo-footer-col-heading">Compliance</h4>
              <ul className="ondo-footer-links-list">
                <li><Link href="/legal/terms">Terms of Service</Link></li>
                <li><Link href="/legal/risk">Risk Disclosures</Link></li>
                <li><Link href="/legal/privacy">Privacy Policy</Link></li>
                <li><Link href="/legal/disclaimer">General Pilot Disclaimer</Link></li>
              </ul>
            </div>
          </div>

          <div className="ondo-footer-hairline" />

          {/* Legal Disclaimers */}
          <div className="ondo-footer-disclaimer-grid">
            <p>
              sCRIT is an experimental pilot index token. Its reserve view is derived from recorded EIP-712 custodian attestations and manual commodity prices. Pilot basket weights are targets, not a claim of fully funded holdings.
            </p>
            <p>
              sCRIT is not pegged to any sovereign currency or commodity unit. In the pilot phase, physical retail redemption is unavailable. A Rail A project token represents an AMM pairing with sCRIT, not a direct title claim on physical bars.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
