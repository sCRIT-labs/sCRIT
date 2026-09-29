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
              <a href="/proof" className="ondo-footer-btn-signup">Inspect proof of reserve <ArrowUpRight size={15} /></a>
              <a href="/launch" className="ondo-footer-secondary-link">Explore token launch</a>
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
                <ScritLogo size={20} variant="image" style={{ marginRight: "10px", verticalAlign: "middle", display: "inline-block" }} />
                sCRIT
              </Link>
              <p
                style={{
                  fontSize: "14px",
                  color: isDark ? "#8e8e93" : "#636366",
                  lineHeight: "1.6",
                  marginBottom: "24px",
                  maxWidth: "260px",
                }}
              >
                Commodity index and token launch pilot on Robinhood Chain, with reserve records maintained off-chain.
              </p>
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
                <li><Link href="/#products">Nine-Asset Basket Targets</Link></li>
              </ul>
            </div>

            {/* Col 3: Infrastructure */}
            <div>
              <h4 className="ondo-footer-col-heading">Infrastructure</h4>
              <ul className="ondo-footer-links-list">
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
                <li><Link href="/legal/disclaimer">Regulatory Sandbox</Link></li>
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
