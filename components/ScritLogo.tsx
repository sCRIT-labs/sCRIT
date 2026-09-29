"use client";

import React from "react";
import Image from "next/image";

interface ScritLogoProps {
  size?: number;
  className?: string;
  variant?: "vector" | "image";
  style?: React.CSSProperties;
}

/**
 * sCRIT Protocol Sovereign Brand Mark
 * Bespoke Celestial Metallurgy & Assay Caliper:
 * A luminous crystalline mineral core clasped by dual interlocking crescent calipers
 * in 24K Gold & Titanium, forming a bespoke sculptural "S" curve.
 */
export function ScritLogo({
  size = 28,
  className = "",
  variant = "image",
  style,
}: ScritLogoProps) {
  if (variant === "image") {
    return (
      <div
        className={`scrit-brand-emblem-wrap ${className}`}
        style={{
          width: size,
          height: size,
          position: "relative",
          borderRadius: Math.round(size * 0.24),
          overflow: "hidden",
          flexShrink: 0,
          boxShadow: "0 4px 14px rgba(0, 0, 0, 0.28), 0 0 10px rgba(217, 169, 46, 0.15)",
          background: "#080908",
          ...style,
        }}
      >
        <Image
          src="/images/scrit_logo.jpg"
          alt="sCRIT Sovereign Emblem"
          width={size}
          height={size}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          priority
        />
      </div>
    );
  }

  // Pure Vector SVG representation of the Sovereign Prism & Calipers
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`scrit-brand-vector-mark ${className}`}
      style={{ flexShrink: 0, ...style }}
      aria-label="sCRIT Sovereign Emblem"
    >
      <defs>
        {/* Molten 24K Gold Gradient */}
        <linearGradient id="scritCaliperGold" x1="6" y1="12" x2="26" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fae7a5" />
          <stop offset="35%" stopColor="#d9a92e" />
          <stop offset="80%" stopColor="#8c6418" />
          <stop offset="100%" stopColor="#543b0d" />
        </linearGradient>

        {/* Brushed Titanium / Platinum Gradient */}
        <linearGradient id="scritCaliperTitanium" x1="14" y1="4" x2="34" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#d5d8dc" />
          <stop offset="70%" stopColor="#68717a" />
          <stop offset="100%" stopColor="#2a3036" />
        </linearGradient>

        {/* Crystal Facet Shimmer */}
        <linearGradient id="scritCrystalGlow" x1="15" y1="13" x2="25" y2="27" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#e8eff5" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#b4c3d1" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {/* TOP & RIGHT CALIPER: Brushed Dark Titanium Arc */}
      <path
        d="M21 5.5C29.5 6.5 35 13.5 32 22C30.8 25.5 28.5 28 24.5 30C27 26 28 21.5 25.5 17.5C23.5 14 19.5 10.8 15 10.5C17.2 8.2 19.2 6.5 21 5.5Z"
        fill="url(#scritCaliperTitanium)"
      />

      {/* BOTTOM & LEFT CALIPER: Polished 24K Gold Arc */}
      <path
        d="M19 34.5C10.5 33.5 5 26.5 8 18C9.2 14.5 11.5 12 15.5 10C13 14 12 18.5 14.5 22.5C16.5 26 20.5 29.2 25 29.5C22.8 31.8 20.8 33.5 19 34.5Z"
        fill="url(#scritCaliperGold)"
      />

      {/* CENTRAL RARE-EARTH CRYSTAL PRISM */}
      {/* Outer Hex Prism Frame */}
      <polygon
        points="20,13 25.5,16.5 25.5,23.5 20,27 14.5,23.5 14.5,16.5"
        fill="url(#scritCrystalGlow)"
        stroke="#ffffff"
        strokeWidth="0.8"
      />
      {/* Inner Crystal Facets */}
      <polygon points="20,13 20,20 14.5,16.5" fill="#ffffff" fillOpacity="0.75" />
      <polygon points="20,13 25.5,16.5 20,20" fill="#e1eaf2" fillOpacity="0.5" />
      <polygon points="25.5,16.5 25.5,23.5 20,20" fill="#c3d5e4" fillOpacity="0.6" />
      <polygon points="20,20 25.5,23.5 20,27" fill="#8aa2b8" fillOpacity="0.7" />
      <polygon points="14.5,23.5 20,20 20,27" fill="#a4bcd0" fillOpacity="0.8" />
      <polygon points="14.5,16.5 20,20 14.5,23.5" fill="#d2e2ee" fillOpacity="0.85" />

      {/* Brilliant Light Ping Core */}
      <circle cx="20" cy="20" r="1.5" fill="#ffffff" />
    </svg>
  );
}
