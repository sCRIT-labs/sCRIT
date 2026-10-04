<div align="center">

![sCRIT Protocol Banner](./assets/scrit-banner.png)

# sCRIT

**Autonomous Critical Minerals & Rare Earths Reserve Protocol on Robinhood Chain**

🌐 **Web Application:** [https://scritindex.tech](https://scritindex.tech) · 📜 **Documentation:** [docs/report.md](docs/report.md) · 🔄 **Swap:** [https://scritindex.tech/swap](https://scritindex.tech/swap) · ⚡ **Proof Ledger:** [https://scritindex.tech/proof](https://scritindex.tech/proof) · 💎 **Physical Lots:** [https://scritindex.tech/lots](https://scritindex.tech/lots)

*The sovereign on-chain critical mineral index led by heavy rare earths (Dy, Tb) and ballasted by gold. Powered by Robinhood Chain, Uniswap V4 Dynamic Hooks, and Cryptographic EIP-712 Custodian Attestations.*

[![Chains](https://img.shields.io/badge/Chains-Robinhood%20Chain%204663%20·%20Testnet%2046630-CCFF00?style=flat-square&labelColor=0A081E&logoColor=black)](#-dual-rail-launch--settlement-rails)
[![Runtime](https://img.shields.io/badge/Runtime-Next.js%2016%20·%20React%2019%20·%20TypeScript-7C3AED?style=flat-square&labelColor=0A081E)](#-tech-stack)
[![Styling](https://img.shields.io/badge/Styling-Tailwind%20CSS%20·%20Three.js%203D%20·%20Ondo--Inspired%20Luxury-D4AF37?style=flat-square&labelColor=0A081E)](#-platform-interfaces)
[![AMM Engine](https://img.shields.io/badge/AMM%20Engine-Uniswap%20V4%20Hook%20·%202.5%25%20Tax%20(75%2F25)-10B981?style=flat-square&labelColor=0A081E)](#-protocol--settlement-architecture)
[![Custody](https://img.shields.io/badge/Custody-EIP--712%20Signed%20Attestations%20·%209%20Elements-FF7A29?style=flat-square&labelColor=0A081E)](#-core-value-proposition)
[![Tests](https://img.shields.io/badge/Tests-Vitest%20·%20Passing-10B981?style=flat-square&labelColor=0A081E)](#-testing--verification)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square&labelColor=0A081E)](#-license)

</div>

---

## ⚡ Overview

**sCRIT** is an institutional decentralized finance protocol that tokenizes and liquidifies strategic critical minerals, heavy rare earth elements (HREE), and industrial metals. The reserve index is engineered to reflect the tangible value of materials essential for defense, aerospace, semiconductors, clean energy, and robotics - anchored by physically attested warehouse inventory.

In legacy markets, physical critical minerals are plagued by extreme friction:
- **Opaque OTC Cartels:** Pricing and supply agreements are closed-door, illiquid, and prone to export restrictions.
- **Custody Uncertainty:** Verifying physical vault inventory requires cumbersome paper bills of lading and slow third-party audits.
- **Zero Retail Access:** Institutional buyers must trade multi-ton bulk lots with long settlement cycles.

sCRIT solves this through a robust **Dual-Rail Architecture**:
- **Rail A (Decentralized Index AMM):** A liquid on-chain token (`sCRIT`) traded against ETH on Robinhood Chain via a custom Uniswap V4 hook. Swap fees automatically channel revenue into autonomous reserve buybacks.
- **Rail B (Certified Physical Commodity Lots):** High-integrity warehouse lots (Au, Ag, Pt, Pd, Dy, Tb, Nd, Sc, Li) backed by cryptographically signed EIP-712 vault custody attestations, verifiable Merkle proofs, and primary redemption rails for Authorized Participants (APs).

---

## 🏛️ Core Value Proposition

* **5 Sleeves & 9 Critical Commodities:** Mathematical target weights engineered to balance high-growth critical elements with liquid bedrock collateral:
  - 🧪 **Heavy Rare Earths (40% Target):** Dysprosium (**Dy** 25%) and Terbium (**Tb** 15%) - vital for radar systems, precision-guided munitions, and permanent magnets.
  - 🧲 **Magnet & Clean Tech (15% Target):** Neodymium (**Nd** 10%) and Scandium (**Sc** 5%) - critical for EV traction motors, wind turbines, and aerospace alloys.
  - ⚡ **Platinum Group Metals (15% Target):** Platinum (**Pt** 10%) and Palladium (**Pd** 5%) - essential for hydrogen electrolyzers and industrial catalytic converters.
  - 🔋 **Battery Transition (5% Target):** Lithium (**Li** 5%) - foundational for energy storage grids and solid-state batteries.
  - 🪙 **Bedrock Ballast (25% Target):** Gold (**Au** 20%) and Silver (**Ag** 5%) - deep-liquidity bedrock collateral stabilizing portfolio volatility.
* **Uniswap V4 Autonomous Tax Hook (`TradingTaxHook.sol`):** Implements an on-chain 2.5% transaction levy split **75% into the Protocol Reserve Buyback Treasury** and **25% into Operations**. Every trade autonomously expands physical reserve backing.
* **EIP-712 Cryptographic Attestation Engine:** Vault custodians sign structured off-chain assay reports and custody certificates. These are published on-chain and verified via cryptographic signature matching, eliminating fraud.
* **Dual-Rail Non-Interference:** Rail A token holders enjoy continuous AMM liquidity without bearing physical delivery logistics; Rail B institutions gain direct title and redemption rights to vaulted physical inventory.
* **Real-Time Indicative Telemetry & AI Copilot:** Live NAV telemetry combining spot price feeds, vault weightings, and an interactive intelligence copilot for macro commodity analysis.

---

## 🔬 Protocol & Settlement Architecture

```mermaid
flowchart LR
    subgraph Custody["🏛️ Certified Vault Custody"]
        Vault[Physical Vaults<br/>Zurich · Singapore · Rotterdam] --> Assays[Lab Assays & Bar Lists]
        Assays --> EIP712[EIP-712 Signed Attestations]
    end

    subgraph RailB["💎 Rail B: Certified Lots"]
        EIP712 --> Reg[PhysicalLotManager.sol]
        Reg --> Lots[Onchain Certified Lots<br/>Au, Pt, Dy, Tb, Li, etc.]
        Lots --> AP[Authorized Participants<br/>Primary Mint & Physical Redemption]
    end

    subgraph RailA["⚡ Rail A: Uniswap V4 AMM"]
        Trader([Swapper / Trader]) --> V4Pool[Uniswap V4 sCRIT/ETH Pool]
        V4Pool --> Hook[TradingTaxHook.sol<br/>2.5% Dynamic Fee]
        Hook -->|75%| Buyback[Reserve Buyback Treasury]
        Hook -->|25%| Ops[Protocol Operations]
        Buyback -.->|Procurement| Vault
    end

    subgraph Telemetry["📊 Telemetry & Proofs"]
        EIP712 --> Ledger[(Proof Ledger /proof)]
        V4Pool --> NAV[Indicative NAV Telemetry]
        NAV --> AppUI[sCRIT Protocol Frontend]
    end
```

### End-to-End Pipeline Stages

1. **Stage 1 - Custody Ingestion & Assay Verification:**
   - Physical mineral bars and ingots are deposited into ISO-certified high-security vaults (Zurich, Singapore, Rotterdam).
   - Independent assayers (e.g., ALS Global, SGS) analyze purity and serialize bar numbers.
2. **Stage 2 - Cryptographic Attestation Publishing:**
   - Custodians sign EIP-712 structured records containing commodity type, weight (kg), vault location, assay URI, and timestamp.
   - Attestations are broadcasted to the protocol Proof Ledger and indexed into PostgreSQL.
3. **Stage 3 - AMM Trading & Autonomous Buyback Tax:**
   - Swappers trade `sCRIT` against ETH or project tokens on Robinhood Chain Uniswap V4 pools.
   - `TradingTaxHook.sol` intercepts swaps, collecting 2.5%:
     - 75% is routed to the Reserve Treasury to fund subsequent physical commodity procurement.
     - 25% is routed to Protocol Operations for continuous monitoring and index governance.
4. **Stage 4 - Indicative NAV & Pilot Telemetry:**
   - The protocol telemetry engine aggregates spot commodity benchmarks (LME, Fastmarkets, Shanghai Metals Market) and multiplies them against attested vault inventory.
   - Live portfolio charts compute the blended NAV per sCRIT token in real-time.
5. **Stage 5 - Institutional Lot Settlement (Rail B):**
   - Authorized Participants can acquire or redeem discrete physical lots through `LotRedemptionManager.sol`, burning lot tokens upon physical vault handover.

---

## 🖥️ Platform Interfaces

### 1. Executive Telemetry Deck (`/`)
- **Indicative NAV Telemetry:** Real-time valuation calculations across the 5 asset sleeves.
- **Interactive 3D Allocation Dial:** Responsive visual breakdown illustrating target versus attested mineral allocations.
- **Live Proof Feeds:** Direct streaming of the latest custodian attestations and reserve expansions.

### 2. Institutional Issuer & AP Desk (`/issuer`)
- **Authorized Participant Onboarding:** Institutional KYC/AML verification interface and compliance onboarding.
- **Primary Deposit & Minting:** Interface for verified custodians to submit signed EIP-712 mineral deposit batches.
- **Issuance Ledger:** Comprehensive history of certified mineral intake.

### 3. Robinhood Chain Liquidity Engine & Launchpad (`/launch`)
- **Automated Pool Deployment:** Deploy project tokens paired with sCRIT into Robinhood Chain liquidity pools.
- **Hook Attachment:** Automatic binding of `TradingTaxHook.sol` to enforce the protocol's 2.5% reserve accumulation levy.

### 4. Institutional Swap Terminal (`/swap`)
- **Instant Pair Liquidity:** Swap between sCRIT, pilot tokens ($PDMO, $CURUT, etc.), and native ETH.
- **Dynamic 2.5% Hook Fee Math:** Live real-time output estimate factoring in the 75% reserve buyback and 25% protocol operations deduction.
- **Slippage & Routing:** Strict 0.5% default slippage bounding and Permit2 compatibility.

### 5. Reserve Tokens Directory (`/tokens`)
- **Multi-Element Catalog:** Complete inventory of sleeve-specific tokens and index contracts.
- **Contract Inspection:** Direct links to verified contracts on Robinhood Chain Blockscout.

### 5. Cryptographic Proof Ledger (`/proof`)
- **Real-Time Attestation Explorer:** Search and filter all on-chain custodian signatures by element (Au, Dy, Tb, etc.).
- **Cryptographic Hash Verification:** On-screen EIP-712 digest calculation and signer public key recovery.
- **Vault Location Breakdown:** Visual geographical mapping of physical metal custody locations.

### 6. Rail B Certified Physical Lot Marketplace (`/lots`)
- **Individual Lot Inspection:** Browse certified physical commodity lots with full warehouse provenance.
- **Warehouse Assays & Documentation:** One-click inspection of laboratory purity certificates.
- **Physical Delivery Settlement:** Interface for authorized holders to trigger physical redemption workflows.

### 7. Pilot Intelligence Copilot (`/copilot`)
- **AI-Powered Natural Language Interface:** Inquire about sleeve compositions, geopolitical supply chain risks, and historical rebalancing.
- **Real-Time Rebalancing Simulator:** Model simulated market shocks and portfolio drift under different commodity pricing scenarios.

### 8. Protocol Governance & Administration (`/admin`)
- **Role-Based Multisig Access:** Granular control over custodian whitelisting, oracle feeds, and emergency circuit breakers.
- **Fee Hook Accounting:** Real-time visibility into accumulated buyback treasury balances.

---

## ⛓️ Dual-Rail Launch & Settlement Rails

| Feature | Rail A (Decentralized Index AMM) | Rail B (Certified Physical Lots) |
|---|---|---|
| **Target Audience** | Retail Investors, DeFi Traders, LPs | Institutional Funds, Manufacturers, APs |
| **Token Representation** | Fungible `sCRIT` Index ERC20 | Discrete Physical Lot ERC20 / NFTs |
| **Liquidity Venue** | Robinhood Chain Uniswap V4 Pool | Dedicated Primary Marketplace & OTC |
| **Fee Architecture** | 2.5% Dynamic Tax Hook (75% Buyback / 25% Ops) | Zero swap tax; standard warehouse storage fees |
| **Backing Mechanism** | Dynamic basket claim backed by protocol treasury | 1:1 Title-backed claim to specific serialized vault bars |
| **Settlement Method** | Instant on-chain swap settlement | Physical vault withdrawal or on-chain transfer |
| **Attestation Type** | Aggregate portfolio attestation | Individual certified lot EIP-712 assay |

---

## 📁 Repository Structure

```text
scrit/
├── app/                         # Next.js 16 App Router pages & API endpoints
│   ├── api/                     # Backend API routes
│   │   ├── attestations/        # EIP-712 custodian proof query & submission
│   │   ├── copilot/             # AI Pilot Intelligence Copilot streaming API
│   │   ├── custodians/          # Whitelisted vault custody registry endpoints
│   │   ├── events/              # On-chain event indexer & transfer logs
│   │   ├── health/              # Node & system health telemetry
│   │   ├── market/              # Canonical Uniswap V4 pool state & pricing
│   │   ├── prices/              # Spot commodity price feeds (Fastmarkets/LME)
│   │   ├── rpc/                 # Anti-censorship high-availability RPC proxy
│   │   ├── tokens/              # Reserve tokens & project directory
│   │   └── treasury/            # Accumulated buyback & operations balances
│   ├── admin/                   # Protocol administration & role governance
│   ├── copilot/                 # AI Reserve Copilot full-page experience
│   ├── issuer/                  # Institutional AP & Issuer onboarding desk
│   ├── launch/                  # Liquidity Engine & Robinhood token launchpad
│   ├── legal/                   # Terms, privacy, disclaimer, and risk disclosures
│   ├── lots/                    # Rail B Certified Physical Lot Marketplace
│   ├── proof/                   # Cryptographic Proof Ledger & live telemetry
│   ├── tokens/                  # Reserve tokens directory & sleeve explorer
│   ├── globals.css              # Custom sleek scrollbar & luxury dark design tokens
│   ├── layout.tsx               # Root layout, Google Fonts, and metadata
│   └── page.tsx                 # Institutional Landing Scrub Deck experience
│
├── components/                  # Modular React 19 UI Components
│   ├── LandingScrubSections.tsx # Bespoke 3D isometric narrative scrub sections
│   ├── NavigationDialog.tsx     # Institutional navigation overlay & drawer
│   ├── InstitutionalFooter.tsx  # Compliance footer with audit links & element tickers
│   ├── WalletConnectModal.tsx   # Multi-wallet connector (Robinhood Chain 4663)
│   ├── PriceTickerStrip.tsx     # Live commodity price feed banner
│   └── ui/                      # Reusable atom components (buttons, cards, badges)
│
├── contracts/                   # Solidity Smart Contracts (solc 0.8.26 / 0.8.37)
│   ├── sCRITToken.sol           # Core ERC20 reserve token contract
│   ├── TradingTaxHook.sol       # Uniswap V4 2.5% dynamic tax hook (75/25 split)
│   ├── sCRITV4Launcher.sol      # Atomic Uniswap V4 pool deployment & initializer
│   ├── ReserveManager.sol       # Multi-sleeve reserve NAV calculation engine
│   ├── PhysicalLotManager.sol   # Warehouse physical lot tokenization & management
│   ├── LotRedemptionManager.sol # Physical delivery & vault redemption workflow
│   ├── CustodianRegistry.sol    # Whitelisted depository & assayer registry
│   ├── PriceOracleAdapter.sol   # Commodity spot price feed oracle aggregator
│   └── KycRegistry.sol          # Authorized Participant KYC compliance verification
│
├── lib/                         # Core Web3, Database & Domain Utilities
│   ├── chains.ts                # Robinhood Chain definitions & RPC endpoints
│   ├── db.ts                    # PostgreSQL connection pool (Supabase)
│   ├── attestations.ts          # EIP-712 attestation encoder & hash verifier
│   ├── viem-client.ts           # Viem public & wallet client factory
│   └── market.ts                # Uniswap V4 PoolId math & StateView reader
│
├── scripts/                     # Operational & Build Tooling
│   ├── compile.mjs              # Compiles Solidity contracts via native solc
│   ├── deploy.mjs               # Deployment orchestrator (Testnet / Mainnet)
│   ├── check-v4-network.mjs     # Uniswap V4 dependency & TLOAD preflight check
│   ├── seed-v4-base-market.mjs  # Initializes canonical sCRIT/ETH Uniswap V4 pool
│   ├── seed-complete-pilot-reserves.mjs # Seeds 9-element pilot warehouse attestations
│   └── index-events.mjs         # On-chain contract event synchronization script
│
├── migrations/                  # Sequential PostgreSQL Database Schemas
│   ├── 0001_init.sql            # Base schema for prices, tokens, and attestations
│   ├── 0002_ap_system.sql       # Authorized Participant applications & KYC
│   ├── 0003_lots_market.sql     # Rail B physical lots & redemption records
│   ├── 0004_scrit_v2_events.sql # Enhanced event tracking & tax distribution
│   └── 0005_full_index_basket.sql # 9-element basket & multi-sleeve allocations
│
└── public/                      # Static Assets & 3D Imagery
    ├── assets/                  # Brand wordmarks, vector logos, and favicons
    └── images/                  # High-resolution 3D digital isometric visuals
```

---

## 🛠️ Tech Stack

- **Framework:** Next.js 16.3.4 (Turbopack, App Router) + React 19.2.8 + TypeScript 5.x (Strict)
- **Styling:** Tailwind CSS v4 + Bespoke Luxury Institutional Theme + Custom Sleek Scrollbars
- **3D Graphics & Animations:** Three.js + Framer Motion 12.x
- **Web3 EVM Client:** Viem 2.56.x (Engineered for Robinhood Chain 4663 & EIP-712 Attestations)
- **AMM Infrastructure:** Uniswap V4 Core (`@uniswap/v4-core` 1.0.2) + Periphery (`@uniswap/v4-periphery` 1.0.3)
- **Smart Contracts:** Solidity `0.8.26` / `0.8.37` compiled via native `solc`
- **Database:** PostgreSQL (Supabase pooler) + postgres.js 3.4.x
- **Testing:** Vitest 4.1.x (Smart contract unit tests, EIP-712 signature verification, pool math)

---

## 🚀 Quickstart & Local Development

### Prerequisites

- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **Package Manager**: `npm` or `pnpm`
- **PostgreSQL**: Local instance or [Supabase](https://supabase.com) database

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/sCRIT-labs/sCRIT.git
cd sCRIT
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env.local
```

Populate the required keys in `.env.local`:

```env
# Robinhood Chain Network Settings
NEXT_PUBLIC_SCRIT_CHAIN_ID="4663"
NEXT_PUBLIC_RPC_URL="https://rpc.mainnet.chain.robinhood.com"

# Database Configuration (PostgreSQL / Supabase)
DATABASE_URL="postgresql://postgres:password@db.yourproject.supabase.co:6543/postgres?pgbouncer=true"

# AI Pilot Copilot (OpenAI / Mimo compatible API)
LLM_API_URL="https://api.mimo.ai/v1"
LLM_API_KEY="your-server-llm-key"
LLM_MODEL="mimo-v2.5"

# Security & Admin Role Keys
ADMIN_KEY="your-secure-random-admin-key"
AP_RATE_LIMIT_SECRET="your-32-char-min-rate-limit-secret"

# Canonical Deployed Addresses (Auto-populated after deployment)
NEXT_PUBLIC_SCRIT_MAINNET="0x..."
NEXT_PUBLIC_SCRIT_TAX_HOOK_MAINNET="0x..."
NEXT_PUBLIC_SCRIT_BASE_POOL_ID_MAINNET="0x..."
```

### 3. Database Migrations & Complete Pilot Seeding

Apply database schemas in sequential order:

```bash
psql "$DATABASE_URL" -f migrations/0001_init.sql
psql "$DATABASE_URL" -f migrations/0002_ap_system.sql
psql "$DATABASE_URL" -f migrations/0003_lots_market.sql
psql "$DATABASE_URL" -f migrations/0004_scrit_v2_events.sql
psql "$DATABASE_URL" -f migrations/0005_full_index_basket.sql
```

Seed the complete 9-element pilot warehouse reserve attestations ($331,531 USD value, 1,505 kg mass across Zurich, Singapore, and Rotterdam):

```bash
node scripts/seed-complete-pilot-reserves.mjs
```

### 4. Compile Smart Contracts

Compile the Solidity contracts to generate TypeScript ABI artifacts and EVM bytecode:

```bash
npm run compile
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 Smart Contracts & Verification

sCRIT smart contracts are architected for transparency, regulatory compliance, and non-custodial operations:

* **`sCRITToken.sol`:** Fixed-supply ERC20 token serving as the canonical fungible index representation on Robinhood Chain.
* **`TradingTaxHook.sol`:** Permission-encoded Uniswap V4 hook executing before/after swap callbacks. Intercepts trades to levy a 2.5% fee (75% reserve buyback treasury, 25% protocol operations).
* **`sCRITV4Launcher.sol`:** Mines permissioned hook addresses via CREATE2 and initializes canonical Uniswap V4 pools with exact tick spacing.
* **`ReserveManager.sol`:** On-chain validator for EIP-712 signed custodian attestations and real-time sleeve weight computations.
* **`PhysicalLotManager.sol`:** ERC20 / NFT tokenization layer for Rail B certified physical warehouse commodity lots.
* **`LotRedemptionManager.sol`:** Handles the physical settlement process - locks and burns on-chain lot tokens when an Authorized Participant initiates physical vault retrieval.
* **`CustodianRegistry.sol` & `KycRegistry.sol`:** Role-based registries governing approved vault facilities, certified assayers, and institutional AP credentials.

### Deploying to Robinhood Chain

```bash
# Verify Uniswap V4 dependencies on Robinhood Chain
npm run check:v4:mainnet

# Execute mainnet deployment
npm run deploy:mainnet

# Seed initial canonical Uniswap V4 pool liquidity
npm run market:seed:v4 -- --mainnet --scrit 1000 --eth 0.25
```

---

## 🧪 Testing & Verification

sCRIT enforces strict verification across mathematical models, signature cryptography, and AMM hooks:

```bash
# Run Vitest automated test suite
npm test

# Verify TypeScript types strictly
npx tsc --noEmit

# Run Next.js linter
npm run lint

# Compile production build
npm run build
```

---

## 🛡️ Non-Custodial Security & Risk Disclosures

* **Non-Custodial Architecture:** Neither sCRIT Labs nor the protocol smart contracts ever hold user private keys. All AMM transactions are signed directly in the user's Web3 wallet.
* **Independent Physical Custody:** Physical minerals are stored in third-party, insured depository vaults (Zurich, Singapore, Rotterdam). Custodians operate under strict bailment agreements.
* **Dual-Rail Insulation:** A default or supply interruption in a Rail B physical warehouse lot does not seize or freeze Rail A Uniswap V4 pool liquidity.
* **EIP-712 Cryptographic Defense:** Reserve attestations cannot be forged; any submission not signed by a registered, whitelisted custodian key is immediately rejected on-chain.
* **Disclaimer:** Digital assets and tokenized commodities involve significant financial and market risk. Nothing in this repository constitutes financial, legal, or investment advice. Always conduct independent due diligence.

---

## 📄 License

This repository is licensed under the [MIT License](LICENSE).
