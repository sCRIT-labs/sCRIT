import postgres from "postgres";
import { readFileSync, existsSync } from "node:fs";
import { keccak256, toBytes } from "viem";

const env = {};
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match) env[match[1]] = match[2].replace(/^"|"$|^'|'$/g, "").trim();
  }
}

const dbUrl = env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}

const sql = postgres(dbUrl, { max: 2, connect_timeout: 15, prepare: false, ssl: "require" });

// Target demo portfolio with realistic market prices and proportional masses
const SEED_DATA = [
  {
    commodity: "Au",
    massKg: "0.500000000000",
    priceUsdPerKg: 134608.74,
    priceSource: "gold-api.com free quote (Au/Ag spot; not an LBMA fix or audit)",
    grade: "LBMA Good Delivery, 999.9",
    vault: "ZURICH-FREEPORT-VAULT-01",
    cert: "LBMA-AU-9999-CH-2026-8812",
  },
  {
    commodity: "Ag",
    massKg: "8.000000000000",
    priceUsdPerKg: 1972.19,
    priceSource: "gold-api.com free quote (Au/Ag spot; not an LBMA fix or audit)",
    grade: "999 bars",
    vault: "ZURICH-FREEPORT-VAULT-01",
    cert: "LBMA-AG-9990-CH-2026-4409",
  },
  {
    commodity: "Dy",
    massKg: "200.000000000000",
    priceUsdPerKg: 420.00,
    priceSource: "SMM / Asian Metal index report (indicative pilot quote)",
    grade: "4N metal (99.99% purity)",
    vault: "GENEVA-METALLURGICAL-V02",
    cert: "SGS-ASSAY-DY-4N-2026-0922",
  },
  {
    commodity: "Tb",
    massKg: "40.000000000000",
    priceUsdPerKg: 1250.00,
    priceSource: "SMM / Argus Media REE report (indicative pilot quote)",
    grade: "4N oxide (99.99% purity)",
    vault: "GENEVA-METALLURGICAL-V02",
    cert: "SGS-ASSAY-TB-4N-2026-1104",
  },
  {
    commodity: "Nd",
    massKg: "350.000000000000",
    priceUsdPerKg: 95.00,
    priceSource: "SMM Neodymium Metal Spot (indicative pilot quote)",
    grade: "3N5 metal (99.5% purity)",
    vault: "SINGAPORE-LE-FREEPORT-D3",
    cert: "ALEX-STEWART-ND-3N5-2026-302",
  },
  {
    commodity: "Sc",
    massKg: "5.000000000000",
    priceUsdPerKg: 3500.00,
    priceSource: "USGS / Asian Metal Scandium Oxide (indicative pilot quote)",
    grade: "4N oxide (99.99% purity)",
    vault: "SINGAPORE-LE-FREEPORT-D3",
    cert: "ALEX-STEWART-SC-4N-2026-019",
  },
  {
    commodity: "Pt",
    massKg: "1.000000000000",
    priceUsdPerKg: 31500.00,
    priceSource: "LPPM / Johnson Matthey spot fix (indicative pilot quote)",
    grade: "9995 sponge / ingot",
    vault: "ZURICH-FREEPORT-VAULT-01",
    cert: "LPPM-ASSAY-PT-9995-2026-773",
  },
  {
    commodity: "Pd",
    massKg: "0.500000000000",
    priceUsdPerKg: 32000.00,
    priceSource: "LPPM / Johnson Matthey spot fix (indicative pilot quote)",
    grade: "9995 sponge",
    vault: "ZURICH-FREEPORT-VAULT-01",
    cert: "LPPM-ASSAY-PD-9995-2026-401",
  },
  {
    commodity: "Li",
    massKg: "900.000000000000",
    priceUsdPerKg: 18.00,
    priceSource: "Fastmarkets Battery Raw Materials (indicative Li2CO3 quote)",
    grade: "Li₂CO₃, battery grade 99.5%",
    vault: "ROTTERDAM-CHEMICAL-CUSTODY-R1",
    cert: "INTERTEK-LI2CO3-BG-2026-9051",
  },
];

const CUSTODIAN_ADDRESS = "0xcdbdc82a021071ee445d9f897433a7e4b4eafd8d";
const CHAIN_ID = 4663;

async function seed() {
  console.log("Starting pilot reserves end-to-end seeding for chain", CHAIN_ID);

  for (const item of SEED_DATA) {
    // 1. Update / Insert Price
    await sql`
      insert into scrit_prices (commodity, usd_per_kg, source, updated_at, updated_by)
      values (${item.commodity}, ${item.priceUsdPerKg}, ${item.priceSource}, now(), 'pilot_seed')
      on conflict (commodity) do update
      set usd_per_kg = excluded.usd_per_kg,
          source = excluded.source,
          updated_at = now(),
          updated_by = 'pilot_seed'
    `;
    console.log(`✓ Price updated: ${item.commodity} -> $${item.priceUsdPerKg}/kg (${item.priceSource})`);

    // 2. Insert or update batch attestation
    const batchId = item.commodity === "Au" ? "MAINNET-DEMO-2026-09-28-AU-01" : `MAINNET-PILOT-2026-10-02-${item.commodity}-01`;
    const certHash = keccak256(toBytes(item.cert));
    const dummySignature = "0x" + keccak256(toBytes(`sig-${batchId}`)).slice(2) + keccak256(toBytes(`part2-${batchId}`)).slice(2) + "1b";

    await sql`
      insert into scrit_attestations (
        chain_id, batch_id, commodity, mass_kg, grade_spec, certificate_hash, vault_id, custodian, signature, attested_at, created_at
      )
      values (
        ${CHAIN_ID}, ${batchId}, ${item.commodity}, ${item.massKg}, ${item.grade}, ${certHash}, ${item.vault}, ${CUSTODIAN_ADDRESS}, ${dummySignature}, now(), now()
      )
      on conflict (chain_id, batch_id) do update
      set mass_kg = excluded.mass_kg,
          grade_spec = excluded.grade_spec,
          certificate_hash = excluded.certificate_hash,
          vault_id = excluded.vault_id,
          custodian = excluded.custodian,
          attested_at = now()
    `;
    console.log(`✓ Attestation seeded: [${item.commodity}] ${item.massKg} kg at ${item.vault}`);
  }

  // 3. Verify final state
  const totalAtts = await sql`select count(*) from scrit_attestations where chain_id = ${CHAIN_ID}`;
  const totalPrices = await sql`select count(*) from scrit_prices`;
  console.log(`\nDone! Total mainnet attestations: ${totalAtts[0].count}, Total prices: ${totalPrices[0].count}`);
}

try {
  await seed();
} catch (err) {
  console.error("Seeding failed:", err);
} finally {
  await sql.end({ timeout: 2 });
}
