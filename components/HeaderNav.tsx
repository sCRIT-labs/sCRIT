"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { NavigationDialog } from "./NavigationDialog";

export function HeaderNav() {
  const [scrolled, setScrolled] = useState(false);
  const [navTheme, setNavTheme] = useState<"dark" | "light">("light");
  const [dialogOpen, setDialogOpen] = useState(false);
  const pathname = usePathname();

  const updateNavState = useCallback(() => {
    const scrollY = window.scrollY;
    setScrolled(scrollY > 20);

    if (pathname !== "/") {
      // Subpages: check for dark subpage override
      const isDarkSubpage = document.querySelector(".scrit-subpage-dark");
      setNavTheme(isDarkSubpage ? "dark" : "light");
      return;
    }

    // Home Landing Page: dynamically probe the section directly behind the floating navbar
    const navY = 65; // Approx center Y coordinate of navbar pill
    // Probe 12px from viewport left margin to avoid hitting the pill container itself
    const el = document.elementFromPoint(12, navY);
    const themeEl = el ? el.closest<HTMLElement>("[data-nav-theme]") : null;

    if (themeEl) {
      const themeAttr = themeEl.getAttribute("data-nav-theme");
      if (themeAttr === "light" || themeAttr === "dark") {
        setNavTheme(themeAttr);
        return;
      }
    }

    // Fallback based on scroll position: hero is dark at top
    if (scrollY < 600) {
      setNavTheme("dark");
    } else {
      setNavTheme("light");
    }
  }, [pathname]);

  useEffect(() => {
    updateNavState();
    window.addEventListener("scroll", updateNavState, { passive: true });
    window.addEventListener("resize", updateNavState, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateNavState);
      window.removeEventListener("resize", updateNavState);
    };
  }, [updateNavState]);

  return (
    <>
      <header
        className={`main-nav-wrapper ${scrolled ? "is-docked" : "is-top"} nav-theme-${navTheme}`}
      >
        <nav className="main-nav-pill">
          {/* Brand Group */}
          <Link href="/" className="nav-brand-group" aria-label="sCRIT Protocol Home">
            <div className="nav-brand-icon-wrap">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none" className="nav-brand-icon">
                <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.3" />
                <path d="M16 6C10.477 6 6 10.477 6 16C6 21.523 10.477 26 16 26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M16 11C13.2386 11 11 13.2386 11 16C11 18.7614 13.2386 21 16 21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="16" cy="16" r="2.5" fill="currentColor" />
              </svg>
            </div>

            <div className="nav-brand-text-block">
              <span className="nav-brand-text">sCRIT</span>
              <span className="nav-brand-sub">INDEX</span>
            </div>
          </Link>

          {/* Desktop Center Links */}
          <div className="nav-center-menu">
            <Link href="/#products" className="nav-menu-link">
              <span>Index</span>
            </Link>

            <Link
              href="/proof"
              className={`nav-menu-link ${pathname === "/proof" ? "is-active-link" : ""}`}
            >
              <span>Evidence</span>
            </Link>

            <Link
              href="/tokens"
              className={`nav-menu-link ${pathname === "/tokens" ? "is-active-link" : ""}`}
            >
              <span>Tokens</span>
            </Link>

            <Link
              href="/issuer"
              className={`nav-menu-link ${pathname === "/issuer" ? "is-active-link" : ""}`}
            >
              <span>Issuer Desk</span>
            </Link>

            <Link
              href="/copilot"
              className={`nav-menu-link ${pathname === "/copilot" ? "is-active-link" : ""}`}
            >
              <span>Copilot AI</span>
            </Link>
          </div>

          {/* Right Action Deck */}
          <div className="nav-right-actions">
            {/* Launch Pair CTA */}
            <Link
              href="/launch"
              className={`nav-btn-launch ${pathname === "/launch" ? "is-active-btn" : ""}`}
            >
              <span>Launch Pair</span>
              <ArrowUpRight size={13} strokeWidth={2.5} />
            </Link>

            {/* Explore / Hamburger Button */}
            <button
              type="button"
              className="nav-explore-btn"
              onClick={() => setDialogOpen(true)}
              aria-label="Open exploration directory"
              aria-expanded={dialogOpen}
            >
              <span className="nav-explore-label">EXPLORE</span>
              <span className="nav-hamburger-bars" aria-hidden="true">
                <i />
                <i />
              </span>
            </button>
          </div>
        </nav>
      </header>

      {/* Full-screen Luxury Navigation Dialog */}
      <NavigationDialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
}
