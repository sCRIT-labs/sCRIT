"use client";

import React from "react";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { HeaderNav } from "@/components/HeaderNav";
import { HeroScroll } from "@/components/HeroScroll";
import { LandingExperience } from "@/components/LandingExperience";
import { InstitutionalFooter } from "@/components/InstitutionalFooter";
import { ScrollProgress } from "@/components/ScrollProgress";

export default function Home() {
  return (
    <div className="ondo-page-root scrit-redesign">
      {/* Scroll Progress Indicator */}
      <ScrollProgress />

      {/* Top Banner Announcement & Dynamic Floating Navbar */}
      <AnnouncementBar />
      <HeaderNav />

      <main className="scrit-landing-curtain">
        {/* Keep the existing hero experience intact. */}
        <div data-nav-theme="dark">
          <HeroScroll />
        </div>
        <LandingExperience />
      </main>

      <div className="scrit-footer-reveal-spacer" aria-hidden="true" />

      {/* 10. Skyscraper Subscribe Card + 4-Column White Institutional Footer */}
      <div data-nav-theme="dark" className="scrit-landing-footer">
        <InstitutionalFooter />
      </div>
    </div>
  );
}
