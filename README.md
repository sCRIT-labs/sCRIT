# sCRIT

sCRIT is an EVM token launchpad paired with a critical-commodities index design. The nine basket weights are Au 30%, Ag 5%, Pt 12%, Pd 8%, Nd 8%, Dy 12%, Tb 8%, Sc 7%, and Li 10%. These are target allocations, not evidence of inventory. Diamonds are individual Rail B lots only; uranium is unavailable in the MVP.

The sCRIT market is not pegged to NAV and has no sCRIT redemption mechanism. A Rail A project token is paired with sCRIT; it is not a claim on commodities. Reserve value changes only after a scoped custodian attestation. Swap fees remain separate, unspent treasury until procurement and attestation.

## Pool fee model

- The `sCRIT/ETH` base market is hookless and untaxed.
- Mainnet `TOKEN/sCRIT` project pools use Uniswap V4 and `TradingTaxHook.sol`.
- The additional hook fee is fixed at 2.5%, split 75% to reserve treasury and 25% to operations; V4 LP fee is 0.30%.
- Exact-input swaps pay the fee in output currency; exact-output swaps pay it in input currency.
- Robinhood testnet currently has the prior V3 rehearsal integration, so its pools are untaxed. The app labels this distinction.

The fee hook and V4 launcher compile locally. A mainnet deployment has **not** been sent from this workspace. The mainnet deployment script verifies official V4 dependencies, mines a permission-encoded hook address, deploys the hook and launcher, and writes an incremental manifest. Do not set the production app to chain 4663 until the deployment manifest is reviewed and its addresses are installed.

## Local setup

```powershell
pnpm install
Copy-Item .env.example .env.local
pnpm compile
pnpm dev
```

Set `DATABASE_URL` and a random `ADMIN_KEY` locally. A separate `AP_RATE_LIMIT_SECRET` (at least 32 characters) is recommended for issuer-application rate limiting; the API falls back to `ADMIN_KEY` when omitted. The app stores project records in namespaced `scrit_*` tables. Existing databases should apply `migrations/0004_scrit_v2_events.sql` followed by `migrations/0005_full_index_basket.sql` before indexing v2 events or using the expanded basket APIs. `.env.local` is ignored by Git; never share it or commit its secrets.

## Existing testnet rehearsal

The deployment manifest in `deployments/robinhood-testnet-2026-09-25.json` records the earlier V3 testnet stack. It predates the nine-commodity expansion and V4 hook. Recompile and deploy a fresh testnet stack before testing the updated reserve adapter; do not treat the old addresses as having the new source code.

```powershell
pnpm compile
pnpm check:v3:testnet
pnpm deploy:testnet
```

Testnet deployment uses `PRIVATE_KEY`, `ADMIN_MULTISIG`, `PAUSER_ADDRESS`, `PRICE_SIGNER_ADDRESS`, `RESERVE_TREASURY_ADDRESS`, `SCRIT_MAX_SUPPLY`, `V3_FACTORY_ADDRESS`, and `V3_POSITION_MANAGER_ADDRESS` from local environment configuration.

## Robinhood Chain mainnet deployment

Robinhood mainnet uses chain ID 4663. Its official Uniswap V4 PoolManager, PositionManager, and Permit2 addresses are prefilled in `.env.example`; the script checks live code and the PositionManager's PoolManager binding. `MAINNET_OPERATIONS_TREASURY_ADDRESS` is optional; if omitted, the 25% operations share goes to the deployer EOA. Set it explicitly to route that share elsewhere.

```powershell
pnpm compile
pnpm check:v3:mainnet
pnpm deploy:mainnet
```

`pnpm deploy:mainnet` sends real mainnet transactions. It reads keys only from local `.env.local`, writes partial and complete manifests under `deployments/`, and does not create price, reserve, or lot records. After deployment, install the printed `NEXT_PUBLIC_SCRIT_*_MAINNET` values and `NEXT_PUBLIC_SCRIT_TAX_HOOK_MAINNET`, set `NEXT_PUBLIC_SCRIT_CHAIN_ID=4663`, and build the app. Keep mainnet and testnet addresses isolated.

### Canonical sCRIT/ETH base market

The app's base market uses one canonical, hookless Uniswap V4 pool key: native ETH / sCRIT, 0.30% LP fee, 60 tick spacing, and no hook. The mainnet deployment manifest records this key and its PoolId, but it starts uninitialized. V4 is permissionless, so this identifies the market the app tracks; it cannot prevent third parties from creating other pools.

Seed only after the mainnet sCRIT token exists and the chosen wallet already holds the exact seed inventory. Review the deployment manifest, then run the explicit command below with amounts the operator chose. The script checks chain ID, deployed V4 dependencies and their PoolManager bindings, token balance/decimals, and the requested price bounds. It initializes the pool if needed and mints the full-range LP position to the configured timelock. This command sends mainnet transactions and is intentionally never part of deployment/build.

```powershell
pnpm market:seed:v4 -- --mainnet --token 0x... --timelock 0x... --scrit 1000 --eth 0.25 --manifest deployments/robinhood-mainnet-<timestamp>.json
```

After confirming the manifest's `baseMarket` entry and transaction receipts, set `NEXT_PUBLIC_SCRIT_BASE_POOL_ID_MAINNET` to the printed PoolId (or server-only `SCRIT_BASE_POOL_ID_MAINNET`) and `NEXT_PUBLIC_SCRIT_MAINNET` to the deployed token address. The proof page's `/api/market` reads V4 spot price from StateView and multiplies it by a fresh ETH/USD quote from DeFiLlama's CoinGecko adapter. If the pool is absent/empty or either source is stale/unavailable, it returns unavailable; it does not infer a price. This spot is liquidity-sensitive and is not an oracle or NAV.

For production RPC, Robinhood recommends a provider endpoint because public RPCs are rate limited. See [Robinhood network and RPC docs](https://docs.robinhood.com/chain/connecting/) and [Uniswap V4 deployments](https://developers.uniswap.org/docs/protocols/v4/deployments).

## Operations

- `pnpm index:events --mainnet` indexes the V4 hook and configured contract events. Set `SCRIT_MAINNET_INDEXER_START_BLOCK` from the manifest.
- `pnpm price:publish --mainnet <symbol> <USD_PER_KG> <source>` signs a manually sourced quote; it does not fetch market data.
- `pnpm reserve:attest --mainnet ...` submits an EIP-712 signed reserve batch after scope and price setup.
- `pnpm lot:attest --mainnet ...` submits an individually scoped Rail B lot record.
- `pnpm check:v3:mainnet` verifies the retained V3 base-market deployment, while V4 dependencies are checked during mainnet deployment.

Custodian names, certificates, market prices, KYC status, and physical assets must never be invented. Demo/test records remain labeled as such.
