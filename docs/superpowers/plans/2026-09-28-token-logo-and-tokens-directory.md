# Token Logo Cropper & Launched Tokens Directory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an end-to-end token asset logo cropper for the token launcher (`/launch`) and build a dedicated launched tokens directory page (`/tokens`) inspired by `kentir`, complete with registry persistence, network filtering, and live search.

**Architecture:** 
1. Port canvas-based 1:1 image cropping utility (`lib/crop-image.ts`) and modal (`components/CropModal.tsx`) styled for sCRIT's luxury editorial aesthetic.
2. Integrate logo upload, cropper trigger, and commodity icon presets into `app/launch/page.tsx`.
3. Build a persistent token registry library (`lib/tokens.ts`) and API endpoint (`app/api/tokens/route.ts`) supporting curated pilot tokens and newly minted user tokens.
4. Build the dedicated `/tokens` directory page with filter tabs, search, liquidity metrics, V4 hook tax tags, and explorer links.
5. Update `components/HeaderNav.tsx` and the launch success card with direct links to `/tokens`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Lucide React, HTML5 Canvas 2D API, Tailwind / CSS variables.

## Global Constraints
- Language: 100% English across all UI text, placeholders, logs, and error messages. No Indonesian text.
- Design: Strict adherence to sCRIT's Assay Paper Editorial theme (parchment/chalk backgrounds, gold/olive badges, mono labels).
- Hydration safe: All locale-sensitive numbers must use `toLocaleString("en-US")` or `suppressHydrationWarning`.
- Zero hydration errors, zero TypeScript build errors.

---

### Task 1: Image Crop Utility and Test Suite
**Files:**
- Create: `lib/crop-image.ts`
- Create: `tests/crop-image.test.ts`

**Interfaces:**
- `clampZoom(z: number): number`
- `maxPanOffset(imgW: number, imgH: number, viewSize: number, zoom: number): { x: number; y: number }`
- `clampOffset(imgW: number, imgH: number, viewSize: number, zoom: number, ox: number, oy: number): { x: number; y: number }`
- `cropSquareParams(imgW: number, imgH: number, viewSize: number, zoom?: number, offsetX?: number, offsetY?: number): { sx: number; sy: number; sSize: number }`

- [ ] **Step 1: Write test suite for crop calculations**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement `lib/crop-image.ts`**
- [ ] **Step 4: Run test to verify it passes**

---

### Task 2: Token Crop Modal Component
**Files:**
- Create: `components/CropModal.tsx`

**Interfaces:**
- Props: `{ src: string; fileName: string; fileType: string; onCancel: () => void; onDone: (dataUrl: string) => void }`

- [ ] **Step 1: Implement `CropModal.tsx` with responsive canvas, pointer dragging, and zoom controls**
- [ ] **Step 2: Add modal backdrop styles and smooth animations in `app/redesign.css`**

---

### Task 3: Token Registry & API Endpoint
**Files:**
- Create: `lib/tokens.ts`
- Create: `app/api/tokens/route.ts`
- Create: `tests/tokens.test.ts`

**Interfaces:**
- Type `LaunchedToken` with fields: `id`, `chainId`, `address`, `name`, `symbol`, `creator`, `supply`, `pooled`, `scritAmount`, `txHash`, `poolId`, `poolType`, `logoUrl`, `backingCategory`, `description`, `createdAt`
- Helper `getRegistryTokens(): LaunchedToken[]`
- Helper `saveLocalToken(token: LaunchedToken): void`
- Helper `listAllTokens(): LaunchedToken[]`

- [ ] **Step 1: Write failing test for token registry queries and formatting**
- [ ] **Step 2: Implement `lib/tokens.ts` with seeded pilot tokens and local storage sync**
- [ ] **Step 3: Implement `app/api/tokens/route.ts` for server-side directory retrieval**
- [ ] **Step 4: Run tests to verify they pass**

---

### Task 4: Integrate Asset Logo into `/launch`
**Files:**
- Modify: `app/launch/page.tsx`

- [ ] **Step 1: Add logo state, file input handler, and preset commodity icons**
- [ ] **Step 2: Wire up `CropModal` on image upload and preview cropped icon in token identity card**
- [ ] **Step 3: Save newly launched token to `lib/tokens.ts` on transaction completion**
- [ ] **Step 4: Add "View in Token Directory" button in the success trophy card**

---

### Task 5: Build Launched Tokens Directory Page (`/tokens`)
**Files:**
- Create: `app/tokens/page.tsx`
- Modify: `components/HeaderNav.tsx`

- [ ] **Step 1: Build `/tokens` page with search, network filters (All, Mainnet 4663, Testnet 46630, My Launches), grid cards, and metric badges**
- [ ] **Step 2: Add `Tokens` navigation link in `components/HeaderNav.tsx`**
- [ ] **Step 3: Run `pnpm build` to verify clean compilation across all routes**
