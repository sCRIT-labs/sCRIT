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
 * sCRIT Protocol Official Brand Mark
 * Low-Poly Origami Geometric Monogram (MetaMask-inspired Faceted Aesthetic):
 * An iconic, sharp polygonal monogram of the letter 'S' sculpted from folded
 * metallic crystal plates in high-contrast monochrome.
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
          borderRadius: Math.round(size * 0.22),
          overflow: "hidden",
          flexShrink: 0,
          background: "#08090a",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.45)",
          ...style,
        }}
      >
        <Image
          src="/images/scrit_logo.jpg"
          alt="sCRIT Origami Monogram"
          width={size}
          height={size}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          priority
        />
      </div>
    );
  }

  // Pure 2D Flat Low-Poly Origami Facet Vector SVG
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`scrit-brand-vector-mark ${className}`}
      style={{ flexShrink: 0, ...style }}
      aria-label="sCRIT Origami Mark"
    >
      {/* Background Frame */}
      <rect width="36" height="36" rx="8" fill="#08090a" />

      {/* TOP WING FACETS (White, Gray, Dark Slate) */}
      {/* Top Outer Crest */}
      <polygon points="18,4 27,9 21,14" fill="#ffffff" />
      {/* Top Right Bevel */}
      <polygon points="27,9 27,15 21,14" fill="#8e97a0" />
      {/* Top Left Ridge */}
      <polygon points="18,4 21,14 15,11" fill="#c4cbd2" />
      <polygon points="15,11 9,8 18,4" fill="#3f474e" />
      <polygon points="9,8 15,11 11,16" fill="#23282c" />

      {/* MAIN DIAGONAL SPINE (Folded Metal Ribbon) */}
      {/* Upper Bright Spine */}
      <polygon points="15,11 25,18 21,21 11,16" fill="#ffffff" />
      {/* Lower Shaded Spine */}
      <polygon points="11,16 21,21 16,25 8,19" fill="#586169" />
      {/* Central Keystone Fold */}
      <polygon points="21,14 25,18 21,21" fill="#e2e7ec" />
      <polygon points="25,18 28,21 21,21" fill="#757e87" />

      {/* BOTTOM WING FACETS (Mirrored Origami Fold) */}
      {/* Bottom Outer Crest */}
      <polygon points="18,32 9,27 15,22" fill="#ffffff" />
      {/* Bottom Left Bevel */}
      <polygon points="9,27 9,21 15,22" fill="#8e97a0" />
      {/* Bottom Right Ridge */}
      <polygon points="18,32 15,22 21,25" fill="#c4cbd2" />
      <polygon points="21,25 27,28 18,32" fill="#3f474e" />
      <polygon points="27,28 21,25 25,20" fill="#23282c" />
    </svg>
  );
}
