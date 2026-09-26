"use client";

import React from "react";

export function AnnouncementBar() {
  return (
    <aside aria-label="Announcement" className="top-announcement-bar">
      <div className="top-announcement-inner">
        <span className="announcement-text">
          <span className="hide-mobile">sCRIT INDEX · NINE TARGET COMMODITIES · DIAMONDS RAIL B ONLY · URANIUM UNAVAILABLE</span>
          <span className="show-mobile">sCRIT INDEX · NINE TARGET ASSETS</span>
        </span>
        <a href="#products" className="announcement-cta">
          <span>Explore the pilot</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </a>
      </div>
    </aside>
  );
}
