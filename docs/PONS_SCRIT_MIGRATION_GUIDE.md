# Panduan Migrasi sCRIT Pons (Opsi A: Uniswap V4 + 2.5% Hook Tax)

Dokumen ini adalah SOP resmi transisi token sCRIT ke token **sCRIT baru hasil launch di platform Pons**.

---

## 1. Ringkasan Arsitektur
- **Base Currency:** Digantikan dengan Contract Address (CA) sCRIT terbaru dari Pons.
- **Hook Tax (2.5%):** Tetap memotong 2.5% (75% dialirkan ke Cadangan Komoditas Emas/Perak/Lithium/Helium & 25% ke Operasional).
- **Auto-Launcher:** Kontrak `sCRITV4Launcher` baru dideploy untuk memfasilitasi pembuatan pair langsung dari halaman `/launch`.
- **Database & Data Historis:** Semua data token lama (seperti pilot `$PDMO`, `$CURUT`, dll) **tetap tersimpan dan tidak dihapus**.

---

## 2. Kontrak yang Dideploy Ulang ke Robinhood Mainnet
Hanya **2 smart contract** yang dideploy ulang:
1. **`TradingTaxHook.sol`**:
   - Di-mine secara instan menggunakan `CREATE2` (`ScritCreate2Deployer`) agar 14-bit terakhir beralamat `0x2044` (`beforeInitialize`, `afterSwap`, `afterSwapReturnDelta`).
   - Menerima CA sCRIT Pons sebagai parameter `scritToken`.
2. **`sCRITV4Launcher.sol`**:
   - Menghubungkan CA sCRIT Pons dengan `TradingTaxHook` yang baru.

*Kontrak lain seperti ReserveManager, CustodianRegistry, TimelockController, dan PriceOracleAdapter TIDAK PERLU dideploy ulang.*

---

## 3. Langkah Eksekusi (Begitu Token Pons Sudah Launch)

### Langkah 1: Checkout ke branch migrasi atau merge ke main
```bash
git checkout feat/pons-scrit-migration
# atau jika sudah siap merge ke main:
git checkout main
git merge feat/pons-scrit-migration
```

### Langkah 2: Jalankan Script Deploy Migrasi (Satu Perintah Otomatis)
Ganti `0x<CA_PONS>` dengan Contract Address sCRIT yang telah dilaunch di Pons:
```bash
# Uji coba simulasi (Dry Run):
node scripts/deploy-pons-pair.mjs --dry-run --token 0x<CA_PONS>

# Deploy resmi ke Robinhood Mainnet:
node scripts/deploy-pons-pair.mjs --mainnet --token 0x<CA_PONS>
```
Script di atas akan:
1. Menghitung dan menambang salt CREATE2 hook (< 1 detik).
2. Mendeploy `TradingTaxHook` baru ke mainnet via CREATE2.
3. Mendeploy `sCRITV4Launcher` baru ke mainnet.
4. Mentransfer ownership launcher ke Timelock.
5. Menyimpan output manifest ke `deployments/pons-migration-<timestamp>.json`.
6. Mencetak nilai `.env.local` yang baru.

### Langkah 3: Update `.env.local`
Perbarui 3 baris berikut di `.env.local`:
```env
NEXT_PUBLIC_SCRIT_MAINNET=0x<CA_PONS>
NEXT_PUBLIC_SCRIT_LAUNCHER_MAINNET=0x<LAUNCHER_BARU>
NEXT_PUBLIC_SCRIT_TAX_HOOK_MAINNET=0x<HOOK_BARU>
```

### Langkah 4: Verifikasi & Restart Server
Jalankan verifikasi automated test suite:
```bash
npx vitest run tests/pons-migration.test.ts
```
Lalu restart server Next.js:
```bash
npm run dev
```

Halaman `/swap` dan `/launch` sekarang 100% menggunakan token sCRIT baru dari Pons dengan alur, styling institusional, dan pemotongan hook tax 2.5% yang utuh!
