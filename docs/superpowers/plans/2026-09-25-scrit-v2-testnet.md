# sCRIT v2 Testnet Pilot Implementation Plan

> **Status:** Testnet implementation plan completed. Its original mainnet hard stop was superseded by the owner's later request to prepare mainnet deployment tooling; see Decision 13 in `docs/decisions.md`.

**Goal:** Replace the fixed-supply reserve gap with a testnet-only, scoped-attestation mint flow and complete the software paths that can be implemented without inventing real-world evidence.

**Architecture:** Deploy a new ERC-20 with mint authority limited to a ReserveManager; the manager accepts a scoped custodian EIP-712 attestation plus a separately signed, fresh commodity price, records the reserve batch once, calculates NAV mint-at-NAV, and emits indexable events. Keep PostgreSQL as the operational record, add a deterministic event sync interface, and make dashboards distinguish chain facts, off-chain estimates, and missing external evidence. Rail B and fee mechanics remain unavailable until their external custody, KYC, legal, and router requirements are satisfied.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, PostgreSQL, Solidity 0.8.37, OpenZeppelin Contracts 5.x, viem, Vitest, solc.

**Spec:** `devbriefsCRIT.md` §5–§15, constrained by current pilot decisions in `docs/decisions.md`.

## Global Constraints

- Testnet remains the current app/deployment environment; mainnet requires an explicit `--mainnet` command and network-specific addresses/configuration.
- Keep sCRIT unpegged with no sCRIT redemption; do not market it as “backed” while redemption is absent.
- Keep pilot basket Au 60%, Ag 25%, Pt 15%; lithium and other commodities remain excluded.
- Keep pilot project-pool tax at 0%; proposed 2.5%/75:25 economics stay inactive.
- Custodian signatures establish signed records, not independent proof of physical delivery.
- Never invent prices, reserve evidence, KYC/KYB approvals, contracted custodians, or audit status.
- Preserve pre-existing user changes in `components/InstitutionalFooter.tsx` and their untracked local images.

## Files and Responsibilities

- `contracts/`: v2 token, custodian registry, signed-price verifier, reserve manager, Rail B lot marketplace boundary.
- `scripts/compile.mjs`, `scripts/deploy.mjs`, `lib/scrit-artifact.ts`: compile artifacts and safe testnet deployment sequence.
- `lib/db.ts`, `migrations/`: namespaced persistent reserve, price provenance, lot, order, event cursor, and audit records.
- `app/api/`: admin-gated operation endpoints and public read models that never expose applicant contact details.
- `app/proof`, `app/admin`, `app/launch`, new Rail B page: status-aware views driven by persisted/on-chain data.
- `docs/decisions.md`, `README.md`, `.env.example`: accurate setup, testnet steps, decision rationale, and external release gates.
- `tests/`: calculations, input validation, state transitions, API gates, and event processing.

## Tasks

1. [x] Add test-first NAV-at-mint and freshness/rounding helpers; define the $1 initial NAV bootstrap and thereafter mint new reserve value at the then-current on-chain reserve NAV.
2. [x] Add OpenZeppelin and implement pausable role-controlled token, scoped custodian registry with rotation/revocation, EIP-712 reserve manager, replay protection, stale price rejection, per-batch reserve records, mint cap, and event schema. Keep rate/tax hooks inactive in pilot.
3. [x] Add test-first Rail B lot/order model: signed lot minting, ERC-1155 and sCRIT escrow, partial settlement, maker refunds, KYC-gated full-lot redemption lock, and status transitions. Production custody/KYC/shipping remain external gates.
4. [x] Extend PostgreSQL schema and APIs for on-chain batch references, oracle provenance, lot/order state, event cursor, issuer/custodian audit log; reject unsafe writes and keep secrets/PII private.
5. [x] Add a restartable event-indexing command/API for the supported contracts, with chain/address validation, confirmations, idempotent upserts, and explicit lag/error health.
6. [x] Update admin/proof/index/launch pages for v2 chain facts, reserve vs unspent treasury, NAV and price freshness, premium/discount only when a real market quote exists, issuer/network status, and Rail B readiness.
7. [x] Update deployment preflight to deploy testnet contracts in dependency order with role handoff checks; mainnet remains an unconditional hard stop.
8. [x] Update docs and environment template; mark every external gate with evidence needed.
9. [x] Final verification and diff review; do not claim production readiness or external release gates as complete.

## Acceptance

- No sCRIT mint is possible except through a valid, unexpired, replay-protected attestation signed by a non-revoked custodian scoped to the commodity, with a fresh signed price and recorded certificate reference.
- Reserve accounting changes only when the accepted batch transaction succeeds; duplicate batch IDs, wrong scope, bad signature, stale price, paused contract, and over-cap issuance revert.
- NAV bootstrap and subsequent mint-at-NAV math are deterministic, overflow-safe, and tested.
- Orders and lots are disabled unless a real deployment is configured; demo fixtures are explicitly testnet-only and cannot appear as real inventory.
- Public proof pages distinguish chain records, manual/service records, market quotes, and absent evidence; no unsupported premium indicator is shown.
- Mainnet is blocked pending external legal opinion, signed custody and supplier agreements, physical audit, oracle methodology, KYC/KYB provider, independent contract audit, multisig/timelock operations, incident response, and business approval of economics.
- Local unrelated user changes remain untouched.
