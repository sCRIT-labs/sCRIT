"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  X,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  Coins,
  Layers,
  FileText,
  Sliders,
  Terminal,
  Scale,
  Rocket,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { HOOD_MAINNET, HOOD_TESTNET, SCRIT_CHAIN_ID } from "@/lib/scrit";

export interface NavItem {
  num: string;
  label: string;
  badge: string;
  description: string;
  href: string;
  isExternal?: boolean;
  image: string;
  tag: string;
  specs: string[];
}

const NAV_ITEMS: NavItem[] = [
  {
    num: "01",
    label: "Liquidity Engine & Launchpad",
    badge: "RAIL A",
    description: "Deploy community tokens and strike concentrated Uniswap V4 liquidity pools anchored to sCRIT.",
    href: "/launch",
    image: "/images/scrit_kinetic_scale.jpg",
    tag: "UNISWAP V4 HOOK · CONCENTRATED LP",
    specs: ["2.5% Hook Fee (75% Reserve / 25% Ops)", "0.30% Pool Fee", "Robinhood Chain"],
  },
  {
    num: "02",
    label: "Reserve Tokens Directory",
    badge: "ECOSYSTEM",
    description: "Verified registry of all tokens launched and anchored to the physical commodity index.",
    href: "/tokens",
    image: "/images/scrit_nav_telemetry.jpg",
    tag: "VERIFIED REGISTRY · DIRECT LIQUIDITY",
    specs: ["Canonical Mainnet & Testnet", "Real-Time LP Depth", "Contract Links"],
  },
  {
    num: "03",
    label: "Reserve Evidence & Proof of Reserve",
    badge: "PROOF",
    description: "Inspect on-chain NAV estimates, attested custody batch records, and audited cryptographic signatures.",
    href: "/proof",
    image: "/images/scrit_attestation_network.jpg",
    tag: "ON-CHAIN ATTESTATION · INDICATIVE NAV",
    specs: ["9 Commodity Feeds", "Audited Vault Batches", "Zero Peg Disclaimers"],
  },
  {
    num: "04",
    label: "Certified Commodity Lots",
    badge: "RAIL B",
    description: "Fractionalized 100-unit physical precious metal and certified gem lots settled on-chain.",
    href: "/lots",
    image: "/images/scrit_market_scale.jpg",
    tag: "100-UNIT FRACTIONAL LOTS · ORDER BOOK",
    specs: ["Automated Order Escrow", "On-Chain Settle", "Direct sCRIT Pairs"],
  },
  {
    num: "05",
    label: "Institutional Issuer Desk",
    badge: "PARTNERS",
    description: "Onboarding and attestation submission pipeline for qualified commodity depository partners.",
    href: "/issuer",
    image: "/images/scrit_depository_facade.jpg",
    tag: "QUALIFIED CUSTODIANS · ATTESTATIONS",
    specs: ["Service Review Desk", "Launcher Whitelist", "Audit Log Pipeline"],
  },
  {
    num: "06",
    label: "Pilot Intelligence Copilot",
    badge: "AI GUIDE",
    description: "Real-time conversational agent explaining basket composition, risk models, and mechanics.",
    href: "/copilot",
    image: "/images/scrit_assay_lab.jpg",
    tag: "NEURAL FINTECH AGENT · CONTEXT AWARE",
    specs: ["Upstream LLM Streaming", "Knowledge Base RAG", "Protocol Disclosures"],
  },
  {
    num: "07",
    label: "Nine Physical Commodity Index",
    badge: "OVERVIEW",
    description: "Target basket architecture spanning Gold, Silver, Platinum, Palladium, and critical tech metals.",
    href: "/#products",
    image: "/images/scrit_vault_core.jpg",
    tag: "9 PHYSICAL TARGET COMMODITIES",
    specs: ["Au · Ag · Pt · Pd", "Nd · Dy · Tb · Sc · Li", "Strictly Non-Pegged"],
  },
  {
    num: "08",
    label: "Protocol Administration",
    badge: "ADMIN",
    description: "Administrative console for manual price oracle updates, attestation ingestion, and key management.",
    href: "/admin",
    image: "/images/scrit_hardware_key.jpg",
    tag: "ORACLE CONTROL · ATTESTATION KEYS",
    specs: ["Manual Price Oracle", "Key Rotation", "Batch Verification"],
  },
  {
    num: "09",
    label: "Terms & Risk Disclosures",
    badge: "LEGAL",
    description: "Mandatory pilot disclaimers, custody architecture limits, and non-redemption legal terms.",
    href: "/legal/risk-disclosure",
    image: "/images/scrit_depository_monolith.jpg",
    tag: "RISK DISCLOSURES · LEGAL DOCUMENTATION",
    specs: ["Zero Pilot Redemption", "No 1:1 Commodity Claim", "Open-Source Licensing"],
  },
];

