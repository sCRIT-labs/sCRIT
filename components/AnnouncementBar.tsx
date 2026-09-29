"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export function AnnouncementBar() {
  return (
    <aside aria-label="Announcement" className="top-announcement-bar">
      <div className="top-announcement-inner">
        {/* Status Pill Badge */}
        <div className="announcement-pill-badge">
          <span>ISSUER GATEWAY</span>
        </div>

        {/* Centered Descriptive Text */}
        <div className="announcement-text-wrap">
          <span className="hide-mobile">
            STEP 1 · GET ISSUER CLEARANCE · STEP 2 · STRIKE UNISWAP V4 LIQUIDITY PAIR
          </span>
          <span className="show-mobile">
            STEP 1 · ISSUER CLEARANCE DESK
          </span>
        </div>

        {/* Refined CTA Link */}
        <Link href="/issuer" className="announcement-cta-pill">
          <span>Start Clearance Desk</span>
          <ArrowRight size={11} strokeWidth={2.5} />
        </Link>
      </div>
    </aside>
  );
}
