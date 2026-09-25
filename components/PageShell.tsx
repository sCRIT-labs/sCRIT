"use client";

import React from "react";
import { HeaderNav } from "./HeaderNav";
import { AnnouncementBar } from "./AnnouncementBar";
import { InstitutionalFooter } from "./InstitutionalFooter";
import { useReveal } from "../hooks/useReveal";

import { ArrowLeft } from "lucide-react";

export const PageShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useReveal();
  return (
    <div className="scrit-subpage-root scrit-redesign">
      <AnnouncementBar />
      <HeaderNav />
      <main className="scrit-subpage-container">
        <div className="scrit-subpage-nav-bar">
          <a href="/" className="scrit-back-link">
            <ArrowLeft size={16} strokeWidth={2.2} />
            <span>Back to Overview</span>
          </a>
          <div className="scrit-subpage-tags">
            <span className="scrit-nav-pill-active">Pilot environment</span>
            <span className="scrit-nav-pill-chain">Robinhood Chain 4663</span>
          </div>
        </div>
        {children}
      </main>
      <InstitutionalFooter theme="dark" />
    </div>
  );
};
