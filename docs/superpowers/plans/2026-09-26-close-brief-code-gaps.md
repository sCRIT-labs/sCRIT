# Close sCRIT Brief Code Gaps Implementation Plan

> **For agentic workers:** This plan is executed inline in the current session.

**Goal:** Close the remaining software gaps for the official sCRIT/ETH base market, live market-vs-NAV display, and issuer-facing workflow without inventing reserve or market data.

**Architecture:** Use the canonical Uniswap V4 native-ETH/sCRIT pool key at the official fee tier, seed it only through an explicit CLI command, read its price through Robinhood's V4 StateView, and convert to USD through a timestamped ETH/USD source. Prefer on-chain reserve value and supply whenever configured; keep unavailable states explicit. Add a wallet-aware issuer page backed by existing issuer service checks and launch flow.

**Tech Stack:** Solidity 0.8.37, Uniswap V4 periphery, viem, Next.js App Router, React 19, TypeScript.

**Spec:** `devbriefsCRIT.md` §§2.1–2.2, 5–8, 13, 15.

## Global Constraints

- The base `sCRIT/ETH` pool is hookless; issuer-launched `TOKEN/sCRIT` pools use the 2.5% V4 hook.
- Fee proceeds are unspent treasury until separately deployed and attested.
- Never infer market price, reserve holdings, or a successful pool from missing configuration.
- Base-market seeding requires existing sCRIT inventory and explicit ETH/sCRIT amounts; do not auto-seed or send transactions during implementation.
- Keep the no-sCRIT-redemption pilot decision and its copy explicit; Rail B physical-lot flow remains separate.

---

### Task 1: Canonical V4 market configuration and bootstrap command

**Files:**
- Create: `scripts/seed-v4-base-market.mjs`
- Modify: `scripts/deploy.mjs`, `.env.example`, `package.json`, `README.md`

- [x] Derive and record the canonical PoolKey and PoolId (native ETH, sCRIT, 0.30% LP fee, tick spacing 60, no hook).
- [x] Add a guarded explicit mainnet-only CLI to initialize the canonical pool and mint the initial V4 position to the timelock, returning unused seed amounts.
- [x] Record base-market PoolKey, PoolId, and seed transaction in the deployment manifest; print app configuration values.
- [x] Keep the command separate from contract deployment and require explicit token/ETH inputs.

### Task 2: Market price API and honest quote math

**Files:**
- Create: `app/api/market/route.ts`
- Create: `lib/scrit-market.ts`
- Modify: `.env.example`, `lib/scrit.ts`

- [x] Read the canonical V4 pool's current `sqrtPriceX96` through the official Robinhood StateView address.
- [x] Convert sCRIT/ETH spot to USD using a public ETH/USD endpoint with timeout, freshness checks, source label, and timestamp.
- [x] Return unavailable on absent pool, absent ETH/USD quote, stale response, zero liquidity, or RPC failure.

### Task 3: Live index/proof presentation

**Files:**
- Modify: `app/proof/page.tsx`, `hooks/useReserveChainData.ts`, `hooks/usePilotData.ts`, `lib/nav.ts`

- [x] Add polling for the market quote and show NAV primary, ETH-quoted market price secondary, and live premium/discount only when both inputs are current.
- [x] Prefer on-chain reserve value and total supply when the selected deployment is configured; label any service estimate as off-chain pilot data.
- [x] Show asset-class composition, unspent treasury records, and clearly sourced attestation/event history without implying a purchase occurred.

### Task 4: Issuer dashboard route

**Files:**
- Create: `app/issuer/page.tsx`
- Modify: navigation links and `README.md`

- [x] Show connected wallet, service approval state, launcher state, launch form link, and redemption/attestation statuses available to that issuer.
- [x] Explain when service approval and on-chain launcher approval differ.

### Task 5: Final source/build verification

**Files:** all above

- [x] Run Solidity compile, TypeScript check, production build, JavaScript syntax checks, and `git diff --check`.
- [x] Do not run deployments or test suites in this completion pass.
- [ ] Record remaining runtime prerequisites: seeded pool, deployment addresses, current ETH/USD provider availability, and funding.
