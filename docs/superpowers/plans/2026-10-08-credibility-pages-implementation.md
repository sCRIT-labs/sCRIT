# Credibility Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the three Credibility Pages (`/verify`, `/pairs`, `/invariants`), embeddable SVG badge, `public/addresses.json`, and client-side verification engine based on `sCRIT-devbrief-credibility-pages.md`.

**Architecture:** Client-side truth powered by `viem` RPC reads. Zero hard-coded server fakes. Single source of truth in `public/addresses.json`. Automated banned string tests in CI/Vitest.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Viem 2.56.7, Vitest 4.1.11, Tailwind CSS.

## Global Constraints
- Theme: "Don't trust the site. Verify the chain."
- Client-side truth: Every number derived in the browser from RPC reads (viem) with block number + age.
- Banned strings: `AUDITED`, `audited`, `backed`, `verified custody`, `Assay Verified`, `guaranteed`, `peg` (except "Not pegged").
- Zero is a feature: Stockpile 0 kg, 0 custodians, 0 pools: render it, don't hide it.
- Single source of addresses: `public/addresses.json`.

---

### Task 1: Foundation — `public/addresses.json` & Banned Strings Test
**Files:**
- Create: `public/addresses.json`
- Create: `lib/addresses.ts`
- Create: `tests/banned-strings.test.ts`
- Modify: existing files if banned strings exist

- [ ] **Step 1:** Create `public/addresses.json` with canonical addresses and runtime code hashes.
- [ ] **Step 2:** Create `lib/addresses.ts` to export typed helpers and address lookups.
- [ ] **Step 3:** Create `tests/banned-strings.test.ts` verifying no forbidden marketing buzzwords exist in UI copy.
- [ ] **Step 4:** Run tests and commit.

---

### Task 2: `/verify` — The Verifier Engine & Page
**Files:**
- Create: `lib/verify/attestation.ts`
- Create: `lib/verify/transaction.ts`
- Create: `lib/verify/hook-decoder.ts`
- Create: `app/verify/page.tsx`
- Create: `tests/verify-engine.test.ts`

- [ ] **Step 1:** Write unit test in `tests/verify-engine.test.ts` for Hook bit decoder (0x2044 flags: beforeInitialize, afterSwap, afterSwapReturnDelta ON; beforeRemoveLiquidity OFF).
- [ ] **Step 2:** Implement `lib/verify/hook-decoder.ts`.
- [ ] **Step 3:** Implement `lib/verify/attestation.ts` with 9-step cryptographic EIP-712 verification and Tamper Demo (+1g).
- [ ] **Step 4:** Implement `lib/verify/transaction.ts` receipt classifier (Burn to Dead, Rail A Swap, Rail A Launch, Governance).
- [ ] **Step 5:** Build `app/verify/page.tsx` with auto-detect input box, permalink query params (`?tx=`, `?addr=`), step-by-step checklist, and tamper demo.
- [ ] **Step 6:** Run tests and commit.

---

### Task 3: `/pairs` — Stockpile-Paired Registry & Dynamic Badge
**Files:**
- Create: `lib/pairs/discovery.ts`
- Create: `app/pairs/page.tsx`
- Create: `app/badge/[token]/route.ts`
- Create: `tests/pairs-discovery.test.ts`

- [ ] **Step 1:** Implement log discovery in `lib/pairs/discovery.ts` scanning PoolManager Initialize events paired with $CRIT and TradingTaxHook.
- [ ] **Step 2:** Build reconciliation bar: Hook tax all pools (derived) vs Received by StockpileTreasury.
- [ ] **Step 3:** Build `app/pairs/page.tsx` with discovery table sorted by "Fed to stockpile".
- [ ] **Step 4:** Implement server-side SVG badge endpoint in `app/badge/[token]/route.ts`.
- [ ] **Step 5:** Run tests and commit.

---

### Task 4: `/invariants` — Invariant Board
**Files:**
- Create: `lib/invariants/checks.ts`
- Create: `app/invariants/page.tsx`
- Create: `tests/invariants.test.ts`

- [ ] **Step 1:** Implement 14 invariant checkers (I-1 to I-14) in `lib/invariants/checks.ts`.
- [ ] **Step 2:** Build `app/invariants/page.tsx` with "Recheck all in browser" button, block age badges, and FAIL sorting to top.
- [ ] **Step 3:** Write invariant unit test in `tests/invariants.test.ts`.
- [ ] **Step 4:** Run tests and commit.

---

### Task 5: Navigation, End-to-End Verification & Polish
**Files:**
- Modify: `components/HeaderNav.tsx`
- Modify: `components/InstitutionalFooter.tsx`
- Test: Full TypeScript (`npx tsc --noEmit`) & Vitest run

- [ ] **Step 1:** Add `/verify`, `/pairs`, and `/invariants` to `HeaderNav.tsx` and `InstitutionalFooter.tsx`.
- [ ] **Step 2:** Run `npx tsc --noEmit` and all vitest suites.
- [ ] **Step 3:** Final commit and verification report.
