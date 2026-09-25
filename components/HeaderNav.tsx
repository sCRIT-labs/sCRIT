"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";

export function HeaderNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`main-nav-wrapper ${scrolled ? "is-docked" : "is-top"}`}>
      <nav className="main-nav-pill">
        {/* Brandmark - points to home */}
        <Link href="/" className="nav-brand-group">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" className="nav-brand-icon">
            <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.3" />
            <path d="M16 6C10.477 6 6 10.477 6 16C6 21.523 10.477 26 16 26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M16 11C13.2386 11 11 13.2386 11 16C11 18.7614 13.2386 21 16 21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="16" cy="16" r="2.5" fill="currentColor" />
          </svg>
          <span className="nav-brand-text">sCRIT</span>
        </Link>

        {/* Center Links - works globally across all pages */}
        <div className="nav-center-menu">
          <Link href="/#products" className="nav-menu-link">
            Products
          </Link>
          <Link href="/#launch-model" className="nav-menu-link">
            Launch model
          </Link>
          <Link
            href="/proof"
            className={`nav-menu-link ${pathname === "/proof" ? "is-active-link" : ""}`}
          >
            Pilot evidence
          </Link>
          <Link href="/copilot" className={`nav-menu-link ${pathname === "/copilot" ? "is-active-link" : ""}`}>
            Pilot guide
          </Link>
          <Link href="/#ledger" className="nav-menu-link">
            Pilot telemetry
          </Link>
        </div>

        {/* Right CTA */}
        <div className="nav-right-actions">
          <Link
            href="/launch"
            className={`nav-btn-launch ${pathname === "/launch" ? "is-active-btn" : ""}`}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <span>Launch Pair</span>
            <ArrowUpRight size={14} strokeWidth={2.5} />
          </Link>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="nav-hamburger-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle Navigation"
            aria-expanded={mobileOpen}
            aria-controls="mobile-site-navigation"
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
          >
            {mobileOpen ? <X size={20} strokeWidth={2} /> : <Menu size={20} strokeWidth={2} />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="mobile-nav-panel" id="mobile-site-navigation">
          <Link href="/#products" onClick={() => setMobileOpen(false)}>
            Products
          </Link>
          <Link href="/#launch-model" onClick={() => setMobileOpen(false)}>
            Launch model
          </Link>
          <Link href="/proof" onClick={() => setMobileOpen(false)}>
            Pilot evidence
          </Link>
          <Link href="/copilot" onClick={() => setMobileOpen(false)}>
            Pilot guide
          </Link>
          <Link href="/#ledger" onClick={() => setMobileOpen(false)}>
            Pilot telemetry
          </Link>
          <Link href="/launch" className="mobile-launch-btn" onClick={() => setMobileOpen(false)}>
            Strike a Pair (Rail A)
          </Link>
        </div>
      )}
    </header>
  );
}
