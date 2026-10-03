# sCRIT — Project Report & Architecture Overview

**Autonomous Critical Minerals & Rare Earths Reserve Protocol on Robinhood Chain (EVM 4663 / 46630)**

- **Web Application:** https://scritindex.tech
- **Tokens & Pair Explorer:** https://scritindex.tech/tokens
- **Swap Terminal:** https://scritindex.tech/swap
- **Pair Launcher:** https://scritindex.tech/launch
- **Proof of Physical Reserves:** https://scritindex.tech/proof
- **Physical Lots & Redemption:** https://scritindex.tech/lots
- **GitHub Repository:** https://github.com/sCRIT-labs/sCRIT

---

## 1. Project Description

**sCRIT** is an institutional-grade decentralized commodities reserve protocol deployed natively on **Robinhood Chain (EVM mainnet 4663 and testnet 46630)**. It tokenizes, liquidifies, and ballasts strategic physical critical minerals and rare earth elements (HREE)—materials indispensable for defense aerospace, advanced semiconductors, electric vehicle traction motors, quantum computing, and clean energy storage.

Unlike traditional synthetic or paper commodity tokens, sCRIT implements a sovereign **Dual-Rail Architecture**:

1. **Rail A (Liquid Index AMM & Pair Ecosystem):**
   A liquid on-chain token (`sCRIT`) that acts as the primary reserve currency. It operates on Uniswap V4 with a custom, mathematically audited trading hook (`TradingTaxHook.sol`). Every swap through the hook automatically exacts a 2.5% transaction levy split **75% into the Physical Commodity Reserve Procurement Treasury** and **25% into Operations**. Furthermore, any new project can use the on-chain `sCRITV4Launcher` to bootstrap instant liquidity paired directly against sCRIT.

2. **Rail B (Certified Physical Commodity Lots & Delivery):**
   Direct title to physical warehouse lots (Dysprosium, Terbium, Neodymium, Scandium, Lithium, Platinum, Palladium, Gold, and Silver) vaulted across bonded facilities (Zurich, Singapore, Rotterdam). Vault holdings are attested cryptographically via EIP-712 structured custody certificates and Merkle proof trees, with primary redemption rails for verified Authorized Participants (APs).

The flagship contracts are deployed, active, and source-verified on the Robinhood Chain block explorer with a live, funded Uniswap V4 base pool.

---

## 2. Core Value Proposition & Problem Solved

### The Problem

- **Opaque OTC Cartels & Export Bans:** Critical defense elements and heavy rare earths (Dysprosium, Terbium) are traded behind closed doors via bilateral opaque agreements with extreme geopolitical export vulnerability.
- **Physical Custody Black Boxes:** Verifying whether a commodity issuer actually holds vaulted physical materials historically requires trusting quarterly PDF audit scans with zero real-time cryptographic auditability.
- **Zero Retail Access:** Physical lots are transacted in multi-ton bulk sizes with 90-day settlement windows, shutting out retail and decentralized treasuries.
- **AMM Fee Waste:** Standard AMM transaction fees vanish into passive liquidity pools instead of reinforcing the intrinsic physical backing of the underlying asset.

### The sCRIT Solution

- **Autonomous Physical Buyback Loop (Uniswap V4 Hook):**
  Every swap through sCRIT's custom Uniswap V4 hook (`0x5a0e9b72...2044`) routes 75% of its 2.5% fee straight into the physical commodity procurement vault. As trading volume grows, the physical reserve stockpile expands autonomously.
- **5-Sleeve & 9-Element Engineered Index:**
  - 🧪 **Heavy Rare Earths (40% Target):** Dysprosium (**Dy** 25%) & Terbium (**Tb** 15%) — vital for radar and permanent magnets.
  - 🧲 **Clean Tech & Aerospace (15% Target):** Neodymium (**Nd** 10%) & Scandium (**Sc** 5%) — essential for aerospace alloys and EV traction motors.
  - ⚡ **Platinum Group (15% Target):** Platinum (**Pt** 10%) & Palladium (**Pd** 5%) — catalytic and hydrogen tech.
  - 🔋 **Battery Transition (5% Target):** Lithium (**Li** 5%) — battery energy storage.
  - 🪙 **Bedrock Ballast (25% Target):** Gold (**Au** 20%) & Silver (**Ag** 5%) — deep liquidity stabilizing the portfolio.
- **Cryptographic EIP-712 Attestation Engine:**
  Custodians sign structured assay data and bar certificates off-chain. The `ReserveManager` validates ECDSA signatures against on-chain authorized custodians before any batch issuance or NAV rebalancing occurs.
- **Institutional Ondo-Grade UI & Synchronized Wallet:**
  Bespoke editorial typography, real-time live telemetry bento grids, and multi-provider wallet connection (MetaMask, Rabby, Coinbase, OKX, Trust, Phantom) synchronized seamlessly across the entire app.
- **One-Click Pair Launcher (`sCRITV4Launcher`):**
  Allows ecosystem projects to launch new tokens paired against sCRIT in a single transaction with automatic hook attachment and Permit2 integration.

---

