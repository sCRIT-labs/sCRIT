# sCRIT — Project Report & Architecture Overview

**Autonomous Critical Minerals & Rare Earths Reserve Protocol on Robinhood Chain (EVM 4663 / 46630)**

- **Web Application:** https://s-crit.vercel.app (Mirror: https://scritindex.tech)
- **Swap Terminal:** https://s-crit.vercel.app/swap
- **Tokens & Pair Directory:** https://s-crit.vercel.app/tokens
- **Pair Launcher Desk:** https://s-crit.vercel.app/launch
- **Issuer Gateway:** https://s-crit.vercel.app/issuer
- **Proof of Physical Reserves:** https://s-crit.vercel.app/proof
- **Physical Lots & Redemption:** https://s-crit.vercel.app/lots
- **GitHub Repository:** https://github.com/sCRIT-labs/sCRIT

---

## 1. Project Description

**sCRIT** is an institutional-grade decentralized commodities reserve protocol deployed natively on **Robinhood Chain (EVM mainnet 4663 and testnet 46630)**. It tokenizes, liquidifies, and ballasts strategic physical critical minerals and rare earth elements (HREE)—materials indispensable for defense aerospace, advanced semiconductors, electric vehicle traction motors, quantum computing, and clean energy storage.

Unlike traditional synthetic or paper commodity tokens, sCRIT implements a sovereign **Dual-Rail Architecture**:

1. **Rail A (Liquid Index AMM & Pair Ecosystem):**  
   A liquid on-chain token (`sCRIT`) that acts as the primary reserve currency. It operates on Uniswap V4 with a custom, mathematically audited trading hook (`TradingTaxHook.sol`). Every swap through the hook automatically exacts a 2.5% transaction levy split **75% into the Physical Commodity Reserve Procurement Treasury** and **25% into Operations**. Furthermore, any new project can use the on-chain `sCRITV4Launcher` to bootstrap instant liquidity paired directly against sCRIT.

2. **Rail B (Certified Physical Commodity Lots & Delivery):**  
   Direct title to physical warehouse lots (Dysprosium, Terbium, Neodymium, Scandium, Lithium, Platinum, Palladium, Gold, and Silver) vaulted across bonded facilities (Zurich, Singapore, Rotterdam). Vault holdings are attested cryptographically via EIP-712 structured custody certificates and Merkle proof trees, with primary redemption rails for verified Authorized Participants (APs).

The flagship contracts are deployed, active, and source-verified on the Robinhood Chain block explorer with live Uniswap V4 integration.

---

## 2. Core Value Proposition & Problem Solved

### The Problem

- **Opaque OTC Cartels & Export Bans:** Critical defense elements and heavy rare earths (Dysprosium, Terbium) are traded behind closed doors via bilateral opaque agreements with extreme geopolitical export vulnerability.
- **Physical Custody Black Boxes:** Verifying whether a commodity issuer actually holds vaulted physical materials historically requires trusting quarterly PDF audit scans with zero real-time cryptographic auditability.
- **Zero Retail Access:** Physical lots are transacted in multi-ton bulk sizes with 90-day settlement windows, shutting out retail and decentralized treasuries.
- **AMM Fee Waste:** Standard AMM transaction fees vanish into passive liquidity pools instead of reinforcing the intrinsic physical backing of the underlying asset.

### The sCRIT Solution

- **Autonomous Physical Buyback Loop (Uniswap V4 Hook):**  
  Every swap through sCRIT's custom Uniswap V4 hook routes 75% of its 2.5% fee straight into the physical commodity procurement vault. As trading volume grows, the physical reserve stockpile expands autonomously.
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
[User / Ecosystem Project]
       │
       ▼
1. Web Portal (s-crit.vercel.app)
   ├── /swap    → Swap desk with exact-in / exact-out calculation & 2.5% tax routing
   ├── /launch  → Rail A Pair Launcher with live parameter validation
   ├── /proof   → Cryptographic audit ledger with signed custodian attestations
   └── /lots    → Rail B certified physical warehouse receipts
       │
       ▼
2. Wallet & Client Layer
   ├── Viem 2.56.7 (strict EVM JSON-RPC connection to Chain ID 4663 / 46630)
   ├── Real-time slippage clamping (0.5% default) & deadline calculation (+600s)
   └── Synchronized multi-wallet state (MetaMask, Rabby, Coinbase, OKX, Trust, Phantom)
       │
       ▼
