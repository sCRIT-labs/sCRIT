# sCRIT Ondo-Inspired Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the sCRIT frontend into a responsive editorial experience with reversible scroll-driven chapters, accurate pilot disclosures, and a consistent design across every route, while leaving the current hero intact.

**Architecture:** Establish a global sCRIT design system and shared app chrome, then rebuild the home narrative as focused sections that consume the existing pilot-data and basket helpers. Apply the same tokens and layout to launch, proof, admin, and legal pages without changing APIs, contracts, or existing business flows.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Framer Motion 12, existing CSS and viem/data hooks, native scroll timelines with CSS/IntersectionObserver fallbacks.

**Spec:** `docs/superpowers/specs/2026-09-25-scrit-ondo-inspired-redesign.md`

## Global Constraints

- Keep `components/HeroScroll.tsx` unchanged.
- Reuse existing `public/images/*` assets; do not add image dependencies.
- Use Framer Motion 12 for the horizontal pinned rail and scroll-linked section components.
- Respect reduced-motion preferences and preserve readable static fallbacks.
- Do not change API, wallet, or contract behavior.
- Follow `devbriefsCRIT.md` and `docs/decisions.md`; clearly label simulations and demo data.
- Do not add or execute automated tests in this task; report this constraint accurately.

---

### Task 1: Shared Visual System and Navigation

**Files:**
- Create: `app/redesign.css`
- Modify: `app/layout.tsx`
- Modify: `components/AnnouncementBar.tsx`
- Modify: `components/HeaderNav.tsx`
- Modify: `components/PageShell.tsx`
- Modify: `components/InstitutionalFooter.tsx`

- [ ] Define responsive tokens, typography, surfaces, buttons, focus states, and reduced-motion rules in `app/redesign.css`.
- [ ] Import the new stylesheet after the existing base stylesheet in the root layout, following the installed Next.js stylesheet guidance.
- [ ] Update shared navigation and page shell so all routes have consistent wayfinding and usable mobile navigation.
- [ ] Replace the fake subscription success flow with a useful pilot/contact action and accurate disclosure copy.

### Task 2: Landing Page Story and Scroll Motion

**Files:**
- Create: `components/LandingExperience.tsx`
- Modify: `app/page.tsx`
- Modify: `hooks/useReveal.ts`

- [ ] Keep `HeroScroll` mounted in its current position and do not alter its source.
- [ ] Replace the post-hero click-heavy/stale content with an editorial sequence driven by scroll position and existing pilot data.
- [ ] Add pinned sticky chapters whose stages scrub forward and reverse with scroll; use browser-native CSS timelines where supported and readable static/reveal fallbacks elsewhere.
- [ ] Add subtle looping ledger/ticker details without continuous unnecessary work when reduced motion is enabled.
- [ ] Remove fabricated testimonials, fake holder/TVL numbers, and unsupported partner/custody claims; distinguish actual pilot state from simulations and future targets.
- [ ] Retain meaningful functions such as reserve data, links, disclosures, wallet launch, and basket display.

### Task 3: Launch, Proof, Admin, and Legal Screens

**Files:**
- Modify: `app/launch/page.tsx`
- Modify: `app/proof/page.tsx`
- Modify: `app/admin/page.tsx`
- Modify: `app/legal/[doc]/page.tsx`

- [ ] Restyle every route with the new shared shell, responsive layout, forms, tables, statuses, and action hierarchy.
- [ ] Keep current launch validation, wallet transaction steps, proof data fetching, admin key headers, and legal document selection intact.
- [ ] Correct overstated proof/launch copy and add clear pilot/demo/empty states without inventing operational data.
- [ ] Ensure focus visibility, labels, keyboard use, and mobile stacking work throughout.

### Task 4: Responsive and Motion Consistency Pass

**Files:**
- Modify: `app/redesign.css`
- Modify: affected home and route components from Tasks 1–3

- [ ] Review all breakpoints and reduce pinned scene complexity on small screens without removing the narrative.
- [ ] Verify reduced-motion mode disables scrub/loop effects while exposing every piece of content.
- [ ] Check route links, active navigation, and jump links after the page composition changes.
- [ ] Inspect the final diff and report that automated tests/build were not run under the task constraint.

### Follow-up Task 5: Deepen Scroll-Driven Landing Narrative

**Files:**
- Modify: `components/LandingExperience.tsx`
- Modify: `app/redesign.css`

- [x] Add a second pinned, reversible horizontal rail after the reserve chapter to explain NAV inputs, data freshness, issuance fee, and market limits.
- [x] Make all post-hero content chapters pinned and scrub-driven, with distinct compositions for overview, estimate, reserve, input rail, telemetry, assurances, launch, basket allocation, and editorial notes.
- [x] Keep content in document order on mobile, reduced motion, and static fallbacks; make the overview image crops consistent and preserve the ticker/terminal status loops.

### Follow-up Task 6: Normalize Route Content Width

**Files:**
- Modify: `components/PageShell.tsx`
- Modify: `components/AnnouncementBar.tsx`
- Modify: `app/redesign.css`
- Modify: `app/launch/page.tsx`
- Modify: `app/proof/page.tsx`
- Modify: `app/admin/page.tsx`
- Modify: `app/legal/[doc]/page.tsx`

- [x] Remove per-route `wide` max-width differences and inline width overrides from the shared shell.
- [x] Use one route content measure aligned with the landing grid; preserve local max-widths for headings and paragraphs.
- [x] Keep table overflow local to table wrappers and ensure mobile layouts still stack cleanly.
