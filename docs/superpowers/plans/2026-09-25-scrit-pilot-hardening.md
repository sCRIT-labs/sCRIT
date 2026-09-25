# sCRIT Pilot Hardening Plan

## Objective

Bring the repository to a defensible, persistent, pilot-ready software baseline against `devbriefsCRIT.md`, while clearly separating work that needs signed counterparties, independent assurance, counsel, or live market infrastructure. Preserve the selected Option C pilot: no peg and no redemption. Use Kentir's PostgreSQL connection locally, and namespace every sCRIT table to avoid collisions in a shared database.

## Decisions

1. Keep the current pilot basket at Au 60%, Ag 25%, Pt 15%; lithium and all other commodities remain excluded.
2. Keep no redemption and no peg claim. Do not introduce redemption promises or a price floor.
3. Keep project-pool swap tax at 0% for this pilot. Future 2.5% and 75/25 routing stay inactive until governance, legal, and audited pool-hook work exists.
4. Remove unsupported fictional/mutable reserve prices from the persistent baseline. Price records are operator-entered, source-labeled, timestamped, and stale-aware; an absent price remains absent.
5. Database state is PostgreSQL-backed when `DATABASE_URL` is set. Production mutations fail closed if persistence is unavailable; no memory fallback may silently accept operational records.
6. Issuer approvals and custodian scopes are persistent, admin-only mutations. A demo custodian cannot be represented as contracted.
7. Treasury entries must be admin-authorized and verified from a chain receipt against configured chain/token/treasury addresses. Client-provided claims alone never create an entry. If receipt verification cannot be completed, no row is recorded.
8. Public launch remains blocked until external legal/regulatory review, contracted custody and insurance, independent physical audit, independent contract audit, and a signed price-source process are evidenced. Software must report these as release gates, not imply they are done.
9. Do not change visual design in this hardening pass; preserve current pages and make their underlying data truthful.

## Workstreams

### A. Persistent data foundation

- Add the `postgres` driver and a lazy, pooled PostgreSQL client.
- Add a namespaced, repeatable schema migration for issuer registry, operator prices, attestations, treasury records, custodians, and AP diligence records.
- Replace in-memory-only persistence with PostgreSQL operations and explicit startup/schema readiness. Do not seed fabricated price rows or a custodian as contracted.
- Provide deterministic local behavior for unit tests without requiring the external database.
- Add `/api/health` readiness that reports database state without exposing credentials.

### B. API integrity and admin operations

- Add authenticated issuer create/approve/revoke operations with strict address and payload validation.
- Enforce admin auth on price, custodian, attestation, issuer, and treasury mutations.
- Validate EIP-712 attestation message size, timestamp freshness, digest fields, duplicate batch IDs, custodian active status, and per-commodity scope before persistence.
- Make treasury rows immutable/idempotent and verify configured ERC-20 Transfer receipt details using a server-side RPC and chain configuration.
- Rate-limit public AP diligence submissions and validate fields; never expose private contact fields in the public GET response.
- Return explicit service-unavailable errors when required persistence or verification infrastructure is missing.

### C. Contract and release alignment

- Review current launcher/token against the pilot requirements and ensure the project documentation and deployment script cannot describe unimplemented controls as present.
- Keep risky supply, fee, and reserve claims out of deployed artifacts unless enforced on-chain.
- Add a deployment preflight that refuses production deployment without required chain, router, token, admin, and custody configuration and labels unsupported pilot architecture as blocked.
- Record the concrete gap between current token-only Rail A and the complete brief (Rail B, issuance gating, reserve manager, pool fee hook/indexer) as implementation/release work, without faking third-party audit or physical evidence.

### D. Documentation and verification

- Update `docs/decisions.md`, `.env.example`, and README with the chosen pilot rules, local DB configuration requirements, migration process, admin controls, and remaining external gates.
- Add focused tests for validation, API authorization/duplicate rejection, and database adapter behavior with a test seam.
- Run tests, lint/type checks available in the repo, Solidity compilation, and Next production build. Inspect the diff and confirm secret files remain ignored.

## Acceptance criteria

- No production route silently writes in-memory operational state.
- No API endpoint accepts unauthenticated treasury mutations or returns AP applicant contact data publicly.
- No seed values can be presented as live commodity prices.
- Persisted records use sCRIT-prefixed tables and cannot collide with Kentir tables.
- Admin-only issuer approvals can be created, listed, and revoked, with malformed data rejected.
- Attestations reject invalid, stale/future, duplicate, unknown, inactive, and out-of-scope submissions.
- Treasury receipt submissions are verified against an RPC receipt and configured token/treasury before idempotent persistence.
- Docs state no peg, no redemption, zero pilot swap tax, and external launch gates without implying completion.
- Automated verification passes; any remaining blocker is stated with evidence.

## Known external dependencies

This repository cannot independently produce a signed custodian agreement, insurance certificate, physical audit, legal opinion, OJK determination, exchange listing, or independent smart-contract audit. These stay as explicit public-launch blockers.
