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
 * sCRIT Protocol Official Brand Logo
 * Geometric Interlocking S Monogram: Two precision-faceted gold & platinum bullion ingots
 * in an architectural vault octagonal silhouette.
 */
export function ScritLogo({
  size = 28,
  className = "",
  variant = "vector",
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
          borderRadius: Math.round(size * 0.22),
          overflow: "hidden",
          flexShrink: 0,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.18)",
          ...style,
        }}
      >
        <Image
          src="/images/scrit_logo.jpg"
          alt="sCRIT Brand Emblem"
          width={size}
          height={size}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          priority
        />
      </div>
    );
  }

  // Crisp Vector SVG: Geometric dual-metal interlocking S bullion mark
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`scrit-brand-vector-mark ${className}`}
      style={{ flexShrink: 0, ...style }}
      aria-label="sCRIT Emblem"
    >
      <defs>
        {/* Gold Bullion Gradient */}
        <linearGradient id="scritGoldGrad" x1="4" y1="4" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f7e19b" />
          <stop offset="45%" stopColor="#d4a338" />
          <stop offset="100%" stopColor="#8c6418" />
        </linearGradient>

        {/* Platinum / Silver Facet Gradient */}
        <linearGradient id="scritSilverGrad" x1="32" y1="4" x2="4" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#c5c8cc" />
          <stop offset="100%" stopColor="#7a8288" />
        </linearGradient>

        {/* Deep Shadow Gradient for 3D Bevel depth */}
        <linearGradient id="scritShadowGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#59400f" />
          <stop offset="100%" stopColor="#2c2007" />
        </linearGradient>
      </defs>

      {/* Background Outer Octagon Ring (Subtle Vault Halo) */}
      <polygon
        points="11,2 25,2 34,11 34,25 25,34 11,34 2,25 2,11"
        fill="currentColor"
        fillOpacity="0.04"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.12"
      />

      {/* TOP & RIGHT INGOT: Platinum / Silver Faceted Bar */}
      <g>
        {/* Top-Right Chamfered Outer Body */}
        <path
          d="M17.5 5.5L25 5.5L30.5 11L30.5 16.5L24.5 22.5L18.5 22.5L21.5 19.5L24 19.5L27 16.5L27 12.5L23 8.5L17.5 8.5L14.5 11.5L12 9L17.5 5.5Z"
          fill="url(#scritSilverGrad)"
        />
        {/* Inner Platinum Highlight Facet */}
        <path
          d="M18 7L24 7L28 11V15L23.5 19.5H20.5L24 16V13L21.5 10.5H16L18 7Z"
          fill="#ffffff"
          fillOpacity="0.45"
        />
        {/* 45-degree Bevel Shade */}
        <path
          d="M27 12.5L30.5 11V16.5L27 16.5V12.5Z"
          fill="#5a6168"
          fillOpacity="0.4"
        />
      </g>

      {/* BOTTOM & LEFT INGOT: Gold Bullion Faceted Bar */}
      <g>
        {/* Bottom-Left Chamfered Outer Body */}
        <path
          d="M18.5 30.5L11 30.5L5.5 25L5.5 19.5L11.5 13.5L17.5 13.5L14.5 16.5L12 16.5L9 19.5L9 23.5L13 27.5L18.5 27.5L21.5 24.5L24 27L18.5 30.5Z"
          fill="url(#scritGoldGrad)"
        />
        {/* Inner Gold Highlight Facet */}
        <path
          d="M18 29L12 29L8 25V21L12.5 16.5H15.5L12 20V23L14.5 25.5H20L18 29Z"
          fill="#ffeaad"
          fillOpacity="0.5"
        />
        {/* 45-degree Bevel Shade */}
        <path
          d="M9 23.5L5.5 25V19.5L9 19.5V23.5Z"
          fill="url(#scritShadowGrad)"
          fillOpacity="0.45"
        />
      </g>

      {/* Central Interlocking Axis Keystones */}
      <polygon
        points="14.5,13.5 18,17 18,19 14.5,15.5"
        fill="url(#scritGoldGrad)"
        fillOpacity="0.8"
      />
      <polygon
        points="21.5,22.5 18,19 18,17 21.5,20.5"
        fill="url(#scritSilverGrad)"
        fillOpacity="0.8"
      />
    </svg>
  );
}
