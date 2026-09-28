# sCRIT Pilot Decisions — Open Points from the Brief

## Current brief alignment (supersedes earlier narrow-pilot decisions below)

The owner directed engineering to follow Dev Brief v3, with legal opinions and evidence of real-world assets treated as external work rather than implementation blockers. This section supersedes prior decisions in this file that deliberately narrowed the basket or kept the project-pool fee at zero.

- **Index targets:** Au 30%, Ag 5%, Pt 12%, Pd 8%, Nd 8%, Dy 12%, Tb 8%, Sc 7%, Li 10%. These are starter design weights, not current custody.
- **Rail B scope:** diamonds only as individually certified lots; uranium is unavailable and outside MVP.
- **Rail A fees:** zero issuance fee; 2.5% project-pool swap fee with a fixed 75% reserve treasury / 25% operations split. The sCRIT/ETH base market remains untaxed.
- **AMM choice:** keep the deployed V3 testnet rehearsal for testnet only. Use Uniswap V4 with a permission-encoded `TradingTaxHook` and V4 launcher on Robinhood mainnet because V3 cannot safely skim the requested swap fee.
- **NAV/redemption:** retain floating market price and no sCRIT redemption for this build. Show market price and reserve NAV as distinct values; do not call project tokens claims on physical commodities.
- **Accrual:** retain the existing attestation-gated mint-at-NAV reserve issuance logic. Attestations and signed manual prices remain operator trust inputs, not independently verified physical holdings or market oracles.
- **Testnet rehearsal:** manifest `deployments/robinhood-testnet-2026-09-26T03-54-03.849Z.json` records a complete testnet flow: signed synthetic quote, demo-only reserve attestation, sCRIT mint, project-token launch, V3 pool initialization/liquidity, position NFT ownership, and event indexing. All synthetic records are labelled testnet-only and explicitly disclaim real prices, custody, identity, or market claims. Older manifests remain historical deployment records.
- **Admin delay:** new deployments default to a zero-second timelock delay (`SCRIT_TIMELOCK_DELAY_SECONDS=0`) so pilot setup can proceed immediately. The older `03-17` deployment's 48-hour delay remains immutable but its addresses are no longer active in local config.
- **Mainnet transaction state:** no mainnet transaction has been sent. Mainnet V3 and V4 dependency checks pass, including a live `TLOAD` call through the official V4 PoolManager. Mainnet environment variables now use a separate namespace and mainnet scripts reject testnet fallbacks. Deployment stays blocked until the base-token model is explicit: current code deploys a new mintable `ScritIndexToken` and cannot yet attach an existing PONS-launched sCRIT token.

Earlier entries below document historical implementation choices and are superseded wherever they conflict with this current alignment.

Recorded decisions with rationale. Each has an unblock criterion: what must be
true before the decision is revisited.

## 10. V2 reserve issuance and Rail B contracts → testnet only

**Decision:** add new, non-upgradeable v2 contracts using attestation-gated reserve issuance, mint-at-NAV, 100 ERC-1155 fractions per certified lot, a sCRIT-denominated limit book, and a KYC-gated lot redemption state machine. Existing token deployments remain unchanged. Deploy and rehearse on testnet first; the same stack now has a separate Robinhood Chain mainnet deployment path and network-specific app configuration.

**Rationale:** this closes the core software architecture gap without claiming physical reserve, peg, audit, or legal approval. The first accepted batch uses a $1/token NAV convention; subsequent batches mint against the current on-chain reserve-value estimate. This value is computed from signed commodity mass and signed operator price records, so it is a documented trust model, not an independent oracle or price guarantee.

**Code:** `ScritIndexToken`, `CustodianRegistry`, `PriceOracleAdapter`, and `ReserveManager` implement issuance. `PhysicalLotManager`, `PhysicalLotToken`, `LotMarketplace`, `KycRegistry`, and `LotRedemptionManager` implement the Rail B testnet workflow. Marketplace settlement escrows both assets, and pending physical redemptions lock all lot units until rejection unlocks them or approval burns them. `ScritTimelockController` supplies delayed admin execution. Events are stored by the restartable testnet indexer.

**Next engineering step:** run the complete testnet role setup and launch rehearsal, then set mainnet-specific addresses and operations configuration from the generated deployment manifest. External custody, pricing, legal, and audit evidence remain separate product/business work; demo values must stay labelled as demos.

## 11. Pilot business scope → preserve current explicit decisions

**Decision:** keep the currently approved software pilot at Au/Ag/Pt 60/25/15, zero swap tax, no peg, and no sCRIT redemption. The broader basket, project-pool tax, and redemption recommendations in the dev brief are not silently activated by this engineering implementation.

**Rationale:** these choices were explicitly recorded in this file before v2 implementation and depend on business, legal, custody, and supplier decisions. The contracts must not imply an operating business model that is not approved.

**Code:** Rail A fee remains 0%; no sCRIT AP/redeemer is introduced. Rail B lot redemption is a separate physical-lot state machine and needs actual KYC and shipping operations.

**Unblock:** written business approval and counsel-reviewed documentation, contracted counterparties, and audited implementation.

## 12. Token and DEX implementation → standard ERC-20 and V3 position NFT on testnet

**Decision:** replace the legacy hand-written ERC-20 methods with OpenZeppelin's ERC-20 implementation. Rail A uses a Uniswap V3 TOKEN/sCRIT pool with a full-range position NFT sent to the creator. Robinhood Testnet and mainnet use separate factory, position-manager, token, launcher, and reserve addresses; the CLI checks live bytecode and immutable dependencies on the selected chain before deploying.

