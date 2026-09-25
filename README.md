# sCRIT — Commodity-Backed Index Launchpad (Pilot)

Pilot index token paired with every launched token. Precious-metals only day-1 (Au 60 / Ag 25 / Pt 15).

## Quickstart

```bash
npm install
cp .env.example .env.local
npm test
node scripts/compile.mjs
npm run dev
```

Apply DB: `psql "$DATABASE_URL" -f migrations/0001_pilot.sql` (optional day-1, memory fallback works).

## Deploy contracts (local only)

```bash
node scripts/compile.mjs
node scripts/deploy.mjs --testnet   # token only, rehearsal
node scripts/deploy.mjs --mainnet   # token + launcher (needs PRIVATE_KEY in .env.local)
```

Set the printed addresses as `NEXT_PUBLIC_SCRIT` / `NEXT_PUBLIC_SCRIT_LAUNCHER` in
`.env.local` and Vercel, then verify both on Blockscout (Standard-JSON, solc 0.8.26,
optimizer runs 200). Fund the base sCRIT/ETH pool manually via the router, then open
gated launch slots from `/admin` (approve issuer wallets).

## Rules

- Reserve moves only on custodian EIP-712 attestation.
- Swap tax 0% promo. Target 2.5% (75% reserve / 25% ops) after audit.
- sCRIT is not pegged. No redemption in pilot.
- Gated issuance. Pilot cap 100,000 sCRIT per pool (revisit after price discovery).
