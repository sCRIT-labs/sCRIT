"use client";

import React from "react";

interface ScritLogoProps {
  size?: number;
  className?: string;
  variant?: "lockup" | "mark";
  style?: React.CSSProperties;
}

/**
 * sCRIT Protocol Official Brand Identity
 * Horizontal Brand Wordmark & Kinetic Mark Asset (Parity with Artemis / kentir)
 * - Wordmark: /assets/logo.webp (Full horizontal brand artwork with 3D metallic typography & 24K gold orbit)
 * - Mark: /assets/scrit-mark.webp (Standalone orbital mark for compact UI & dialogs)
 */
export function ScritLogo({
  size = 28,
  className = "",
  variant = "lockup",
  style,
}: ScritLogoProps) {
  if (variant === "mark") {
    return (
      <img
        src="/assets/scrit-mark.webp"
        alt="sCRIT Mark"
        width={size}
        height={size}
        className={`scrit-brand-mark ${className}`}
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          display: "block",
          flexShrink: 0,
          ...style,
        }}
      />
    );
  }

  return (
    <img
      src="/assets/logo.webp"
      alt="sCRIT"
      height={size}
      className={`scrit-brand-wordmark ${className}`}
      style={{
        height: size,
        width: "auto",
        objectFit: "contain",
        display: "block",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
