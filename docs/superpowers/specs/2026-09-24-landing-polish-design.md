# sCRIT Landing Polish — The Sovereign Physical Engine Design Spec

## Goal
Elevate sCRIT landing page into an anti-mainstream Web3 experience combining brutalist financial prestige (Bullion Ledger) with tactile interactive physics and cryptographic transparency.

## Architecture & Features

### 1. Interactive Bullion 3D/Tilt Ingot (Hero / Vault Showcase)
- **Component**: `Bullion3D.tsx` / Integrated inside `VaultReserve.tsx` and `Hero.tsx`.
- **Physics**: Real-time CSS 3D transform + dynamic specular gradient sheen matching mouse coordinates.
- **Metal Variants**: Au (Gold LBMA 999.9), Ag (Silver 999), Pt (Platinum 9995) with stamped serial and seal.

### 2. Live Reserve & Tax Flow Simulator (DevBrief §13 Interactive Spec)
- **Component**: `ReserveSimulator.tsx` (Placed right after FlowLedger/OrbitPools).
- **Interactions**:
  - Slider: Volume Swap Simulasi ($1,000 — $500,000).
  - Split Visualizer: 1% Issuance/Trade Fee -> 75% Physical Reserve Purchase vs 25% Protocol Operations.
  - Live NAV Shock Slider: Price shock ±30% on commodities to demonstrate NAV moves on commodity prices, not trading hype.

### 3. Kinetic Gravity Orbit (`OrbitPools.tsx` Upgrade)
- Upgrade `OrbitPools`:
  - Canvas / SVG kinetic particles orbiting the `sCRIT` index core.
  - Interactive mouse gravitational pull / orbital freeze on hover.
  - Visual particle trail demonstrating the 1% fee routing from project orbit to core treasury.

### 4. Holographic Foil Assay Cards (`AssayCards.tsx` Upgrade)
- Interactive 3D tilt with holographic shimmer foil on the stamped assay badges.
- Click to inspect cryptographic certificate modal or verification breakdown.

### 5. Interactive EIP-712 Attestation Inspector (`MempoolFeed.tsx` / Attestation modal)
- Clicking a live attestation line unfolds the EIP-712 domain hash, payload parameters, and verified custodian signature.

## Implementation Steps
1. Add CSS extensions in `app/globals.css` for 3D metallic transforms, specular sheen gradients, and holographic foil effects.
2. Build `Bullion3D.tsx` interactive ingot component.
3. Build `ReserveSimulator.tsx` interactive trade & NAV shock engine.
4. Enhance `OrbitPools.tsx` with kinetic particle flow.
5. Upgrade `AssayCards.tsx` with holographic foil tilt mechanics.
6. Enhance `Hero.tsx` and `VaultReserve.tsx` to incorporate the 3D ingot interactions.
7. Test build (`npm run build`) and test suite (`npm test`).
