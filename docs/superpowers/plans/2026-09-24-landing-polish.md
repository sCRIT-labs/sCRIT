# Landing Polish Implementation Plan

> **Goal:** Transform sCRIT landing page into an interactive, anti-mainstream Web3 experience with tactile physics, interactive 3D bullion tilt, kinetic gravity orbit, live trade & NAV shock simulation, and holographic foil assay cards.

---

### Proposed Changes

#### Styling & Animations (`app/globals.css`)
- 3D perspective transforms & sheen reflection variables.
- Interactive holographic shimmer & foil stamp styling.
- Slider & range controls styled in brutalist gold & coal theme.
- CSS keyframes for kinetic particle flows and metallic sheen.

#### New Components
1. `components/Bullion3D.tsx`:
   - Interactive 3D physical metal ingot with dynamic reflection, gyro/mouse tilt, grade stamps (Au 999.9, Ag 999, Pt 9995).
2. `components/ReserveSimulator.tsx`:
   - Interactive simulation engine:
     - Swap Volume slider ($1k - $500k) -> live 1% fee calculation -> 75% reserve / 25% ops split.
     - Commodity Price Shock slider (-30% to +30%) -> recalculates NAV in real-time to demonstrate NAV is decoupled from trading volume.
     - Real-time simulation feedback.

#### Component Enhancements
1. `components/OrbitPools.tsx`:
   - Add kinetic SVG/Canvas particle flow along the orbital rings.
   - Interactive particle absorption towards the sCRIT core on hover.
2. `components/AssayCards.tsx`:
   - Add 3D card tilt with specular highlight on mouse move.
   - Holographic stamp effect on verified/attested badges.
3. `components/VaultReserve.tsx`:
   - Embed interactive `Bullion3D` toggleable showcase (Au / Ag / Pt).
4. `app/page.tsx`:
   - Mount `ReserveSimulator` right below `FlowLedger`.

---

### Verification Plan
1. `npm test` -> ensure all existing unit tests pass without regressions.
2. `npm run build` -> verify Next.js builds clean with no TypeScript or styling errors.
