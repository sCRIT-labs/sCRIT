# Gap Analysis: Implementasi vs Dev Brief v3 (sCRIT)

**Tanggal:** 2026-09-28 · **Brief:** `devbriefsCRIT.md` v3.0 (2026-09-22) · **Kode:** `main` post-`22de3de`
**Status baca:** seluruh brief (679 baris) dibaca + seluruh kode diverifikasi langsung (bukan ringkasan).
**Legenda:** ✅ sesuai · ⚠️ sebagian · ❌ belum/tidak · 🔀 owner memutuskan beda (sadar, tercatat)

> Catatan terpenting: brief adalah *cetak biru + daftar keputusan yang masih terbuka*,
> bukan spek beku. Beberapa gap di bawah adalah keputusan sadar pemilik (dicatat di
> `docs/decisions.md`), bukan kelalaian. Bagian "Keputusan pemilik" di tiap seksi
> menandai mana yang mana.

---

## 0. Kondisi live saat dokumen ini ditulis (fakta on-chain)

| Fakta | Nilai |
|---|---|
| Chain | Robinhood mainnet 4663 |
| sCRIT (`ScritIndexToken`) | `0x56073943133c1c0678a753be9402b27d43cf1c22`, supply 1,1 |
| NAV on-chain | $1.332,36 (reserve $1.465,60 ÷ 1,1) — dari harga Au/Ag REAL × massa demo |
| Base pool `sCRIT/ETH` | `0xd029…`, hookless, posisi NFT #3370083 milik timelock |
| Project pool `PDMO/sCRIT` | `0x807c…`, hook 2.5%, 1 swap taxed terbukti (fee persis 75/25) |
| Rail B | 2 lot demo (Diamond + Au, masing-masing 100 unit), 1 ask live (10 unit @ 0,01 sCRIT) |
| Indexer | GitHub Actions tiap 10 mnt + Vercel Cron harian + (task laptop dihapus) |
| Harga Au/Ag | REAL via gold-api.com tiap 12 jam (GitHub Actions); 7 komoditas lain manual/demo |
| Frontend | `s-crit.vercel.app`, env mainnet, 36 vars |

---

## 1. Apa produk ini (§1)

| Brief | Implementasi | Status |
|---|---|---|
| Launchpad: semua token dipasangkan ke sCRIT | `sCRITV4Launcher` memaksa pair TOKEN/sCRIT, 1 pool per launch | ✅ |
| Core loop swap → tax → treasury → beli fisik → attestasi EIP-712 → reserve naik | tax + attestasi + mint-at-NAV jalan; **langkah "beli fisik" terjadi di luar kode** (tidak ada modul procurement/supplier) | ⚠️ |
| Menggantikan Artemis generik | Repo terpisah, nama Artemis dihapus dari permukaan publik | ✅ |
| Hapus klaim "non-custodial / no owner / no mint / 0% fee" | Copy dibersihkan; fee + role + mint terdokumentasi terbuka | ✅ |

**Keputusan pemilik:** model tetap pilot; klaim fisik tidak dibuat.

## 2. Dua rel + dua tier pool (§2)

| Brief | Implementasi | Status |
|---|---|---|
| Rail A index/AMM, pool proyek dipaksa ke sCRIT + tax hook | V4 launcher + `TradingTaxHook`, 1 pool per token | ✅ |
| Base market `sCRIT/ETH` TANPA pajak | Pool kanonis hookless, seed via `market:seed:v4` (eksplisit, tidak otomatis) | ✅ |
| Project pool `TOKEN/sCRIT` kena pajak | 2.5%, split 75/25, exact-in dari output / exact-output dari input | ✅ |
| `PoolFactory` hanya boleh 1 pool base + paksa pair sCRIT | Launcher membuat pool per token via V4 PM; tidak ada registry yang *mencegah* pool liar (V4 permissionless — brief sendiri mengakui ini) | ⚠️ |
| Rail B order book, 1 lot = 100 unit ERC-1155, mint setelah attestasi, burn saat redemption, KYC untuk tebus | `LotMarketplace` + `PhysicalLotManager` + `LotRedemptionManager` + `KycRegistry`, semua sesuai | ✅ |
| Mitigasi ETH-noise: NAV USD primer, market ETH sekunder, indikator premium/discount live | Halaman proof: NAV primer, market sekunder, premium live | ✅ |
| Komposisi chart per KELAS aset + tabel per komoditas (bukan 9 series) | Proof: tabel per komoditas; landing: bar per komoditas + legenda kelas | ⚠️ (landing masih per-komoditas, bukan agregat kelas) |

## 3. Token index + basket (§3)

