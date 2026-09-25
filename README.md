# sCRIT Pilot Application

sCRIT is an early pilot codebase for a proposed commodity-index token and token launch flow. The repository is not evidence of physical reserves, a custody contract, regulatory approval, or an independent audit.

## Pilot policy

- Target basket: Au 60%, Ag 25%, Pt 15%. These are design weights, not current holdings or a guarantee.
- Lithium and other unconfigured commodities are excluded.
- No peg and no redemption are offered in the pilot.
- Project-pool swap tax is 0% in the pilot. A proposed 2.5% rate and 75/25 allocation are inactive roadmap items.
- Rail A currently creates a fixed-supply project token and a TOKEN/sCRIT pool. It does not mint sCRIT from an attestation, prove custody on-chain, or enforce reserve backing.
- Issuer approvals are checked by the service and enforced again by the launcher contract. Approving a database entry alone does not grant on-chain launch permission; the launcher owner must set that wallet on-chain.
- Attestations are EIP-712 signed, scope-checked service records. They are not on-chain reserve state and do not prove physical delivery on their own.

## Local setup

```bash
pnpm install
Copy-Item .env.example .env.local
pnpm test
pnpm compile
pnpm dev
```

Set `DATABASE_URL` to a PostgreSQL URL and `ADMIN_KEY` to a random secret of at least 32 characters. The application lazily creates its `scrit_*` tables on first database request. Alternatively, apply `migrations/0003_scrit_namespaced_pilot.sql` with your PostgreSQL migration process. All sCRIT tables are prefixed to keep a shared Kentir database namespace separate. The app fails closed for data operations if PostgreSQL is unavailable; it does not fall back to process memory.

Set `CUSTODIAN_DEMO_ADDRESS` to a nonzero EVM address used for demo attestations. It is registered with demo status only. `SCRIT_ATTESTATION_CHAIN_ID` must match the EIP-712 domain used by the signer. The attestation endpoint also requires `NEXT_PUBLIC_SCRIT_LAUNCHER` to be configured to a nonzero verifying-contract address.

For treasury receipt verification, configure `NEXT_PUBLIC_SCRIT`, `NEXT_PUBLIC_TREASURY`, `TREASURY_CHAIN_ID`, and optionally `TREASURY_RPC_URL`. The admin route accepts a transaction hash only after confirming exactly one sCRIT `Transfer` to the configured treasury on that chain. It does not accept a client-supplied amount as proof.

The pilot guide uses a server-side OpenAI-compatible provider through `LLM_API_URL`, `LLM_API_KEY`, and `LLM_MODEL`. The LLM key stays private and is never sent to the browser. AP submissions and Copilot requests are rate-limited using a keyed hash of the forwarded client IP; set `AP_RATE_LIMIT_SECRET` (32+ characters) or use the same-length `ADMIN_KEY` fallback. Chat content is not persisted by this application, but it is sent to the configured model provider.

## Contract workflow

```bash
pnpm compile
node scripts/deploy.mjs --testnet
node scripts/deploy.mjs --mainnet
```

The launcher owner is the deployment wallet. New wallets cannot launch until the owner calls `setIssuerApproved(wallet, true)` on the launcher. Revoke access with `setIssuerApproved(wallet, false)`. Keep the owner key in a secured wallet; do not put `PRIVATE_KEY` in a hosted web environment.

The checked-in deploy script supports a testnet token rehearsal and mainnet launcher deployment. Set `ROUTER_ADDRESS` to a router independently verified for the selected chain; the script checks only that code exists at the address, not that the router is trustworthy or compatible. Without a testnet router, testnet mode deploys only the token. Robinhood's official [network reference](https://docs.robinhood.com/chain/add-network-to-wallet/) publishes RPC URLs and chain IDs but does not certify a router for this application. The script does not deploy the complete architecture described by the brief. Do not use it as a production launch procedure.

## Checks

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm compile
pnpm build
```

## Public-launch blockers

Before any public offering or representation of commodity backing, the project still needs qualified Indonesian and applicable-market counsel review; a regulator/perimeter determination; signed custody agreements and insurance; independent physical audit evidence; an audited reserve and issuance design; audited contracts; a signed price-source and NAV methodology; production monitoring, key management, incident response, and reporting. Rail B, on-chain reserve management, attestation-gated minting, a pool-specific swap-fee hook, and event indexing are not implemented here.

See [`docs/decisions.md`](docs/decisions.md) and [`docs/superpowers/plans/2026-09-25-scrit-pilot-hardening.md`](docs/superpowers/plans/2026-09-25-scrit-pilot-hardening.md) for rationale and current status.
