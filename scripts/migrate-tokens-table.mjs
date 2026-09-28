import postgres from "postgres";
import { readFileSync, existsSync } from "node:fs";

const env = {};
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match) env[match[1]] = match[2].replace(/^"|"$|^'|'$/g, "").trim();
  }
}

const dbUrl = env.DATABASE_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(dbUrl, { max: 2, connect_timeout: 10, prepare: false });

try {
  console.log("Connecting to database...");
  await sql`select 1`;
  console.log("Connected successfully!");

  console.log("Migrating scrit_tokens table...");
  await sql.unsafe(`
    create table if not exists scrit_tokens (
      id text primary key,
      chain_id integer not null,
      address text not null,
      name text not null,
      symbol text not null,
      creator text not null,
      supply text not null,
      pooled text not null,
      scrit_amount text not null,
      tx_hash text not null,
      pool_id text not null,
      pool_type text not null,
      logo_url text,
      backing_category text not null default 'Critical Commodity Reserve',
      description text not null default '',
      created_at timestamptz not null default now(),
      constraint scrit_tokens_chain_address_unique unique (chain_id, address)
    );
    create index if not exists scrit_tokens_chain_idx on scrit_tokens(chain_id, created_at desc);
  `);
  console.log("scrit_tokens table migrated!");

  const rows = await sql`select count(*) from scrit_tokens`;
  console.log("Current tokens in database count:", rows[0].count);
} catch (err) {
  console.error("Migration error:", err);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