**Rationale:** sCRIT is fungible, so ERC-20 remains the correct token interface. V3 positions are NFTs, which gives launch creators a standard ownership and management path. Robinhood Testnet's deployed position manager reports factory `0x09b6d850382787115969a2699f107f5a974c781b` and WETH9 `0x0Dd1Df4fdd55808c9D530C9599BEA5107F6b9b4e`; mainnet's reports factory `0x1f7d7550B1b028f7571E69A784071F0205FD2EfA` and WETH9 `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73`. Both managers and factories have live bytecode and fee-3000 tick spacing 60. The mainnet addresses match Uniswap's deployment list and their on-chain immutables were checked by `scripts/check-v3-network.mjs`. OpenZeppelin 5.5+ sources use `MCOPY` and require a Cancun EVM target; the compiler target remains Shanghai and the dependency stays at 5.4.0.

**Unblock:** verify a deployed launch, position NFT ownership, and liquidity removal rehearsal; run an independent contract audit and verify the network's EVM hardfork before selecting newer OpenZeppelin releases.

**Sources:** [Robinhood Chain networks](https://docs.robinhood.com/chain/connecting/), [Uniswap deployments](https://developers.uniswap.org/deployments), [testnet deployment list](https://docs.hood.mainnet.games/contracts.html), [Uniswap V3 position manager source](https://github.com/Uniswap/v3-periphery/blob/main/contracts/NonfungiblePositionManager.sol), [OpenZeppelin audited release tags](https://github.com/OpenZeppelin/openzeppelin-contracts/releases).

## 13. Mainnet deployment and application routing

**Decision:** allow an explicit `--mainnet` deployment after the same chain ID, bytecode, factory, WETH9, and fee-tier checks used on testnet. Mainnet actions use network-specific keys where supplied, write a deployment manifest incrementally, and emit network-specific public environment names. The app selects one complete address set using `NEXT_PUBLIC_SCRIT_CHAIN_ID`; testnet values are never a fallback for mainnet.

**Rationale:** the owner asked to complete technical launch readiness without treating real-world legal or physical evidence as a code gate. Keeping testnet rehearsal and mainnet configuration isolated prevents a mainnet UI build from accidentally reading testnet addresses.

**Status:** mainnet V3 dependencies verified live; mainnet contracts have not been deployed from this workspace. The current app remains configured for testnet.

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

## 4. Mainnet token model

**Decision:** use this project's `ScritIndexToken` as the sCRIT token. The
mainnet deployment creates a fresh token contract and records its address in
the deployment manifest; the Robinhood testnet token address is not reused.

**Configuration:** `.env.local` selects this explicitly with
`MAINNET_DEPLOYMENT_TOKEN_MODEL=project-index`. Mainnet deployment remains a
separate, deliberate transaction step after reviewing signer funding and the
deployment configuration.

The mainnet timelock delay is separately configured by
`MAINNET_TIMELOCK_DELAY_SECONDS=0`; deploy scripts no longer inherit the
testnet delay. Mainnet V3/V4 preflights now pass. The local Cancun fork rehearsal
completed the V4 launch, pool initialization, LP NFT mint, one hooked swap, and
the 75/25 fee split. Its simulation manifest is
`deployments/rehearsals/robinhood-mainnet-v4-fork-2026-09-26.json`; these local
fork transactions are not canonical. The signer currently has only
`0.000315410748224 ETH`, so actual deployment funding remains outstanding.

**Confirmed final (2026-09-28):** `project-index` stays. No PONS/external token
integration will be attempted; any separately launched sCRIT meme coin is a
different contract address and is not backed, managed, or priced by this repo.
The operator also accepted the risk of continuing with the current deployer
wallet whose key was previously exposed in session output; rotation was offered
and declined.

## 5. Mainnet pilot loop (2026-09-28, all demo-only)

- Deployed 13 contracts, seeded hookless sCRIT/ETH base pool (position NFT to
  timelock), published one synthetic Au quote, attested two demo batches
  (0.001 kg + 0.01 kg), approved the deployer as issuer via timelock.
- Launched demo token PDMO (`0xEaad835Ab56de5EFF1D2B303B166B8aFA220C537`) in a
  taxed `PDMO/sCRIT` pool (`0x807c3523…ad30d19`, position NFT #3370272).
- First taxed swap (100 PDMO → 0.04419728 sCRIT) emitted `TaxCollected` with an
  exact 2.5% fee split 75% reserve / 25% operations. Swap executed through the
  unaudited one-off `DemoSwapHelper`; pool economics remain dust-scale and all
  records stay labeled demo. See the mainnet manifest `projectPools` entry.

## 6b. Issuer approval policy: fully automatic (2026-09-28)

No human approves issuers. `scripts/auto-approve-issuers.mjs` runs on a
schedule and approves every pending applicant whose wallet holds at least
0.001 sCRIT on the target chain (checked live via RPC), writing both the
service record and the on-chain allowlist through timelock (delay 0).
Rationale: buying sCRIT costs real money through the taxed pool, which is the
entire spam deterrent. Identity, token quality, and intent are explicitly NOT
checked. A well-funded spammer can still get in; that is the accepted price of
removing the human gate.

## 6. Timelock ops runbook (delay is 0, proposer/executor is the admin EOA)

All admin writes go through `ScritTimelockController`: `schedule(target, 0,
data, 0x0, salt, 0)` then `execute(...)` with the same args once the schedule
receipt confirms. Proven pattern (used for custodian registration and issuer
approval on mainnet): pick a unique `salt = keccak256("...")` per action,
`predecessor = 0x0`, `delay = 0`. Verify on-chain afterwards
(`isAuthorized`, `issuerApproved`). Never reuse a salt. Every privileged action
already emits an event consumed by `pnpm index:events --mainnet`, which now
also runs every 10 minutes via the `sCRIT-mainnet-indexer` scheduled task
(idempotent, cursor-based; fails gracefully without VPN and retries next cycle).
