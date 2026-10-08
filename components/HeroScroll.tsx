"use client";

import React, { useEffect, useRef, useState } from "react";
import { ScritCaBadge } from "./ScritCaBadge";

const TICKER_ICONS: Record<string, React.ReactNode> = {
  au: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="7" />
    </svg>
  ),
  ag: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="7" />
    </svg>
  ),
  pt: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
      <rect x="5" y="5" width="14" height="14" rx="2" />
    </svg>
  ),
  shield: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  vault: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  speed: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  scale: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1zM2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1zM7 21h10M12 3v18M3 7h18" />
    </svg>
  ),
  engine: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 21h5v-5" />
    </svg>
  ),
};

const TICKER_ITEMS = [
  { label: "Dy · Tb heavy rare earths (HREE)", badge: "40% TARGET", iconKey: "au" },
  { label: "Nd · Sc magnet and minor rare earths", badge: "15% TARGET", iconKey: "ag" },
  { label: "Pt · Pd platinum-group metals (PGMs)", badge: "15% TARGET", iconKey: "pt" },
  { label: "Battery-grade lithium carbonate", badge: "5% TARGET", iconKey: "pt" },
  { label: "Au · Ag monetary ballast", badge: "25% TARGET", iconKey: "vault" },
  { label: "EIP-712 Cryptographic Attestation Engine", badge: "RESERVE GATE", iconKey: "shield" },
  { label: "Custodian-scoped attestation records", badge: "EVIDENCE FLOW", iconKey: "vault" },
  { label: "Robinhood L2 Sub-Second Settlement", badge: "EVM NATIVE", iconKey: "speed" },
  { label: "sCRIT / ETH Untaxed Base Discovery Pool", badge: "0% TOLL", iconKey: "scale" },
  { label: "TOKEN / sCRIT V4 project pools", badge: "2.5% · 75/25", iconKey: "engine" },
];

