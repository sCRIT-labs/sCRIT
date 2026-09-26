# sCRIT Mainnet Readiness Closure Implementation Plan

> **For agentic workers:** Execute this plan inline in the active workspace; the user explicitly asked for end-to-end completion.

**Goal:** Close the remaining code, UI, and V4 rehearsal gaps for a mainnet deployment using this project's own ScritIndexToken, without sending mainnet transactions.

**Architecture:** Keep production deployment configuration isolated under `MAINNET_*`. Rehearse the V4 launcher against a local Cancun-capable fork of Robinhood mainnet, where official V4 dependencies exist, and record the resulting transaction/check data as simulation-only. Run the project's current automated checks and production UI route checks, then document precise remaining operational prerequisites.

**Tech Stack:** Solidity 0.8.37, Uniswap V4 Core/Periphery, viem, Next.js, Vitest, Robinhood Chain RPC, Foundry Anvil on WSL.

**Spec:** `docs/superpowers/specs/2026-09-25-scrit-v3-launch-design.md` plus current mainnet deployment and V4 contracts/scripts.

## Global Constraints

- Never send a mainnet transaction during readiness rehearsal.
- Keep simulation-only transactions and state separate from real deployment manifests.
- Use `MAINNET_DEPLOYMENT_TOKEN_MODEL=project-index`; the project's mainnet token address is generated only during actual deploy.
- Keep synthetic prices/reserve/issuer data clearly labeled and do not make real-world claims.
- Do not expose `.env.local` secrets in command output, docs, or manifests.

---

### Task 1: Confirm isolated mainnet configuration and RPC state

**Files:**
- Read: `.env.local`, `.env.example`, `scripts/deploy.mjs`
- Modify: `docs/decisions.md` only if configuration decisions have changed

- [x] Select `project-index` explicitly in `.env.local`.
- [x] Check required mainnet signer/role fields without printing their values.
- [x] Read live signer balance from chain 4663: `0.000315410748224 ETH`.
- [x] Run read-only V3/V4 dependency preflights; chain, addresses, PositionManager binding, and TLOAD passed.
- [x] Add an explicit `MAINNET_TIMELOCK_DELAY_SECONDS=0` and prevent mainnet from inheriting the testnet delay.

### Task 2: Rehearse V4 launch on a local Robinhood mainnet fork

**Files:**
- Read: `contracts/sCRITV4Launcher.sol`, `contracts/TradingTaxHook.sol`, `scripts/deploy.mjs`, `scripts/compile.mjs`
- Create: `scripts/rehearse-v4-fork.mjs`
- Create: `deployments/rehearsals/robinhood-mainnet-v4-fork-2026-09-26.json`

- [x] Install Anvil in WSL and start a local Robinhood fork using Cancun.
- [x] Deploy the project token, permission-mined tax hook, and V4 launcher on local fork state with Anvil's demo key.
- [x] Configure a demo issuer, mint test-only sCRIT, launch a token, initialize its pool, and mint the LP NFT on the fork.
- [x] Execute a hooked test swap and verify the emitted fee accounting is split 75/25.
- [x] Stop the fork and record all data as non-canonical simulation in `deployments/rehearsals/robinhood-mainnet-v4-fork-2026-09-26.json`.

### Task 3: Verify UI and app checks

**Files:**
- Read: `app/`, `components/`, `tests/`

- [x] Run `pnpm test`, `pnpm exec tsc --noEmit`, and `pnpm build`.
- [x] Start the production server and check health, events, proof, launch, and lots routes.
- [x] Record that these are route smoke checks only; no browser-based visual/responsive review was performed in this pass.

### Task 4: Close release notes and final status

**Files:**
- Modify: `README.md`, `docs/decisions.md`

- [x] Document the fork rehearsal manifest and simulation-only status.
- [x] Document the remaining RPC, signer balance, and deployment prerequisites.
- [ ] Run `git diff --check` and review repository status; do not commit or push unless the user requests it.
