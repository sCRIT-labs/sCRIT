# sCRIT V3 Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable Rail A launches on Robinhood Testnet by creating TOKEN/sCRIT V3 pools and minting a full-range position NFT to the creator.

**Architecture:** Replace the legacy V2 router call in `sCRITLauncher` with Uniswap V3's deployed Nonfungible Position Manager. The contract initializes the price from the two desired amounts, mints using the factory's 3000 fee tier and valid full-range ticks, and sends the position NFT to the creator. The web launch flow decodes and displays the position ID; deploy configuration verifies the manager/factory pairing before deployment.

**Tech Stack:** Solidity 0.8.37, Uniswap V3 periphery interface, Viem, Next.js App Router client page, generated Solidity artifacts.

**Spec:** `docs/superpowers/specs/2026-09-25-scrit-v3-launch-design.md`

## Global Constraints

- Target testnet is Robinhood Chain chain ID `46630`.
- Use factory `0x09b6d850382787115969a2699f107f5a974c781b` and position manager `0x15e98cf94a32c7fd23a36fabb4fee612277da47b` only after live code and immutable checks pass.
- Use V3 fee tier `3000` and read tick spacing from the configured factory.
- Mint the position NFT to the launch creator; do not custody the NFT in the launcher.
- Preserve the user's selected token supply, token pool amount, and sCRIT amount; apply the selected slippage to both desired assets.
- Mainnet deployment stays blocked by the existing release gates.

---

### Task 1: Replace V2 launcher with V3 position mint

**Files:**
- Modify: `contracts/sCRITLauncher.sol`
- Modify: `scripts/compile.mjs`
- Modify: `.env.example`
- Modify: `.env.local` (local-only V3 addresses)

**Interfaces:**
- Constructor: `sCRITLauncher(address scrit, address positionManager, uint24 fee)`.
- Launch remains a single wallet call and returns the token address plus V3 position ID.
- `Launched` indexes token, creator, and pool, and includes position ID, liquidity, and actual amounts in event data.

- [ ] Replace V2 router interface with the minimal V3 factory, pool, and position-manager interfaces used by `createAndInitializePoolIfNecessary` and `mint`.
- [ ] Calculate `sqrtPriceX96` from sorted desired amounts with integer math and validate Uniswap's accepted square-root-price bounds.
- [ ] Derive nearest full-range tick bounds from the configured factory's fee spacing.
- [ ] Pull sCRIT, deploy the token, approve the manager, mint the position NFT to `msg.sender`, refund unused balances, and emit complete launch details.
- [ ] Set `V3_FACTORY_ADDRESS` and `V3_POSITION_MANAGER_ADDRESS` in `.env.local`; add the public defaults to `.env.example` and keep router optional/unused.
- [ ] Run `pnpm compile` and inspect the generated launcher ABI.

### Task 2: Update deployer preflight and launch deployment

**Files:**
- Modify: `scripts/deploy.mjs`
- Modify: `docs/decisions.md`
- Modify: `README.md`

**Interfaces:**
- The deployment script reads `V3_FACTORY_ADDRESS` and `V3_POSITION_MANAGER_ADDRESS`.
- The V3 launcher receives sCRIT, position manager, and fee tier `3000`.

- [ ] Verify both addresses have code, verify manager `factory()` matches the configured factory, verify `WETH9()` has code, and verify fee spacing is positive.
- [ ] Deploy the launcher unconditionally on testnet after those checks, then transfer launcher ownership to the deployed timelock.
- [ ] Print launcher and V3 dependency addresses for app configuration.
- [ ] Replace V2-only documentation and preserve mainnet release gates.

### Task 3: Update launch transaction flow and receipt UI

**Files:**
- Modify: `lib/scrit-evm.ts`
- Modify: `app/launch/page.tsx`
- Modify: `app/api/attestations/route.ts` only if it depends on the old launch event signature.

**Interfaces:**
- `decodeLaunchedToken` continues returning the launched token for existing callers.
- Add a decoder returning `{ token, creator, pool, positionId, liquidity, tokenAdded, scritAdded }` from the launcher receipt.
- `launchTokenScrit` returns the token, pool, position ID, and launch hash.

- [ ] Update the event ABI and receipt decoder while preserving launcher-address filtering.
- [ ] Pass slippage basis points so both token and sCRIT minimums use the same setting.
- [ ] Show the creator a token explorer link, pool link, and position NFT ID after a successful launch.
- [ ] Run `pnpm exec tsc --noEmit` and `pnpm build`.

## Verification Notes

This execution uses Solidity compilation and the application TypeScript/build checks. No automated test suite is added or run in this plan.