## 3. End-to-End Application Flow

```
[User / Trader / Project Creator]
       │
       ▼
1. Institutional Web Portal (https://scritindex.tech)
   ├── Real-time telemetry: NAV spot feeds, vault stockpile progress, reserve weightings
   ├── Multi-provider wallet connect (MetaMask, Rabby, Coinbase, OKX, Trust, Phantom)
   └── Interactive AI Commodity Intelligence Copilot
       │
       ├───────────────────────────────┬───────────────────────────────┐
       ▼                               ▼                               ▼
2. Swap Interface (/swap)     3. Pair Launcher (/launch)     4. Physical Lots (/lots)
   ├── Select token pair        ├── Deploy project token       ├── Browse certified lots
   │   (sCRIT ⇋ PDMO/CURUT/etc) ├── Seed initial liquidity    ├── EIP-712 custody proof
   ├── Live math estimation     ├── Attach 2.5% Tax Hook       ├── Fractional P2P market
   │   (75% reserve / 25% ops)  └── Transfer LP to creator     └── AP physical redemption
   ├── 0.5% slippage guard                     │                               │
   └── Permit2 + Hook execute                  │                               │
       │                                       │                               │
       ▼                                       ▼                               ▼
5. Robinhood Chain V4 Settlement        6. Ecosystem Directory         7. Vault Audit Trail
   ├── Uniswap V4 PoolManager              └── Token listed on /tokens    └── Public Proof Ledger
   ├── TradingTaxHook.afterSwap                with live pool telemetry       on /proof
   └── Instant fee distribution                and verified CA
```

---

## 4. Key Architectural Components

### A. Smart Contracts (`contracts/`)

- **`sCRITToken.sol` / `ScritIndexToken.sol`:**
  Canonical ERC20 critical commodity index token. Fixed supply bounds, NAV-gated minting via ReserveManager, and full ERC20Permit support.
- **`TradingTaxHook.sol`:**
  Uniswap V4 hook with address mined via CREATE2 for permission flags `0x2044` (`beforeInitialize | afterSwap | afterSwapReturnDelta`). Enforces 2.5% fee on exact-input and exact-output swaps, splitting proceeds 75% to Reserve Treasury and 25% to Operations Treasury.
- **`sCRITV4Launcher.sol`:**
  Atomic pair deployment factory. Pulls sCRIT from creator, deploys project token, initializes Uniswap V4 pool with `TradingTaxHook`, and funds liquidity via Permit2 and PositionManager in one flow.
- **`ReserveManager.sol`:**
  Cryptographic gatekeeper for physical custody accounting. Verifies EIP-712 custodian signatures, enforces max age (7 days) and timestamp skew limits, and maintains 5-sleeve mass records (`holdingsKgE12`).
- **`PriceOracleAdapter.sol` & `CustodianRegistry.sol`:**
  On-chain registry of verified assayers/custodians and multi-source price feeds with stale price rejection.
- **`PhysicalLotManager.sol`, `PhysicalLotToken.sol`, `LotMarketplace.sol`, `LotRedemptionManager.sol`:**
  Rail B infrastructure for fractionalized certified physical warehouse receipts (ERC1155) and KYC-gated physical bar delivery.
- **`ScritTimelockController.sol`:**
  Decentralized multisig governance timelock managing protocol parameter upgrades and ownership rights.

### B. Mathematical & Pricing Engine (`lib/`)

- **V4 Math & Slippage:** Real-time square root price calculations, Q96/Q128 scaling, and slippage protection clamping (0.5% default, custom bps).
- **Tax Breakdown:** Deterministic fee decomposition allocating 75% to physical stockpile reserves and 25% to protocol operations.

### C. Institutional Frontend & Telemetry (`app/`, `components/`)

- **Next.js 16 (App Router) + React 19 + TypeScript 5 (Strict Mode):**
  High-performance SSR/CSR hybrid architecture.
- **Design System:**
  Ondo-inspired luxury aesthetic with bespoke Serif headers, monospace financial numerals (`--font-mono`), subtle gold accents (`--signal: #c9922e`), and dark obsidian containers.
- **Wallet Connection:**
  Custom lightweight multi-provider wallet layer (`lib/wallets.ts`, `TopbarWallet.tsx`, `WalletMenu.tsx`) with cross-tab and cross-component event dispatching (`scrit:walletChange`).

---

## 5. Technology Stack

- **Smart Contract Language:** Solidity `0.8.37`
- **AMM Framework:** Uniswap V4 Core (`1.0.2`) & Uniswap V4 Periphery (`1.0.3`)
- **Blockchain Network:** Robinhood Chain Mainnet (`Chain ID: 4663`) & Testnet (`Chain ID: 46630`)
- **RPC & Web3 SDK:** `viem 2.56.7` (EVM)
- **Frontend Framework:** Next.js `16.3.4` (App Router), React `19.2.8`, TypeScript `5.x`
- **Styling:** Custom CSS design system + Tailwind CSS
- **Database:** PostgreSQL (`postgres 3.4.9`) for tokens catalog and attestation logs
- **Testing Framework:** Vitest `4.1.11` (100% passing E2E, unit, and regression tests)