| Brief | Implementasi | Status |
|---|---|---|
| ERC-20, basket fisik, NAV = reserve ÷ supply | `ScritIndexToken` ERC-20 + `ReserveManager` | ✅ |
| Supply tidak fixed, hanya via `ReserveManager` setelah attestasi | `MINTER_ROLE` hanya dipegang ReserveManager; mint lain mustahil tanpa ganti role | ✅ |
| 9 bobot starter (Au30 Ag5 Pt12 Pd8 Nd8 Dy12 Tb8 Sc7 Li10) sebagai TARGET | `lib/scrit-basket.ts` persis; UI selalu tulis "target, bukan bukti" | ✅ |
| Lithium: masalah 1,7 ton, gudang khusus, opsi cap/warrant/nickel-cobalt (§3.2) | Li tetap 10% sebagai target desain; belum ada keputusan cap/swap | ⚠️ (keputusan §16 #9 terbuka) |
| Redemption A/B/C — rekomendasi B, tanpa itu kata "backed" menyesatkan (§3.3) | **Opsi C: tanpa redemption, tanpa peg**; copy jujur ("not pegged, no redemption") | 🔀 (sadar; brief membolehkan C dengan copy jujur) |
| Diamond Rail B only + syarat GIA/IGI, Kimberley, inscribe, revaluasi (§3.4) | Diamond = index 9, bisa dicetak via lot; **verifikasi sertifikat GIA/Kimberley tidak ada di kode** (hash disimpan, isi tidak divalidasi) | ⚠️ |
| `RedemptionManager` diperluas ke basket sCRIT bila opsi A/B | Tidak ada; hanya lot Rail B | ❌ (konsekuensi opsi C) |
| `APRegistry` bila opsi B | Tidak ada; `/api/ap` hanya antrean diligence | ❌ (konsekuensi opsi C) |

## 4. Tier system (§4)

| Brief | Implementasi | Status |
|---|---|---|
| Tier dari data produksi tahunan (Standard ≥10kt, Rare 1–10kt, Ultra Rare <1kt) | `TIER_RULE` + tier per komoditas di `scrit-basket.ts`, konsisten dengan angka brief | ✅ |
| Setiap badge bawa tooltip sumber + threshold di 1 file config | Aturan di 1 file; tooltip sumber ada di sebagian komponen (AssayCards sebut USGS; tidak semua badge punya tooltip) | ⚠️ |
| Tanpa crate/loot-box/gambling mechanics | Tidak ada | ✅ |

## 5. Reserve mechanism (§5)

| Brief | Implementasi | Status |
|---|---|---|
| Tax → procurement terjadwal → attestasi EIP-712 → recognition; reserve TIDAK bergerak di langkah 1–2 | Kode: tax terpisah, mint hanya di `recordPurchase`; UI pisahkan "unspent treasury" vs reserve | ✅ |
| Multi-custodian scoped per komoditas sejak hari 1 (§5.2) | `CustodianRegistry` scopeMask per key; diverifikasi live (scope salah ditolak) | ✅ |
| Accrual: accretive vs mint-at-NAV, rekomendasi mint-at-NAV (§5.3) | **Mint-at-NAV** di kontrak + toggle simulasi di `ReserveSimulator` | ✅ (keputusan bisnis+legal tercatat) |
| Tanpa rebase (§5.4) | Tidak ada rebase; mint terkontrol | ✅ |

## 6. Arsitektur kontrak (§6)

| Kontrak brief | Implementasi | Status |
|---|---|---|
| `sCRITToken` | `ScritIndexToken` (ERC-20, MINTER=Reserve, pausable) | ✅ |
| `ReserveManager` | Verifikasi attestasi, holdings/kg, mint, snapshot NAV | ✅ |
| `CustodianRegistry` | Scope per key + rotasi | ✅ |
| `AttestationVerifier` | Melebur jadi fungsi internal ReserveManager/PhysicalLotManager (bukan kontrak terpisah) | ⚠️ (fungsi ada, bentuk beda) |
| `IssuerRegistry` | Allowlist di launcher + registry DB (bukan kontrak registry terpisah) | ⚠️ (fungsi ada, bentuk beda) |
| `PoolFactory` | V4 permissionless + launcher (tidak ada factory custom) | ⚠️ (adaptasi V4) |
| `TradingTaxHook` | Sesuai, hanya project pool | ✅ |
| `PhysicalLotToken` | ERC-1155, 100/lot, lock/burn | ✅ |
| `RedemptionManager` | State machine lot; belum basket sCRIT (opsi C) | ⚠️ |
| `APRegistry` | Tidak ada (opsi C) | ❌ |
| `PriceOracleAdapter` | Signed store + staleness + nonce; fallback feed dan circuit breaker tidak ada | ⚠️ |
| Oracle uneven (§6.1): label sumber PER LINE ITEM | UI proof + API simpan source per komoditas; on-chain `sourceHash` per update | ✅ |
| Access control: multisig 2-of-3 min + timelock (§6.2) | Timelock ada, delay 0, proposer 1 EOA (bukan multisig) | 🔀 (sadar; pilot) |
| Events §6.3 | Tercover semua kecuali `TreasuryDeployed` (tak ada eventnya — treasury hanya terima transfer/fee) dan `RedeemFulfilled` (terlipat dalam `RedeemStatusChanged`) | ⚠️ |
| Risk areas §6.4 (hook/MEV, oracle, key compromise, permissioned transfer) | Slippage guard ada; staleness check ada; rotasi key ada; transfer permissioned tidak ada (flag tidak dibangun) | ⚠️ |
| Audit independen sebelum mainnet (§6.5) | Hanya self-audit internal | ❌ (di-waive pemilik) |

## 7. Frontend (§7)

| Brief | Implementasi | Status |
|---|---|---|
| Index dashboard (NAV USD primer, premium live, reserve, supply, treasury, komposisi, chart growth, log) | Proof + landing: semua ada KECUALI chart pertumbuhan reserve | ⚠️ |
| Launch Rail A (validasi, preview ekonomi, pair dikunci, disclosure tax) | Lengkap termasuk 2-step Validate→Strike | ✅ |
| Vault Lots (kartu lot, cert, kustodian, order book, order entry) | Lengkap | ✅ |
| Proof of Reserve (holdings vs supply, cert IPFS, kustodian per kelas, audit, asuransi, sumber harga per baris) | Ada holdings, sumber per baris, kustodian; **tanpa IPFS, tanpa audit, tanpa polis asuransi** (tidak ada yang bisa dilink) | ⚠️ |
| Issuer dashboard (KYB, form, attestasi, antrean redemption) | Ada intake + status + link; tanpa dokumen KYB (file upload tak ada) | ⚠️ |
| Redemption flow (KYC gate, tracking) | State machine on-chain; UI lots sebut alur; tanpa provider KYC/kurir | ⚠️ |
| Transparency (disclosure + evidence table + status uranium) | Evidence section + uranium "not available" | ✅ |
| Hapus warisan Artemis (§7.2: supply fixed, zero toll, no owner, terminal palsu, carousel ganda, footer placeholder, persona, klaim chain, string Artemis) | Mayoritas dibersihkan; **komponen legacy mati (AssayCards/Hero/ReserveSimulator/dll) masih ada di repo tak terpakai** | ⚠️ |
| AI Copilot jadi asisten form, output draft direview (§7.3) | Copilot = Q&A explainer (bukan asisten form, tanpa draft); tidak auto-submit apapun | ⚠️ (interpretasi beda; aman) |
| Testnet/mainnet tak terbedakan secara visual | Pill network + banner + label chain di semua halaman | ✅ |
| Wallet: MetaMask, drop Solana/Phantom MVP (§7.4) | 6 wallet EVM (termasuk Phantom-EVM), tanpa Solana | ✅ |

## 8. Backend/ops (§8)

| Brief | Implementasi | Status |
|---|---|---|
| DB issuers/KYB/custodian/attestasi/purchase/redemption/audit | Ada kecuali dokumen KYB, purchase batch (hanya batch ID), fulfillment fisik | ⚠️ |
| IPFS cert + backup terenkripsi | Tidak ada (hash saja) | ❌ |
| Indexer (The Graph/custom) | Custom restartable + cron GHA 10 mnt + Vercel harian | ✅ |
| Price service + registry sumber per harga | Ada (DB + on-chain sourceHash + umur) | ✅ |
| KYC/KYB provider | Tidak tersambung (registry demo) | ❌ |
| Notifikasi email/webhook | Tidak ada | ❌ |
| Admin panel (review issuer, submit attestasi, treasury) | /admin: harga, kustodian, issuer, AP; submit attestasi via script CLI | ⚠️ |
| Scheduled job NAV snapshot + rekonsiliasi | `snapshotNav()` callable siapa saja; tidak ada scheduler yang memanggilnya rutin | ⚠️ |

## 9. Bisnis & fee (§9)

| Brief | Implementasi | Status |
|---|---|---|
| Trading tax 1–5% (ref 2.5%), split 75/25 | 2.5% + 75/25 on-chain, tampil sebelum swap | ✅ (ref brief diadopsi final) |
| Issuance fee Rail B | 0% (tidak dipungut) | 🔀 (belum diputuskan) |
| Redemption fee Rail B | 0% (tidak dipungut) | 🔀 (belum diputuskan) |
| Fee tampil sebelum sign; split dipublikasi | Keduanya di UI | ✅ |
| Biaya multi-custodian dimodelkan sebelum split final | Belum dimodelkan (belum ada kustodian beneran) | ❌ |

## 10. Copy rules (§10)

| Brief | Status |
|---|---|
| Larangan: non-custodial/no-role/no-mint, "rare earth" untuk Li/U/diamond/emas, "backed 1:1" Rail A, "verified/audited" tanpa link, janji growth, "backed" tanpa redemption, hitungan fitur fiktif | ✅ dipatuhi di seluruh UI (grep bersih: tidak ada klaim backing/peg) |
| Disclosure Rail A bukan klaim komoditas — DI LAYAR LAUNCH, bukan cuma terms | ✅ ada di launch + proof berulang |
| Wording pengganti + link bukti | ✅ (link yang belum ada tidak dipasang) |

## 11. Compliance gates (§11) — SEMUA 🔀 (di-waive pemilik, tercatat)

Opini legal (OJK/Bappebti), kustodian per kelas, supplier + Kimberley/conflict-minerals/export-control,
dealer registration/AML, KYB/KYC provider, ToS/Risk/Privacy (ADA — 4 dok legal live),
audit kontrak, audit fisik pertama. **Yang ada: 4 dokumen legal. Sisanya tidak ada.**

## 12. Uranium (§12): ✅ patuh penuh
Tidak ada kode, tidak ada bobot, hanya label "unavailable — licensing required" (Rail B Diamond-only). Tidak pernah disebut "coming soon".

## 13. Prototype handoff (§13)

| Brief | Status |
|---|---|
| NAV/reserve/supply/treasury live dari holdings | ✅ |
| Simulasi siklus tax → split → beli → attestasi → chart | ✅ (`ReserveSimulator` + toggle mint/accretive) |
| Toggle accretive vs mint-at-NAV | ✅ |
| Price shock slider | ✅ |
| Komposisi per kelas + tabel per komoditas | ⚠️ (per-komoditas dominan) |
| Launch form + preview, pair dikunci | ✅ |
| Order book + diamond lot | ✅ |
| Tier dari data produksi | ✅ |
| Uranium gated | ✅ |
| Light/dark + responsif | ⚠️ (tema gelap dominan; light terbatas) |
| Mock diganti: harga indikatif→oracle (label per baris) | ✅ |
| Nama/sertifikat fiktif | ⚠️ (masih demo, TAPI dilabeli demo — sesuai aturan brief untuk pilot) |
| Purchase log dari event chain | ✅ (indexer) |
| 5 warisan: reserve-hanya-di-attestasi, evidence table, tier tooltip, banner simulasi, tonase lithium | ⚠️ (4/5; tier tooltip tidak di semua badge; tonase Li tampil implisit) |

## 14. Phasing (§14): posisi sekarang

- **Phase 0** (prasyarat): basket OK; kustodian ❌; harga rare-earth ❌; legal ❌; akrual ✅ (mint-at-NAV); redemption ✅ (opsi C).
- **Phase 1** (testnet MVP): kontrak ✅; base pool + 1 demo token ✅ (di mainnet malah); Rail B 2 lot ✅; label testnet/mainnet ✅.
- **Phase 2** (pilot mainnet terbatas): basket menyempit ke yang terkontrak ❌ (masih 9 target tanpa kontrak); 1 kustodian/kelas ❌; audit ❌; **proyek nyata berjalan di depan fase ini atas keputusan pemilik**.
- **Phase 3** (ekspansi): belum mulai.

## 15. Definition of Done (§15) — skor: 4/13 penuh, 5/13 sebagian

- [x] Audit kontrak lolos + publik — ❌ (self-audit; di-waive)
- [x] No mint tanpa attestasi valid + scoped (terbukti test) — ✅ (test + verifikasi live)
- [x] Scope lintas kelas ditolak (terbukti test) — ✅
- [x] Reserve hanya bergerak di attestasi — ✅
- [x] Tax on-chain + split publik — ✅
- [x] Proof of Reserve dari dokumen asli + sumber per baris — ⚠️ (struktur ada, dokumen asli tidak ada)
- [x] Redemption Rail B end-to-end barang fisik — ❌ (mesin ada, barang tidak)
- [x] Copy terlarang bersih — ✅
- [x] Terms/Risk/Privacy — ✅
- [x] Testnet/mainnet tak tertukar — ✅
- [x] Opini legal + go/no-go — ❌ (di-waive)
- [x] Uranium hanya label unavailable — ✅
- [x] Model redemption diimplementasi + copy jujur — ✅ (opsi C + copy)

## 16. Open decisions (§16) — status final

| # | Keputusan | Status |
|---|---|---|
| 1 | Basket final | 9 starter = final sebagai TARGET; isi menyusul |
| 2 | Accretive vs mint-at-NAV | **Mint-at-NAV final** |
| 3 | Tax rate + split | **2.5% + 75/25 final** (diadopsi dari referensi brief) |
| 4 | Kustodian per kelas | ❌ terbuka (1 demo key) |
| 5 | Rail A publik/gated | Gated allowlist + bot auto-approve (≥0.001 sCRIT) — hibrida, final untuk pilot |
| 6 | Target chain EVM-only | ✅ final |
| 7 | Yurisdiksi + opini legal | ❌ terbuka (di-waive) |
| 8 | Scope KYC | Issuer intake + KYC registry demo; provider belum dipilih |
| 9 | Lithium: keep/cap/swap | ❌ terbuka (tetap 10% target) |
| 10 | Sumber harga rare-earth | ❌ terbuka (manual/demo; Au/Ag via feed gratis) |
| 11 | Dealer/AML registration | ❌ terbuka |
| 12 | **Redemption model** | **Opsi C final (none)** |
| 13 | Counterparty AP | N/A (konsekuensi C) |

---

## Lampiran A — KENAPA: alasan tiap gap & keputusan

### A.1 Kenapa opsi C (tanpa redemption)?
Tiga alasan berlapis. **Praktis:** opsi A (tebus fisik ritel) butuh KYC, logistik, minimum lot, paperwork ekspor per komoditas — tim 1 orang tidak bisa jalanin. **Waktu:** opsi B (authorised participant) butuh tanda tangan 2–3 counterparty institusional + terms + registry basket — tidak bisa signed dalam timeframe pilot. **Kejujuran:** karena A/B mustahil sekarang, satu-satunya pilihan tidak-menyesatkan adalah C + copy jujur ("tidak di-peg, tidak bisa ditebus"). Brief sendiri membolehkan C asal copynya jujur (§3.3: *"the honest description is..."*). Konsekuensi yang diterima: kata "backed" tidak boleh dipakai, indikator premium/discount jadi wajib (sudah dipasang live).

### A.2 Kenapa mint-at-NAV, bukan accretive?
Dua alasan. **Kejujuran ekonomi:** accretive bikin NAV naik tiap ada pembelian ("beli lalu harga naik") — bentuknya seperti janji profit, jelek secara regulasi (bisa dibaca collective investment scheme). Mint-at-NAV bikin NAV flat — berperilaku seperti unit index beneran. **Teknis:** prototype dua-duanya jalan dengan toggle; bedanya kelihatan langsung. Ini keputusan bisnis+legal, dan pemilik memilih yang lebih defensif.

### A.3 Kenapa tax 2.5% + split 75/25?
Bukan angka sakti — ini angka referensi brief (§9: "Reference: Factory New uses 2.5%. Typical range 1–5%") yang diadopsi jadi final karena: (a) ada preseden berjalan (Factory New membuktikan 2.5% tidak membunuh volume), (b) split 75/25 condong ke reserve (menjual cerita "cadangan tumbuh"), (c) butuh ANGKA untuk dikode, dan tidak ada data sendiri untuk mengoptimasi. Kalau volume protes, angka ini bisa diubah — tapi butuh redeploy hook (immutable), jadi dipikirkan matang sebelum mainnet. Itu sebabnya hook di-freeze di 250/7500.

### A.4 Kenapa hook cuma di project pool, base pool untaxed?
Karena pajak di base pool = pajak untuk sekadar MEMEGANG sCRIT (masuk dan keluar posisi index). Itu menghukum holder index dan mencekik likuiditas yang justru dibutuhkan pool proyek. Pajak hanya punya makna ekonomi di pool proyek (tempat "kegiatan" terjadi). Bonus teknis: base pool hookless juga lebih murah gas dan tidak bergantung ke hook custom.

### A.5 Kenapa V4 untuk mainnet, V3 cuma testnet?
V3 tidak bisa memotong fee swap dengan aman (posisinya tidak punya hook point). V4 punya `afterSwap` hook — satu-satunya cara on-chain untuk skim 2.5% yang brief minta. Testnet terlanjur V3 (dulu belum ada keputusan fee), jadi testnet = rehearsal tanpa pajak, mainnet = V4 berpajak. Labelnya dibedakan eksplisit di UI biar tidak ada yang ketukar.

### A.6 Kenapa 1 kunci untuk semua peran (bukan multisig)?
Murni kecepatan pilot. Multisig 2-of-3 butuh 2 manusia tepercaya + koordinasi tiap aksi admin (custodian, issuer, harga, attestasi, deploy) — dalam fase di mana 1 orang mengerjakan semuanya dalam hitungan hari, multisig = macet total. Timelock delay 0 pun alasannya sama: delay 48 jam (awal testnet) bikin tiap iterasi nunggu 2 hari; di-fase pilot itu bunuh diri. Harga yang dibayar: key bocor = semuanya hilang. Pemilik tahu dan menerima (tercatat §4 decisions). Pemicu naik kelas yang disepakati: total nilai terkunci bikin keringetan.

### A.7 Kenapa legal/audit/kustodian di-waive?
Perintah eksplisit pemilik (sesi 25 Sep): timeline marketing meme-coin Robinhood, "jangan terlalu serius soal legal". Bukan karena tidak penting — brief menempatkannya sebagai HARD GATE (§11) dan audit setuju itu benar. Alasan mencatat, bukan menghapus: supaya kalau suatu hari ada regulator/investor nanya, jawabannya "kami tahu dan menunda sadar" bukan "kami tidak tahu". Semua waiver tercatat di `docs/decisions.md`, bukan disembunyikan.

### A.8 Kenapa timelock delay 0, bukan 48 jam?
Deployment testnet pertama pakai 48 jam (standar keamanan). Praktiknya: tiap setup demo (custodian, issuer) antre 2 hari → pilot tidak bisa bergerak. Karena timelock ini dipegang 1 EOA juga (bukan multisig), delay 48 jam cuma menambah gesekan tanpa menambah keamanan nyata (penyerang dengan key yang sama tinggal tunggu). Jadi delay 0 = jujur terhadap threat model yang ada. Kalau multisig datang nanti, delay harus naik bareng.

### A.9 Kenapa gated + bot auto-approve (bukan bebas, bukan manual)?
Tiga opsi dipertimbangkan. **Bebas total** (kayak pump.fun): siapa saja launch, spam/scam numpang likuiditas sCRIT, holder sCRIT yang rugi. **Manual**: sudah terbukti macet (admin = 1 orang yang sama). **Bot balance-gated**: syaratnya (pegang ≥0.001 sCRIT) bisa dicek KODE tanpa manusia, dan syaratnya punya gigi ekonomi — mau sCRIT harus beli lewat pool kena pajak, jadi spam = bayar kas lebih dulu. Yang dikorbankan: tidak ada cek identitas/kualitas (spammer berduit tetap lolos). Itu harga "full otomatis" yang pemilik setujui.

### A.10 Kenapa project-index, bukan token PONS?
Karena keduanya tidak terhubung secara teknis SAMA SEKALI: launcher repo ini membuat token index sendiri saat deploy; token PONS punya alamat berbeda yang dibuat tim lain. "Menghubungkan" berarti merancang ulang deployment + launcher untuk menerima alamat eksternal — tidak pernah didesain, tidak pernah diminta. Asumsi diam-diam terhubung = bug paling berbahaya (halaman proof bisa terbaca mendukung koin yang tidak dikelolanya). Jadi diputus: project-index final, koin PONS = entitas asing.

### A.11 Kenapa lithium tetap 10% padahal brief curiga?
Karena §16 #9 menuntut keputusan "commodities lead" (figur yang tidak ada di tim). Tanpa pemilik keputusan itu, mengubah bobot = mengarang. 10% dipertahankan sebagai TARGET DESAIN (bukan klaim isi), persis seperti brief meminta target dikonfirmasi sebelum coding — dan belum ada yang mengonfirmasi. Status jujurnya: terbuka, bukan selesai.

### A.12 Kenapa diamond Rail B only + uranium haram?
Diamond: tiap batu unik (4C subjektif), spread lebar, tidak ada spot price transparan → tidak bisa masuk index fungible, TAPI cocok untuk lot satuan (mahal/gram, mudah diasuransikan, bisa dinilai independen). Uranium: bukan komoditas gudang biasa — butuh lisensi nuklir (BAPETEN), fasilitas berlisensi, safeguards IAEA, izin impor/ekspor bilateral. Butuh tahun + modal gede. Satu-satunya penyebutan yang aman = label "not available". Keduanya logika brief, bukan pilihan.

### A.13 Kenapa tidak ada IPFS / notifikasi / KYC provider / snapshot scheduler?
Semuanya butuh PIHAK KETIGA yang beroperasi (IPFS pinning, SMTP/webhook, Sumsub/Persona, cron yang manggil). Pilot belum punya dokumen asli untuk di-pin, belum ada user untuk di-email, belum ada provider KYC. Membangun integrasinya tanpa mitranya = kode mati. Yang dibangun hanya interface-nya (registry, state machine, fungsi snapshot callable). Ini utang arsitektur yang benar, bukan kelalaian.

### A.14 Kenapa `TreasuryDeployed` tidak ada event-nya?
Karena tidak ada aksi "deploy treasury" di kode — treasury hanya MENERIMA (fee hook via `take`, mint via `mint`). Tidak ada fungsi yang memindahkan dana treasury keluar (itu EOA biasa). Event yang tidak ada aksinya = noise. Pergerakan kas tetap terlacak: `TaxCollected` + `Minted` + receipt transfer.

### A.15 Kenapa tidak ada pool USDC?
Logika brief sendiri (§2.2): ETH = likuiditas lebih dalam, USDC = lebih akurat. Dipilih ETH untuk kedalaman, dengan mitigasi wajib (NAV USD primer + indikator premium). USDC bisa ditambah nanti dan otomatis jadi market referensi.

### A.16 Kenapa seed pool manual, tidak otomatis saat deploy?
Sengaja. Seed butuh keputusan ekonomi manusia (berapa sCRIT vs ETH = menentukan harga awal) + wallet yang SUDAH pegang inventory-nya. Mengotomasi = deploy script yang nebak harga + mindah dana — berbahaya dan tidak reversible. Script `market:seed:v4` memaksa flag eksplisit + cek saldo + cek bounds. Keputusan desain yang benar.

### A.17 Kenapa NAV $1.332 padahal market $4,51 (premium absurd)?
Bukan bug — konsekuensi aritmetika yang jujur: harga Au REAL ($133rb/kg) × massa DEMO (0,011 kg) = reserve $1.465 ÷ supply 1,1. Tiap input dilabeli (harga: live + umur; massa: demo). Alternatifnya (harga palsu $100 biar NAV cantik $1) justru manipulasi tampilan. Keabsurdan angka adalah FITUR transparansi: memaksa pembaca sadar massanya demo.

### A.18 Kenapa harga refresh 12 jam, indexer 10 menit?
Batas staleness: harga basi >24 jam (off-chain) / 1 hari (on-chain). 12 jam = 2× margin aman dengan 2× publish/hari (hemat gas). Indexer 10 menit = mendekati real-time untuk event baru tanpa membanjiri RPC gratis. Vercel daily + task laptop = backup berlapis karena Hobby limit.

### A.19 Kenapa private key tidak boleh naik ke server/CI?
Karena server/CI bisa dibaca banyak pihak (log, dashboard, backup, tim Vercel/GitHub). Key yang naik = key yang dianggap bocor. Itu sebabnya: harga (butuh key) tetap dari laptop, indexer (tanpa key) boleh di cloud. Satu-satunya pengecualian sadar: 2 key low-privilege (price-oracle + admin API, bukan key dana) di GitHub Secrets terenkripsi — dan itu pun dicatat sebagai trade-off, bukan best practice.

### A.20 Kenapa bug NAV/holdings/payload/copilot/seed bisa lolos?
Semuanya lolos karena TIDAK ADA TEST yang menyentuh jalurnya: event value tidak di-assert, hook React tidak di-test (env node), payload DB tidak difuzz string-vs-object, halaman tidak di-render di CI, seed script tidak pernah dijalankan sebelum mainnet (dead code path!), quoter V4 revert-by-design tidak diketahui. Pelajaran yang dicatat: setiap jalur on-chain + render harus punya minimal 1 test integrasi; script operasional harus dry-run sebelum hari-H. Kelimanya sekarang punya regression test, kecuali quoter (dokumentasi) dan seed tuple (terbukti live).

### A.21 Kenapa komponen legacy mati masih di repo?
Kecepatan + takut menghapus (takut dipakai). Tidak dirender di mana pun ( diverifikasi via grep import), jadi risikonya nol selain membingungkan pembaca baru. Seharusnya dihapus; belum sempat. Dicatat sebagai utang kebersihan, bukan utang fungsi. (Catatan: `AssayCards` bahkan punya bug mapping nama untuk 6 komoditas — tidak masalah karena tidak dirender, tapi alasan tambahan untuk menghapus, bukan memperbaiki.)

## Lampiran B — Isi `docs/decisions.md` dijabarkan (per keputusan + status hari ini)

> `decisions.md` adalah buku harian keputusan (per 25–28 Sep 2026). Sebagian entrinya
> sudah basi karena keadaan berubah — kolom "Status hari ini" menandainya jujur.

### B.0 Penyelarasan brief (kepala file)
**Isi:** Perintah pemilik: ikuti Brief v3; legal + bukti aset = kerjaan eksternal, bukan blocker kode. Ditetapkan: basket 9 target, diamond Rail B, uranium out, fee 0 issuance + 2.5% swap 75/25, base untaxed, V4 mainnet (V3 cuma testnet), floating + no redemption, mint-at-NAV, timelock 0, namespace env terpisah, token model project-index.
**Kenapa ditulis:** mengunci arah setelah fase tarik-menarik (pilot sempit vs brief penuh) supaya engineering tidak menebak-nebak.
**Status hari ini:** ✅ masih berlaku penuh.

### B.10 Issuance v2 + Rail B → testnet dulu
**Isi:** Kontrak v2 non-upgradeable (mint-at-NAV, 100 fraksi/lot, limit book sCRIT, redemption KYC-gated), rehearse testnet dulu; bootstrap $1/token untuk batch pertama.
**Kenapa:** menutup gap arsitektur tanpa mengklaim hal yang belum ada (reserve fisik, peg, audit, legal).
**Status hari ini:** ⚠️ sebagian basi — stack yang sama SUDAH deploy mainnet 28 Sep (bukan testnet-only lagi).

### B.11 Scope pilot sempit (Au/Ag/Pt 60/25/15, tax 0%)
**Isi:** Keputusan lama yang sengaja menyempitkan pilot.
**Status hari ini:** ❌ SUPERSEDED eksplisit oleh B.0 (ditulis di file-nya sendiri) — jangan dipakai sebagai acuan.

### B.12 ERC-20 OZ + V3 NFT testnet
**Isi:** Token pakai OZ (bukan hand-written), Rail A V3 + NFT posisi; compiler tetap 0.8.37/Shanghai karena OZ 5.5 butuh Cancun (MCOPY) yang belum terkonfirmasi di testnet.
**Kenapa:** V3 NFT memberi creator jalur ownership standar; pin versi \(bukan latest\) karena kompatibilitas didahulukan dari kebaruan.
**Status hari ini:** ✅ berlaku (dengan tambahan: mainnet memakai V4, bukan V3).

### B.13 Deploy mainnet + routing app
**Isi:** `--mainnet` eksplisit dengan cek yang sama seperti testnet; manifest incremental; app pilih 1 set alamat via `CHAIN_ID`; testnet tidak pernah jadi fallback.
**Kenapa:** mencegah kecelakaan klasik — UI mainnet baca alamat testnet.
**Status hari ini:** ✅ berlaku dan terbukti (deploy + manifest + app mainnet jalan).

### B.4 Tanpa issuance fee Rail A
**Isi:** pungutan 1% frontend-only dihapus karena tidak dienforce kontrak dan treasury memercayai browser.
**Kenapa:** fee yang tidak ditegakkan kode = pajak sukarela = tidak jujur disebut fee. Dihapus sampai ada desain on-chain-nya.
**Status hari ini:** ✅ berlaku (Rail A 0 issuance; yang hidup hanya swap tax V4).

### B.5 DB Kentir namespace `scrit_*`
**Isi:** pakai koneksi Kentir, semua tabel diawali `scrit_*`, tanpa fallback memori, `/api/health` tanpa bocorin detail koneksi.
**Kenapa:** numpang infra yang ada tanpa tabrakan nama tabel; fail-closed lebih jujur daripada data palsu saat DB mati.
**Status hari ini:** ✅ berlaku.

### B.6 Harga kosong sampai ada sumbernya
**Isi:** tanpa seed sintetis; admin wajib isi source + angka positif; basi >24 jam.
**Kenapa:** harga contoh kelihatan seperti data live dan bisa menggelembungkan NAV.
**Status hari ini:** ⚠️ berevolusi — sekarang ada 3 lapis: Au/Ag REAL via feed gratis (otomatis 12 jam), 7 lain manual/demo berlabel, off-chain + on-chain terpisah. Prinsipnya sama (sumber wajib), implementasinya maju.

### B.7 Jangan pura-pura Rail A = brief (fixed-supply era)
**Isi:** keputusan era token fixed-supply: jangan klaim mint-at-NAV/cadangan on-chain/redemption.
**Status hari ini:** ❌ kedaluwarsa — v2 (mint-at-NAV + reserve manager) sudah deploy dan terbukti. Entrinya arsip sejarah.

### B.8 Approval ganda (service + allowlist)
**Isi:** approval DB tidak otomatis berarti izin on-chain; allowlist menutup bypass pemanggilan langsung.
**Kenapa:** UI-only check bisa dilewati siapa saja yang panggil kontrak langsung.
**Status hari ini:** ✅ berlaku, DITAMBAH bot auto-approve (§6b) — gerbangnya tetap ganda, yang mengisi bot bukan manusia.

### B.9 Perimeter regulasi Indonesia
**Isi:** riset POJK 27/2024 + 23/2025 (OJK ambil alih dari Bappebti); larangan klaim "diatur OJK/patuh"; wajib opini counsel sebelum distribusi publik.
**Kenapa ditulis sedetail itu:** satu-satunya bagian yang memakai sumber hukum primer (3 link OJK) — agar tidak ada yang mengira riset 5 menit.
**Status hari ini:** ✅ berlaku, belum ada opini counsel (di-waive).

### B.1 Redemption opsi C, roadmap B
**Isi:** tanpa redemption/peg; premium band ±10/±25% ada sebagai aturan tapi TIDAK ditampilkan live (dulu belum ada sumber harga); AP butuh 2–3 counterparty + terms + registry.
**Status hari ini:** ⚠️ setengah basi — premium/discount SEKARANG tampil live (pool + NAV mainnet ada). Aturannya sama, tampilannya sudah melebihi dokumen.

### B.2 Satu demo key, scope sejak hari 1
**Isi:** 1 EOA scope Au/Ag/Pt; endpoint tolak key asing/out-of-scope (terbukti test).
**Kenapa:** scoping yang dipasang belakangan itu menyakitkan (brief §5.2); bentuk enforcement dikirim dulu walau isinya 1 key.
**Status hari ini:** ✅ berlaku; scope di mainnet diperluas ke Diamond (mask 519) untuk lot demo — tercatat di §5 decisions.

### B.3 Lithium 0% untuk pilot
**Isi:** `weightBps: 0` — bukan cap/warrant/swap; alasan verbatim brief (1,7 ton, higroskopis, gudang khusus, volatil, feed tipis).
**Status hari ini:** 🔀 DIVERGEN — kode sekarang (`scrit-basket.ts`) menaruh Li 10% sebagai target desain, BUKAN 0%. Artinya keputusan B.3 sudah digeser oleh B.0 (basket 9 penuh). Dokumen decisions belum merapikan kontradiksi ini — **ini inkonsistensi dokumentasi yang harus dipilih salah satu.** (Rekomendasi: B.0 menang karena itulah yang jalan di kode + UI.)

### B.4 Model token mainnet
**Isi:** `ScritIndexToken` milik proyek; deploy cetak fresh; testnet tidak dipakai ulang; `MAINNET_DEPLOYMENT_TOKEN_MODEL=project-index`; preflight V3/V4 lolos; rehearsal fork; saldo 0.00031 (angka lama).
**Status hari ini:** ✅ terealisasi penuh — deploy 28 Sep sukses, saldo sekarang ~0.0008 setelah belanja gas. Angka saldo di entry ini basi.

### B.5–6b–6 (sudah dibahas di badan dokumen)
Loop pilot mainnet (§5), bot auto-approve (§6b), runbook timelock (§6): ✅ semuanya live dan terverifikasi, detail di §5/§16 badan dokumen ini.

## Kesimpulan 1 paragraf

Mesin brief ~90% hidup (kontrak, pajak, pool, indexer, UI, copy rules, uranium gate);
yang 10% mati adalah semua yang butuh dunia fisik/lembaga (logam, kustodian kontrak,
harga rare-earth, audit, legal, KYC provider, IPFS, notifikasi, snapshot terjadwal);
pemilik secara sadar memajukan mainnet tanpa Phase-0/2 lengkap dan mengganti 4 keputusan
jadi final versi pilot (C, mint-at-NAV, 2.5%/75-25, EVM-only, gated+bot). Dokumen ini
adalah catatannya — bukan pembenarannya.
