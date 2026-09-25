# sCRIT Pilot Decisions — Open Points from the Brief

Recorded decisions with rationale. Each has an unblock criterion: what must be
true before the decision is revisited.

## 4. Rail A fee policy → no issuance fee in pilot

**Decision:** remove the separate 1% transfer from Rail A. Keep project-pool swap tax at 0%.

**Rationale:** the brief places the issuance fee on Rail B and treats the 2.5% project-pool tax and 75/25 split as future economics. The former frontend-only transfer was not enforced by the launcher and treasury logging trusted the browser. No unsupported fee is charged until a fee schedule, authorization, and on-chain collection design are approved.

**Code:** Rail A launch now approves the launcher and submits the pool transaction only. The treasury API records only a verified on-chain transfer receipt.

**Unblock:** approved written fee schedule, user disclosures, contract enforcement, accounting treatment, and independent review.

## 5. Database → Kentir PostgreSQL with isolated namespace

**Decision:** use the database connection supplied by Kentir for local sCRIT development, but place all project tables under `scrit_*` names and do not reuse Kentir's application tables.

**Rationale:** this keeps local setup aligned with the existing environment while preventing table-name collisions. The connection remains in ignored `.env.local`; it is not part of this repository.

**Code:** `lib/db.ts` uses PostgreSQL and lazily creates the sCRIT tables. There is no in-memory operational fallback. `/api/health` reports readiness without returning connection details.

**Unblock:** configure the same secret in each intended deployment environment and verify access through the health route before enabling operations.

## 6. Commodity prices → empty until sourced

**Decision:** no synthetic or startup-seeded commodity prices. An admin must supply a source label and a positive manual price; the record displays its timestamp and becomes stale after 24 hours.

**Rationale:** invented sample prices looked like live valuation inputs and could overstate NAV. A live provider must be contracted and methodology reviewed before this becomes an official index.

## 7. Reserve issuance design → do not pretend current Rail A meets brief

**Decision:** retain the existing fixed-supply sCRIT token for the limited software pilot. Do not claim attestation-gated minting, on-chain reserve accounting, or redemption.

**Rationale:** the repository has no approved price oracle, legal issuance structure, signed custodian, or audited reserve manager. Minting from manually entered prices or off-chain signatures without those controls would encode an unreviewed valuation policy.

**Unblock:** agree the issuer and NAV model; implement on-chain scoped custodian registry, replay-protected reserve manager and mint cap; test with adversarial cases; obtain independent audit; then deploy a new token/manager version. Existing token deployments cannot be retrofitted safely.

## 8. Issuer approval → service registry plus launcher allowlist

**Decision:** require admin approval in the persistent issuer registry and a separate owner approval on the launcher contract. Database approval does not silently imply on-chain permission.

**Rationale:** the old UI-only check could be bypassed by calling the launcher directly. A contract allowlist closes that bypass while keeping server-side review and auditable on-chain access separate.

## 9. Indonesia regulatory perimeter → external release gate

**Decision:** do not label sCRIT as OJK-approved, compliant, or a permitted commodity-backed instrument. Obtain qualified counsel's written classification and licensing/perimeter assessment before public distribution or trading.

**Research (25 September 2026):** OJK's official materials identify POJK 27/2024 as the framework for trading digital financial assets including crypto assets, effective 10 January 2025; OJK lists POJK 23/2025 as an amendment effective 10 November 2025. OJK also states the handover of digital-asset oversight from Bappebti was completed. These sources establish the current authority and framework, but do not classify this particular product or determine its authorization requirements.

**Sources:** [OJK POJK 27/2024](https://ojk.go.id/id/regulasi/Pages/POJK-27-2024-AKD-AK.aspx), [OJK POJK 23/2025](https://ojk.go.id/id/regulasi/Pages/POJK-23-2025-Perubahan-POJK-27-Tahun-2024-tentang-Penyelenggaraan-Perdagangan-Aset-Keuangan-Digital-Termasuk-Aset-Kripto.aspx), [OJK transition completion notice](https://ojk.go.id/id/berita-dan-kegiatan/siaran-pers/Pages/Nota-Kesepahaman-OJK-Bappebti-2026.aspx).

## 1. NAV anchor / redemption (§3.3) → Option C for pilot, roadmap to B

**Decision:** no redemption and no peg claim. The ±10% / ±25% premium bands remain a product rule, but are not displayed as live signals because this repository has no configured market-price source for sCRIT.

**Rationale:** an AP network cannot be signed in pilot timeframe, and shipping
option A (open redemption) means retail physical logistics the team cannot run.
Option C with honest copy is the only non-misleading choice.

**Code:** `premiumBand()` in `lib/nav.ts` is an unused calculation helper; `/api/ap` queues diligence applications and has no active counterparties. Do not present the bands as monitoring that is currently running.

**Unblock B:** first configure an independently sourced sCRIT market quote and disclose it alongside off-chain NAV; then obtain 2–3 signed AP counterparties, counsel-reviewed terms, `RedemptionManager` extension, and basket-limit registry. Only then revisit the no-redemption/no-peg copy.

## 2. Physical custody → 1 demo key, scope-enforced from day one (§5.2)

**Decision:** single team EOA, registered with scope `["Au","Ag","Pt"]`. The
attestation endpoint rejects unknown keys (`unknown_custodian`) and
out-of-scope commodities (`out_of_scope`) — proven by `tests/custodians.test.ts`.

**Rationale:** per-class scoping retrofitted later is painful (brief §5.2). The
enforcement shape ships now even though only one demo key exists, so adding a
contracted LBMA vault later is a row insert, not a redesign.

**Code:** `lib/custodians.ts`, `list/registerCustodian` in `lib/db.ts`,
`GET/POST /api/custodians`, `migrations/0002_custody_ap.sql`.

**Unblock:** signed custodian agreement per class (bullion vault, industrial
warehouse, diamond vault) + SLA/insurance/audit rights; flip status to
`contracted` and narrow scopes.

## 3. Lithium (§3.2) → excluded at 0% for pilot

**Decision:** `weightBps: 0`. Not capped, not warranted, not swapped — excluded.
Reasons, verbatim from the brief: ~1.7 t Li₂CO₃ per $250k reserve vs ~0.7 kg
gold; hygroscopic storage; separate humidity-controlled warehouse and second
custodian/audit trail; volatile pricing; thin on-chain feeds.

**Options kept open:** cap far below 10%, LME-style warehouse warrants, or swap
for nickel/cobalt (LME warrants + Indonesian supply-chain relevance).

**Code:** `LITHIUM_DECISION` in `lib/scrit-basket.ts`; UI card stays locked.

**Unblock:** commodities-lead call with warehouse quote + named price-feed
provider willing to sign. Until then any lithium weight in code is a bug.
