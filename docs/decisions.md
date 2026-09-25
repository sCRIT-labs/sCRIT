# sCRIT Pilot Decisions — Open Points from the Brief

Recorded decisions with rationale. Each has an unblock criterion: what must be
true before the decision is revisited.

## 1. NAV anchor / redemption (§3.3) → Option C for pilot, roadmap to B

**Decision:** no redemption, no peg claim. Premium/discount bands enforced in UI:
±10% watch (amber), ±25% alert (red banner: significant deviation with no
arbitrageur of record).

**Rationale:** an AP network cannot be signed in pilot timeframe, and shipping
option A (open redemption) means retail physical logistics the team cannot run.
Option C with honest copy is the only non-misleading choice.

**Code:** `premiumBand()` in `lib/nav.ts`, banner in `Hero`, AP queue at
`POST /api/ap` (diligence only, zero active).

**Unblock B:** 2–3 signed AP counterparties + `RedemptionManager` extension to
sCRIT baskets + basket-limit registry. Then copy may change from "not pegged"
to the AP arbitrage description.

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