export function HeroScroll() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [viewport, setViewport] = useState({ w: 1440, h: 900 });

  useEffect(() => {
    let ticking = false;

    const updateSize = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    };
    updateSize();
    window.addEventListener("resize", updateSize);

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const el = trackRef.current;
          if (el) {
            const rect = el.getBoundingClientRect();
            const totalDistance = el.offsetHeight - window.innerHeight;
            const current = -rect.top;
            const rawP = totalDistance > 0 ? Math.min(1, Math.max(0, current / totalDistance)) : 0;
            // Apply slight cubic easing for a silky luxury feel
            const easedP = rawP < 0.5 ? 2 * rawP * rawP : 1 - Math.pow(-2 * rawP + 2, 2) / 2;
            setProgress(easedP);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  const isMobile = viewport.w < 768;

  // Final card size & adaptive split mechanics
  const targetCardSize = isMobile
    ? Math.min(260, viewport.w * 0.72)
    : Math.min(360, Math.max(260, viewport.w * 0.25));
  const minDim = Math.min(viewport.w, viewport.h);
  const targetScale = targetCardSize / minDim;
  const currentScale = 1 - (1 - targetScale) * progress;

  // 1:1 Aspect ratio crop
  const cropX = Math.max(0, (viewport.w - minDim) / 2) * progress;
  const cropY = Math.max(0, (viewport.h - minDim) / 2) * progress;
  const currentCornerRadius = 48 * progress;

  // Center spacer between headline words that expands as card shrinks into view
  const targetSpacerWidth = targetCardSize + (isMobile ? 24 : 64);
  const currentSpacerWidth = 8 + (targetSpacerWidth - 8) * progress;

  const targetSpacerHeight = targetCardSize + 32;
  const currentSpacerHeight = 6 + (targetSpacerHeight - 6) * progress;

  // Interpolated colors
  const textColorVal = Math.round(255 * (1 - progress));
  const textColor = `rgb(${textColorVal}, ${textColorVal}, ${textColorVal})`;

  // Subtext below card reveals once video is small (progress > 0.6)
  const subtextProgress = Math.min(1, Math.max(0, (progress - 0.55) / 0.45));
  const subtextOpacity = subtextProgress;
  const subtextTranslateY = (1 - subtextProgress) * 16;

  // Fading indicators
  const cueOpacity = Math.max(0, 1 - progress * 3.5);
  const tickerOpacity = Math.max(0, 1 - progress * 3);

  return (
    <div
      ref={trackRef}
      className="scrit-hero-track"
      style={{
        height: "180vh",
        position: "relative",
      }}
    >
      <section
        className="scrit-hero-stage"
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          width: "100%",
          overflow: "hidden",
          backgroundColor: `rgb(${Math.round(255 * progress)}, ${Math.round(255 * progress)}, ${Math.round(255 * progress)})`,
        }}
      >
        {/* Layer 0: Centered Video (Scales & clips to luxury rounded card) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          <div
            style={{
              gridArea: "1 / 1",
              width: `${viewport.w}px`,
              height: `${viewport.h}px`,
              overflow: "hidden",
              willChange: "transform, clip-path",
              clipPath: `inset(${cropY}px ${cropX}px round ${currentCornerRadius}px)`,
              transform: `scale(${currentScale})`,
              boxShadow: progress > 0.4 ? `0 24px 60px rgba(0, 0, 0, ${0.35 * progress}), 0 0 30px rgba(217, 169, 46, ${0.2 * progress})` : "none",
              borderRadius: "0px",
              position: "relative",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/scrit_vault_core.jpg"
              alt="sCRIT Stockpile Core"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                transform: `scale(${1.08 - progress * 0.05})`,
                transition: "transform 0.1s ease-out",
                filter: `brightness(${0.88 + progress * 0.12}) contrast(1.08)`,
              }}
            />
            {/* Dark gradient overlay that eases out on scroll */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.7) 100%)",
                opacity: 1 - progress * 0.6,
                transition: "opacity 0.05s linear",
              }}
            />
          </div>
        </div>

        {/* Layer 1: Headline (Splits horizontally on desktop, stacks vertically on mobile) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            zIndex: 2,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              maxWidth: "1400px",
              padding: "0 clamp(16px, 4vw, 48px)",
              boxSizing: "border-box",
            }}
          >
            <h1
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                color: textColor,
                margin: 0,
                padding: 0,
              }}
            >
              <span
                style={{
                  flex: isMobile ? "none" : "1 1 0",
                  display: "flex",
                  justifyContent: isMobile ? "center" : "flex-end",
                  textAlign: isMobile ? "center" : "right",
                  whiteSpace: "nowrap",
                  willChange: "transform",
                  transform: `scale(${1 - progress * 0.05})`,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: isMobile ? "clamp(20px, 5.8vw, 30px)" : "clamp(24px, 2.5vw, 42px)",
                    fontWeight: 600,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.08,
                    color: textColor,
                  }}
                >
                  Stockpile
                </span>
              </span>

              {/* Dynamic breathing spacer that pushes words cleanly outside the image card */}
              <span
                aria-hidden="true"
                style={{
                  width: isMobile ? "0px" : `${currentSpacerWidth}px`,
                  height: isMobile ? `${currentSpacerHeight}px` : "0px",
                  flexShrink: 0,
                  display: "inline-block",
                  pointerEvents: "none",
                }}
              />

              <span
                style={{
                  flex: isMobile ? "none" : "1 1 0",
                  display: "flex",
                  justifyContent: isMobile ? "center" : "flex-start",
                  textAlign: isMobile ? "center" : "left",
                  whiteSpace: "nowrap",
                  willChange: "transform",
                  transform: `scale(${1 - progress * 0.05})`,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: isMobile ? "clamp(20px, 5.8vw, 30px)" : "clamp(24px, 2.5vw, 42px)",
                    fontWeight: 600,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.08,
                    color: textColor,
                  }}
                >
                  the chokepoint.
                </span>
              </span>
            </h1>
          </div>
        </div>

        {/* Layer 2: Subtext positioned below the centered card */}
        <div
          style={{
            position: "absolute",
            top: `calc(50% + ${isMobile ? targetCardSize / 2 + 70 : targetCardSize / 2 + 20}px)`,
            left: 0,
            right: 0,
            margin: "0 auto",
            maxWidth: "560px",
            padding: "0 24px",
            textAlign: "center",
            pointerEvents: "none",
            zIndex: 2,
            opacity: subtextOpacity,
            transform: `translateY(${subtextTranslateY}px)`,
            transition: "opacity 0.05s linear, transform 0.05s linear",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: isMobile ? "13.5px" : "15.5px",
              lineHeight: 1.55,
              color: "#475467",
              letterSpacing: "-0.015em",
              margin: 0,
            }}
          >
            sCRIT is building an on-chain stockpile of <abbr title="Technology-critical elements - the metals modern hardware can't be built without." style={{ textDecoration: "underline dotted", cursor: "help" }}>technology-critical elements (TCEs)</abbr> - led by <abbr title="Heavy rare earth elements - the scarcest, most concentrated rare earths." style={{ textDecoration: "underline dotted", cursor: "help" }}>heavy rare earths (HREE)</abbr>, ballasted by <abbr title="Gold and silver keep the index stable while TCEs move." style={{ textDecoration: "underline dotted", cursor: "help" }}>monetary ballast</abbr>. Every token launched here deepens it. Rail A pairs every launched token against sCRIT. A 2.5% tax on those pools funds <abbr title="An addition to the stockpile, recognised only once a custodian signs." style={{ textDecoration: "underline dotted", cursor: "help" }}>accessions</abbr> to the stockpile - dysprosium and terbium first.
          </p>
        </div>

        {/* Layer 2.5: Clean Hero CA Pill */}
        <div
          style={{
            position: "absolute",
            bottom: isMobile ? "120px" : "146px",
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            padding: "0 16px",
            zIndex: 12,
            pointerEvents: "auto",
            opacity: cueOpacity,
            transition: "opacity 0.08s linear",
          }}
        >
          <ScritCaBadge variant="hero" />
        </div>

        {/* Layer 3: Scroll cue */}
        <div
          style={{
            position: "absolute",
            bottom: isMobile ? "84px" : "104px",
            left: 0,
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            color: "rgba(255, 255, 255, 0.9)",
            fontSize: "13px",
            fontWeight: 500,
            letterSpacing: "0.02em",
            pointerEvents: "none",
            zIndex: 10,
            opacity: cueOpacity,
            transition: "opacity 0.05s linear",
          }}
        >
          <span>Scroll to inspect reserve</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M7 13l5 5 5-5M12 4v14" />
          </svg>
        </div>

        {/* Layer 4: Commodity & Custody Infrastructure Ticker Marquee */}
        <div
          style={{
            position: "absolute",
            bottom: isMobile ? "22px" : "34px",
            left: 0,
            width: "100%",
            padding: "8px 0",
            pointerEvents: "none",
            zIndex: 10,
            opacity: tickerOpacity,
            transition: "opacity 0.08s linear",
          }}
        >
          <div className="scrit-ticker-container">
            <div className="scrit-ticker-track">
              {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                <div key={i} className="scrit-ticker-pill">
                  <span className="ticker-pill-icon" style={{ display: "inline-flex", alignItems: "center", color: "var(--gold)" }}>
                    {TICKER_ICONS[item.iconKey]}
                  </span>
                  <span className="ticker-pill-label">{item.label}</span>
                  <span className="ticker-pill-badge">{item.badge}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
