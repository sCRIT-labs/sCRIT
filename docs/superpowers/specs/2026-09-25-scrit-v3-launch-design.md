# sCRIT V3 Liquidity Launch Design

## Goal

Replace Rail A's unsupported V2 router dependency with a Robinhood Testnet V3 launch flow that creates a TOKEN/sCRIT pool and gives the creator a standard V3 position NFT.

## Verified testnet dependencies

- Chain ID: `46630`.
- Uniswap V3 factory: `0x09b6d850382787115969a2699f107f5a974c781b`.
- Nonfungible Position Manager: `0x15e98cf94a32c7fd23a36fabb4fee612277da47b`.
- Manager `factory()` readback: `0x09b6d850382787115969a2699f107f5a974c781b`.
- Manager `WETH9()` readback: `0x0Dd1Df4fdd55808c9D530C9599BEA5107F6b9b4e`.
- Factory fee `3000` has tick spacing `60`.
- Each address was checked for deployed bytecode over the Robinhood Testnet RPC. The separate V3 swap router in `hood-testnet/seed-pool.js` uses a different factory and is not part of this launch flow.

## Contract behavior

The launcher keeps the existing TOKEN/sCRIT pair and one-call launch flow. It deploys the fixed-supply token, pulls the requested sCRIT from the creator, sorts the pair by address, calculates the initial square-root price from the desired token/sCRIT ratio, creates and initializes the V3 pool through the position manager, and mints a full-range position NFT directly to the creator. The fee tier is 3000 (0.3%); tick bounds are the nearest valid full-range ticks for the factory's spacing. Both sides use the launch slippage setting for minimum amounts. Unused token and sCRIT balances return to the creator. Any failed pool creation or mint reverts the whole launch.

The launch event records the token, creator, pool, position NFT ID, liquidity, and amounts added. No custom position custody or fee collection is introduced.

## Frontend and deployment behavior

- Update the generated launcher ABI, wallet call, launch result decoder, and launch receipt UI for the V3 event and NFT position ID.
- Deployment configuration supplies the V3 factory and position manager. The deployment script verifies chain ID, bytecode, the manager's factory/WETH immutables, and the 3000 fee spacing before deploying the launcher.
- The launcher deploys on Robinhood Testnet without `ROUTER_ADDRESS`. The old V2 router setting is no longer used by Rail A.
- `.env.local` remains ignored by Git. The verified testnet addresses may appear in `.env.example` because they are public addresses.

## Constraints and risks

- This is a testnet integration, not a production recommendation or audited contract.
- V3 is concentrated liquidity. Full-range liquidity provides broad price coverage and is an initial pilot default; it uses the standard V3 NFT position model.
- The deployment list used to discover the testnet manager is third-party documentation. Runtime checks against the configured testnet RPC are required before deployment.
- Mainnet deployment remains blocked by the repository's existing legal, custody, audit, and operational gates.
