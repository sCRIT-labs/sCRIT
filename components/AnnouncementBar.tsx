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
          <span>PILOT PROTOCOL</span>
        </div>

        {/* Centered Descriptive Text */}
        <div className="announcement-text-wrap">
          <span className="hide-mobile">
            sCRIT INDEX · NINE TARGET COMMODITIES · DIAMONDS RAIL B ONLY · URANIUM UNAVAILABLE
          </span>
          <span className="show-mobile">
            sCRIT INDEX · NINE TARGET COMMODITIES
          </span>
        </div>

        {/* Refined CTA Link */}
        <Link href="/#products" className="announcement-cta-pill">
          <span>Explore the pilot</span>
          <ArrowRight size={11} strokeWidth={2.5} />
        </Link>
      </div>
    </aside>
  );
}
