"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { NavigationDialog } from "./NavigationDialog";
import { ScritLogo } from "./ScritLogo";

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
          {/* Brand Group: Unified Logo + Typography Lockup (Only sCRIT) */}
          <Link href="/" className="nav-brand-group" aria-label="sCRIT Protocol Home">
            <ScritLogo size={28} />
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
            {/* Official X / Twitter Link (@getsCRIT) */}
            <a
              href="https://x.com/getsCRIT"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-btn-x"
              aria-label="Follow sCRIT on X (@getsCRIT)"
              title="sCRIT on X (@getsCRIT)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>

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