---

## 6. Live Mainnet & Testnet Deployments

### Robinhood Chain Mainnet (Chain ID: 4663)

| Contract Name | Deployed Address | Transaction Hash | Block Number |
|---|---|---|---|
| **sCRIT Index Token (`SCRIT_INDEX`)** | `0x56073943133c1c0678a753be9402b27d43cf1c22` | `0xdff4a7f0b41f1c2af5e580965bce6bb9db4fc49429f5f3c0dfead45047376a3f` | 74476136 |
| **Uniswap V4 Tax Hook (`SCRIT_TAX_HOOK`)** | `0x5a0e9b72a3fcad25cf30757164c90d51f4ca2044` | `0x86d6827cc22bac5a838c826b7ce1e02331bf82b8837288fbbfb7f7d4618d93d9` | 74476201 |
| **Pair Launcher V4 (`SCRIT_LAUNCHER_V4`)** | `0x2e0de4486b391c182a6727d5480380f9820c73d5` | `0x458b4c7b2cc673f43b0f4aae89852e801046dc49f23525d13e9222d142ab8e9e` | 74476342 |
| **Reserve Manager (`SCRIT_RESERVE`)** | `0x0cc054ce72fc0a489732e20dd595de934be2e953` | `0xaff4d2d754ee09b1ccbedbd002d70d56714a9d0cea5f1a557858e91e738ef43f` | 74476099 |
| **Timelock Controller (`SCRIT_TIMELOCK`)** | `0x00824e9c6075ff2ceb10009de7f170fc6721df1a` | `0xee27744b8f3ddf227ec861816e014e3c2db946ccd11f1ed56a1fdf67c8ce7be1` | 74475976 |
| **Custodian Registry (`SCRIT_CUSTODIANS`)** | `0x4993478847d03e13d5eae930878ad428cf2b27f8` | `0x196bba8af8fd6f101655cfeb5113e08f8ccc6bdb3591532d032cb77e26338d36` | 74476001 |
| **Price Oracle Adapter (`SCRIT_PRICES`)** | `0x5341042250dcbc11a929581d22b7be30c14640df` | `0xe973ea649e8907c58a545e80b71f3b77524b8c16b5080cfc90ac08b5659b3738` | 74476034 |
| **KYC Registry (`SCRIT_KYC`)** | `0x1f1d055014348e60af47065d45247b2c1204c7e8` | `0xf08b4c22946407fe1c190fe8d84986ebde112eab884e980c4a4adf6635283910` | 74476059 |
| **Physical Lot Manager (`SCRIT_LOT_MANAGER`)** | `0x4f0332621e9a1f2d79dc3095b0cf82297a562a33` | `0x5cac7f4487e96c82a1fd6b987a3881eee810881996e6f0acd25a64820819801e` | 74476233 |
| **Physical Lot Token (`SCRIT_LOT_TOKEN`)** | `0x46b01dcdad1fb6dbd95bbd2e88f4f69064bd1bf1` | `0x035854d6b452471956f620ec847678fb2cbccbb9125930f316af508d863b9469` | 74476259 |
| **Lot Redemption Manager (`SCRIT_LOT_REDEMPTION`)**| `0x6809f71adc27a158a6ab4d74bd6a7ac228014827` | `0x841c6865def2d606444a82c2c394053ab9a38ae4ec99846aad75fa9de136aa98` | 74476285 |
| **Lot Marketplace (`SCRIT_LOT_MARKET`)** | `0xf8e56794c0ded1e01b8f973ff0f6d2f86f8e43e7` | `0x144f540d608bc6c3c3d82e5d674c74313044d52dafec33bf7e812bdfe0aa9c30` | 74476315 |
| **CREATE2 Deployer (`SCRIT_CREATE2_DEPLOYER`)**| `0xefcb390b33d5edc90f0bf1039f94e53fb18c7346` | `0xc24f29e9a90c56810a049755080604e1ffb27c7d444e2b2add64205bf7a7b96e` | 74476165 |

- **Live Uniswap V4 Pool ID:** `0xd029d347e9706be039efab5de2da16919fc145d31ea0e3c9a8bd0a773bf6c69e`  
  *Position ID:* `3370083` | *Pair:* Native ETH ⇋ sCRIT (Canonical Base Market)

---

## 7. Security, Trust & Risk Controls

1. **Non-Custodial Architecture:**
   The web application and API servers never hold private keys and never escrow funds. All swaps and liquidity operations are signed directly by the user's wallet via standard EVM JSON-RPC providers.
2. **Timelock Governance:**
   Protocol upgrade powers, fee recipients, and custodian approvals are governed by `ScritTimelockController` (`0x00824e9c...`).
3. **Replay & Timestamp Protection:**
   Attestations signed by custodians strictly enforce EIP-712 domain separation, unique batch UUIDs, sequential nonces, and a 7-day expiration horizon.
4. **Deterministic V4 Permissions:**
   The `TradingTaxHook` address is mathematically bound to permission flags `0x2044` via CREATE2, preventing malicious contract substitution.
