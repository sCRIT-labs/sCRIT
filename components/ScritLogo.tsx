"use client";

import React from "react";

interface ScritLogoProps {
  size?: number;
  className?: string;
  variant?: "lockup" | "mark";
  theme?: "dark" | "light" | "auto";
  style?: React.CSSProperties;
}

/**
 * sCRIT Protocol Official Brand Identity
 * Bespoke Sculpted sCRIT Wordmark with center Wave 'C' emblem inspired by Ondo Finance.
 * - In Dark Mode: Sculpted brushed platinum & titanium letterforms + luminous champagne gold & silver 'C'.
 * - In Light Mode: Sculpted dark gunmetal & obsidian letterforms + warm gold & deep navy 'C'.
 */
export function ScritLogo({
  size = 28,
  className = "",
  variant = "lockup",
  theme = "auto",
  style,
}: ScritLogoProps) {
  const themeClass =
    theme === "dark"
      ? "scrit-force-dark"
      : theme === "light"
      ? "scrit-force-light"
      : "";

  // Logo C mark on the left is prominent and enlarged; sCRIT text is refined and smaller
  const markSize = Math.round(size * 1.32);
  const textFontSize = Math.round(size * 0.72);

  if (variant === "mark") {
    return (
      <span
        className={`scrit-brand-mark-wrap ${themeClass} ${className}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          width: size,
          height: size,
          verticalAlign: "middle",
          flexShrink: 0,
          ...style,
        }}
      >
        <img
          src="/assets/scrit-mark-dark.webp"
          alt="sCRIT Mark"
          width={size}
          height={size}
          className="scrit-brand-mark scrit-brand-c-dark"
          style={{ width: size, height: size, objectFit: "contain" }}
        />
        <img
          src="/assets/scrit-mark-light.webp"
          alt="sCRIT Mark"
          width={size}
          height={size}
          className="scrit-brand-mark scrit-brand-c-light"
          style={{ width: size, height: size, objectFit: "contain" }}
        />
      </span>
    );
  }

  // Classic lockup: Logo C on the left (enlarged), clean sCRIT text on the right
  return (
    <span
      className={`scrit-brand-lockup ${themeClass} ${className}`}
      aria-label="sCRIT"
      title="sCRIT"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: Math.max(3, Math.round(size * 0.14)),
        textDecoration: "none",
        verticalAlign: "middle",
        userSelect: "none",
        lineHeight: 1,
        ...style,
      }}
    >
      {/* 1. Logo C di kiri, diperbesar */}
      <span
        className="scrit-brand-mark-wrap"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          width: markSize,
          height: markSize,
          flexShrink: 0,
        }}
      >
        <img
          src="/assets/scrit-mark-dark.webp"
          alt="sCRIT"
          width={markSize}
          height={markSize}
          className="scrit-brand-mark scrit-brand-c-dark"
          style={{ width: markSize, height: markSize, objectFit: "contain" }}
        />
        <img
          src="/assets/scrit-mark-light.webp"
          alt="sCRIT"
          width={markSize}
          height={markSize}
          className="scrit-brand-mark scrit-brand-c-light"
          style={{ width: markSize, height: markSize, objectFit: "contain" }}
        />
      </span>

      {/* 2. Sebelah kanan logo: teks sCRIT (dikecilkan agar mark C menjadi sorotan utama) */}
      <span
        className="scrit-brand-text"
        style={{
          fontSize: textFontSize,
          lineHeight: 1,
        }}
      >
        <span className="scrit-brand-s">s</span>
        <span className="scrit-brand-crit">CRIT</span>
      </span>
    </span>
  );
}