interface NavigationDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NavigationDialog({ isOpen, onClose }: NavigationDialogProps) {
  const [activeItem, setActiveItem] = useState<NavItem>(NAV_ITEMS[0]);
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const activeNetwork = SCRIT_CHAIN_ID === 4663 ? HOOD_MAINNET : HOOD_TESTNET;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    // Lock scroll when open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNavigate = (href: string) => {
    onClose();
    if (href.startsWith("#")) {
      const el = document.querySelector(href);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      router.push(href);
    }
  };

  return (
    <div
      className="nav-dialog-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="sCRIT Protocol Directory"
    >
      <div className="nav-dialog-surface" ref={dialogRef}>
        {/* Top Masthead Row */}
        <div className="nav-dialog-masthead">
          <div className="nav-dialog-brand">
            <svg width="26" height="26" viewBox="0 0 32 32" fill="none" className="nav-brand-icon">
              <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.3" />
              <path d="M16 6C10.477 6 6 10.477 6 16C6 21.523 10.477 26 16 26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M16 11C13.2386 11 11 13.2386 11 16C11 18.7614 13.2386 21 16 21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="16" cy="16" r="2.5" fill="currentColor" />
            </svg>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span className="nav-dialog-brand-title">sCRIT DIRECTORY</span>
              <span className="nav-dialog-brand-subtitle">
                Robinhood Chain · {activeNetwork.name} ({activeNetwork.id})
              </span>
            </div>
          </div>

          <button
              type="button"
              className="nav-dialog-close-btn"
              onClick={onClose}
              aria-label="Close menu"
            >
              <span>CLOSE</span>
              <X size={15} strokeWidth={2.5} />
            </button>
        </div>

        {/* Master Experience Grid */}
        <div className="nav-dialog-body">
          {/* Left Column: Numbered Page Roster */}
          <div className="nav-dialog-roster">
            <div className="nav-roster-header">
              <span className="nav-roster-eyebrow">SYSTEM DIRECTORY &amp; PROTOCOL MODULES</span>
              <span className="nav-roster-count">{NAV_ITEMS.length} SECTIONS</span>
            </div>

            <nav className="nav-roster-list" aria-label="Main directory navigation">
              {NAV_ITEMS.map((item) => {
                const isActive = activeItem.num === item.num;
                return (
                  <div
                    key={item.num}
                    className={`nav-roster-item ${isActive ? "is-active" : ""}`}
                    onMouseEnter={() => setActiveItem(item)}
                    onClick={() => handleNavigate(item.href)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleNavigate(item.href);
                      }
                    }}
                  >
                    <span className="nav-item-num">{item.num}</span>
                    <div className="nav-item-content">
                      <div className="nav-item-title-row">
                        <span className="nav-item-label">{item.label}</span>
                        <span className="nav-item-badge">{item.badge}</span>
                      </div>
                      <p className="nav-item-desc">{item.description}</p>
                    </div>
                    <ArrowUpRight size={17} className="nav-item-arrow" />
                  </div>
                );
              })}
            </nav>

            <div className="nav-dialog-quick-action">
              <button
                type="button"
                className="nav-quick-launch-btn"
                onClick={() => handleNavigate("/launch")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Rocket size={17} />
                  <span>STRIKE A LIQUIDITY ENGINE (RAIL A)</span>
                </div>
                <ArrowUpRight size={16} />
              </button>
            </div>
          </div>

          {/* Right Column: Visual Telemetry Deck (Desktop) */}
          <div className="nav-dialog-visual">
            <div className="nav-visual-card">
              {/* Dynamic Image Frame */}
              <div className="nav-visual-image-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={activeItem.image}
                  src={activeItem.image}
                  alt={activeItem.label}
                  className="nav-visual-img"
                />
                <div className="nav-visual-overlay" />
                <div className="nav-visual-reticle top-left">⌖</div>
                <div className="nav-visual-reticle top-right">⌖</div>
                <div className="nav-visual-reticle bottom-left">⌖</div>
                <div className="nav-visual-reticle bottom-right">⌖</div>

                <div className="nav-visual-top-badge">
                  <Sparkles size={11} color="var(--gold-bright)" />
                  <span>{activeItem.tag}</span>
                </div>
              </div>

              {/* Visual Card Details */}
              <div className="nav-visual-info">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <span className="nav-visual-num">{activeItem.num} // MODULE SPEC</span>
                  <span className="nav-visual-tag">{activeItem.badge}</span>
                </div>

                <h3 className="nav-visual-title">{activeItem.label}</h3>
                <p className="nav-visual-desc">{activeItem.description}</p>

                {/* Specs List */}
                <div className="nav-visual-specs">
                  {activeItem.specs.map((spec, i) => (
                    <div key={i} className="nav-visual-spec-item">
                      <CheckCircle2 size={12} color="#d0aa5b" />
                      <span>{spec}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="nav-visual-cta"
                  onClick={() => handleNavigate(activeItem.href)}
                >
                  <span>Open {activeItem.label}</span>
                  <ArrowUpRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Telemetry Strip */}
        <div className="nav-dialog-footer">
          <div className="nav-footer-left">
            <span className="mono-sm" style={{ color: "#747e70" }}>
              CANONICAL REGISTRY:
            </span>
            <span className="mono-sm" style={{ color: "var(--gold-bright)", letterSpacing: "0.04em" }}>
              {activeNetwork.id === 4663
                ? "0x5607...1c22 (Uniswap V4 2.5% Hooked)"
                : "0x7613...8755 (Uniswap V3 Rehearsal)"}
            </span>
          </div>

          <div className="nav-footer-right">
            <span>NO PILOT REDEMPTION · ZERO 1:1 COMMODITY CLAIMS</span>
            <span className="nav-footer-dot">·</span>
            <span>ROBINHOOD CHAIN PILOT</span>
          </div>
        </div>
      </div>
    </div>
  );
}