3. Execution Branches
   ├── [A. Trade Swap]  → Uniswap V4 PoolManager swap execution
   │                      ├── TradingTaxHook intercepts swap
   │                      ├── 2.5% tax deducted (75% reserve buyback / 25% ops)
   │                      └── Net tokens delivered to trader
   │
   ├── [B. Pair Launch] → sCRITV4Launcher.launchToken()
   │                      ├── Deploys new project ERC20 token
   │                      ├── Deploys & initializes Uniswap V4 pool with TradingTaxHook
   │                      ├── Approves & pulls sCRIT liquidity
   │                      └── Mints LP position to creator
   │
   └── [C. Attestation] → ReserveManager.acceptAttestation()
                          ├── Verifies EIP-712 custodian signature & timestamp freshness
                          ├── Verifies commodity scope & assayer certificate
                          └── Updates on-chain reserve mass records (holdingsKgE12)
       │
       ▼
4. Settlement & Telemetry
   ├── Blockscout block explorer verification on Robinhood Chain Mainnet
   ├── Live catalog updated on /tokens via Postgres database
   └── Autonomous compounding of physical HREE reserves in verified custody
```

---

## 4. Key Architectural Components

### A. Smart Contracts (`contracts/`)

- **`sCRITToken.sol` (Pons Canonical Token `0x3517...d78f`):**  
  Canonical ERC20 critical commodity index token on Robinhood Chain Mainnet. Fixed supply bounds, NAV-gated minting via ReserveManager, and full ERC20Permit support.
- **`TradingTaxHook.sol` (`0x4bbd...a044`):**  
  Uniswap V4 hook with address mined via CREATE2 for permission flags `0x2044` (`beforeInitialize | afterSwap | afterSwapReturnDelta`). Enforces 2.5% fee on swaps, splitting proceeds 75% to Reserve Treasury and 25% to Operations Treasury.
- **`sCRITV4Launcher.sol` (`0x90e9...d711`):**  
  Atomic pair deployment factory. Pulls sCRIT from creator, deploys project token, initializes Uniswap V4 pool with `TradingTaxHook`, and funds liquidity via Permit2 and PositionManager in one flow.
- **`ScritTimelockController.sol` (`0x0082...df1a`):**  
  Decentralized governance timelock managing protocol parameter upgrades and contract ownership rights. Launcher ownership transferred to Timelock.
- **`ReserveManager.sol` (`0x0cc0...e953`):**  
  Cryptographic gatekeeper for physical custody accounting. Verifies EIP-712 custodian signatures, enforces max age (7 days) and timestamp skew limits, and maintains 5-sleeve mass records (`holdingsKgE12`).
- **`PriceOracleAdapter.sol` & `CustodianRegistry.sol`:**  
  On-chain registry of verified assayers/custodians and multi-source price feeds with stale price rejection.
- **`PhysicalLotManager.sol`, `PhysicalLotToken.sol`, `LotMarketplace.sol`, `LotRedemptionManager.sol`:**  
  Rail B infrastructure for fractionalized certified physical warehouse receipts (ERC1155) and physical bar delivery.

---

## 5. Technology Stack

- **Smart Contract Language:** Solidity `0.8.37`
- **AMM Framework:** Uniswap V4 Core (`1.0.2`) & Uniswap V4 Periphery (`1.0.3`)
- **Blockchain Network:** Robinhood Chain Mainnet (`Chain ID: 4663`) & Testnet (`Chain ID: 46630`)
- **RPC & Web3 SDK:** `viem 2.56.7` (EVM)
- **Frontend Framework:** Next.js `16.3.4` (App Router), React `19.2.8`, TypeScript `5.x`
- **Styling:** Custom CSS design system + Tailwind CSS (Ondo luxury aesthetic)
- **Database:** PostgreSQL (`postgres 3.4.9`) for tokens catalog and attestation logs
- **Testing Framework:** Vitest `4.1.11` (100% passing E2E, unit, and migration test suites)

---

## 6. Live Mainnet Contract Addresses (Robinhood Chain 4663)

| Contract Name | Deployed Address | Transaction Hash | Block Number |
|---|---|---|---|
| **sCRIT Pons Token (`SCRIT_MAINNET`)** | `0x351776b6fba6a910c32e46f3775aa946a724d78f` | Pons Mainnet Token | Verified |
| **Uniswap V4 Tax Hook (`SCRIT_TAX_HOOK`)** | `0x4bbd5c4894b75ddbf215c82304b6c21f9134a044` | `0x6090029e28335dd4ba50f96ca52ffcb6e6e06db95eadb0d9a2c3893cb7181b8d` | 82941964 |
| **Pair Launcher V4 (`SCRIT_LAUNCHER_V4`)** | `0x90e94eac08d1d3989d5560320c2096d38274d711` | `0xf8f0b1ac6c24663cce40b0088fa0e50f65933d0e52a0220f31df9384614699cc` | 82941994 |
| **Timelock Controller (`SCRIT_TIMELOCK`)** | `0x00824e9c6075ff2ceb10009de7f170fc6721df1a` | `0xee27744b8f3ddf227ec861816e014e3c2db946ccd11f1ed56a1fdf67c8ce7be1` | 74475976 |
| **Launcher Ownership Transfer** | To Timelock `0x00824e9c...` | `0x0f2b2b1a13e512400f91bb90bb5982aa00df6d9818f02f9e42220d9fcf138e4a` | 82942000 |
| **Reserve Manager (`SCRIT_RESERVE`)** | `0x0cc054ce72fc0a489732e20dd595de934be2e953` | `0xaff4d2d754ee09b1ccbedbd002d70d56714a9d0cea5f1a557858e91e738ef43f` | 74476099 |
| **Custodian Registry (`SCRIT_CUSTODIANS`)** | `0x4993478847d03e13d5eae930878ad428cf2b27f8` | `0x196bba8af8fd6f101655cfeb5113e08f8ccc6bdb3591532d032cb77e26338d36` | 74476001 |
| **Price Oracle Adapter (`SCRIT_PRICES`)** | `0x5341042250dcbc11a929581d22b7be30c14640df` | `0xe973ea649e8907c58a545e80b71f3b77524b8c16b5080cfc90ac08b5659b3738` | 74476034 |
| **KYC Registry (`SCRIT_KYC`)** | `0x1f1d055014348e60af47065d45247b2c1204c7e8` | `0xf08b4c22946407fe1c190fe8d84986ebde112eab884e980c4a4adf6635283910` | 74476059 |
| **Physical Lot Manager (`SCRIT_LOT_MANAGER`)** | `0x4f0332621e9a1f2d79dc3095b0cf82297a562a33` | `0x5cac7f4487e96c82a1fd6b987a3881eee810881996e6f0acd25a64820819801e` | 74476233 |
| **Physical Lot Token (`SCRIT_LOT_TOKEN`)** | `0x46b01dcdad1fb6dbd95bbd2e88f4f69064bd1bf1` | `0x035854d6b452471956f620ec847678fb2cbccbb9125930f316af508d863b9469` | 74476259 |
| **Lot Redemption Manager (`SCRIT_LOT_REDEMPTION`)**| `0x6809f71adc27a158a6ab4d74bd6a7ac228014827` | `0x841c6865def2d606444a82c2c394053ab9a38ae4ec99846aad75fa9de136aa98` | 74476285 |
| **Lot Marketplace (`SCRIT_LOT_MARKET`)** | `0xf8e56794c0ded1e01b8f973ff0f6d2f86f8e43e7` | `0x144f540d608bc6c3c3d82e5d674c74313044d52dafec33bf7e812bdfe0aa9c30` | 74476315 |
| **CREATE2 Deployer (`SCRIT_CREATE2_DEPLOYER`)**| `0xefcb390b33d5edc90f0bf1039f94e53fb18c7346` | `0xc24f29e9a90c56810a049755080604e1ffb27c7d444e2b2add64205bf7a7b96e` | 74476165 |

---

## 7. Security, Trust & Risk Controls

1. **Non-Custodial Architecture:**  
   The web application and API servers never hold private keys and never escrow funds. All swaps and liquidity operations are signed directly by the user's wallet via standard EVM JSON-RPC providers.
2. **Timelock Governance:**  
   Protocol upgrade powers, fee recipients, and launcher management are governed by `ScritTimelockController` (`0x00824e9c6075ff2ceb10009de7f170fc6721df1a`).
3. **Replay & Timestamp Protection:**  
   Attestations signed by custodians strictly enforce EIP-712 domain separation, unique batch UUIDs, sequential nonces, and a 7-day expiration horizon.
4. **Deterministic V4 Permissions:**  
   The `TradingTaxHook` address is mathematically bound to permission flags `0x2044` via CREATE2, preventing unauthorized hook manipulation.
