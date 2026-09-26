"use client";

import React from "react";
import { HeaderNav } from "./HeaderNav";
import { AnnouncementBar } from "./AnnouncementBar";
import { InstitutionalFooter } from "./InstitutionalFooter";
import { useReveal } from "../hooks/useReveal";

import { ArrowLeft } from "lucide-react";
import { HOOD_MAINNET, HOOD_TESTNET, SCRIT_CHAIN_ID } from "@/lib/scrit";

export const PageShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useReveal();
  const network = SCRIT_CHAIN_ID === 4663 ? HOOD_MAINNET : HOOD_TESTNET;
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
            <span className="scrit-nav-pill-active">{network.id === 4663 ? "Mainnet environment" : "Testnet rehearsal"}</span>
            <span className="scrit-nav-pill-chain">{network.name} {network.id}</span>
          </div>
        </div>
        {children}
      </main>
      <InstitutionalFooter theme="dark" />
    </div>
  );
};
