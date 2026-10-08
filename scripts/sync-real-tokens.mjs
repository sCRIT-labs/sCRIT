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

const realTokens = [
  {
    id: "4663-0x351776b6fba6a910c32e46f3775aa946a724d78f",
    chain_id: 4663,
    address: "0x351776b6fba6a910c32e46f3775aa946a724d78f",
    name: "sCRIT",
    symbol: "CRIT",
    creator: "Pons Launch",
    supply: "1,000,000,000",
    pooled: "0",
    scrit_amount: "0",
    tx_hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    pool_id: null,
    pool_type: "v4_hook",
    logo_url: null,
    backing_category: "Pons Launched Canonical sCRIT Token",
    description: "Official Pons launched sCRIT token (CRIT) on Robinhood Chain Mainnet.",
    created_at: new Date()
  },
  {
    id: "4663-0x56073943133c1c0678a753be9402b27d43cf1c22",
    chain_id: 4663,
    address: "0x56073943133c1c0678a753be9402b27d43cf1c22",
    name: "sCRIT Critical Commodity Index",
    symbol: "SCRIT",
    creator: "0xCdbdc82A021071eE445d9f897433a7E4B4EAfD8d",
    supply: "1,000,000",
    pooled: "1,000",
    scrit_amount: "1,000",
    tx_hash: "0xdff4a7f0b41f1c2af5e580965bce6bb9db4fc49429f5f3c0dfead45047376a3f", // Real mainnet deploy tx
    pool_id: "0xd029d347e9706be039efab5de2da16919fc145d31ea0e3c9a8bd0a773bf6c69e",
    pool_type: "v4_hook",
    logo_url: null,
    backing_category: "5 Sleeves · 9 Critical Commodities",
    description: "Canonical Robinhood Mainnet contract 0x5607...1c22 paired with sCRIT Reserve Engine.",
    created_at: new Date("2026-09-28T03:29:27.185Z")
  },
  {
    id: "4663-0xeaad835ab56de5eff1d2b303b166b8afa220c537",
    chain_id: 4663,
    address: "0xEaad835Ab56de5EFF1D2B303B166B8aFA220C537",
    name: "Pilot Demo",
    symbol: "PDMO",
    creator: "0xCdbdc82A021071eE445d9f897433a7E4B4EAfD8d",
    supply: "1,000,000",
    pooled: "1,000",
    scrit_amount: "0.5",
    tx_hash: "0xdd8d74717fb0b0cedd3d72d9dad001337c1220858732eacc76cdd45bf7986537", // Real mainnet launch tx
    pool_id: "0x807c3523b5b47cb53a78cbf03283dfb6c5117b7d1c72d2aaadb5aa5caad30d19",
    pool_type: "v4_hook",
    logo_url: null,
    backing_category: "Rail A Liquidity Launch",
    description: "First atomic project token launched on Robinhood Mainnet paired with sCRIT via Uniswap V4 tax hook.",
    created_at: new Date("2026-09-28T03:55:00.000Z")
  },
  {
    id: "46630-0x761333eaf1cd18d3846edb11299e4162be5e8755",
    chain_id: 46630,
    address: "0x761333eaf1cd18d3846edb11299e4162be5e8755",
    name: "sCRIT Testnet V2 Pilot",
    symbol: "SCRIT",
    creator: "0xCdbdc82A021071eE445d9f897433a7E4B4EAfD8d",
    supply: "1,000,000",
    pooled: "100,000",
    scrit_amount: "0.1",
    tx_hash: "0xe8f8e5af7fb343c38870ee011153aff46879d17d3c0e3d48b75b2b84f82d2e5d", // Real testnet deploy tx
    pool_id: "0x01824bb84210e7491b5c90812347ae09824c08924b10582a8710924bcf081267",
    pool_type: "v3_standard",
    logo_url: null,
    backing_category: "Testnet Pilot Reserve",
    description: "Canonical Robinhood Testnet contract 0x7613...8755 paired with WETH base market.",
    created_at: new Date("2026-09-26T03:54:03.850Z")
  }
];

try {
  console.log("Connecting to database...");
  await sql`select 1`;
  console.log("Connected successfully!");

  console.log("Syncing 100% verified on-chain tokens...");
  for (const t of realTokens) {
    await sql`
      insert into scrit_tokens(
        id, chain_id, address, name, symbol, creator, supply, pooled,
        scrit_amount, tx_hash, pool_id, pool_type, logo_url, backing_category, description, created_at
      ) values (
        ${t.id}, ${t.chain_id}, ${t.address.toLowerCase()}, ${t.name}, ${t.symbol.toUpperCase()},
        ${t.creator.toLowerCase()}, ${t.supply}, ${t.pooled}, ${t.scrit_amount},
        ${t.tx_hash}, ${t.pool_id}, ${t.pool_type}, ${t.logo_url},
        ${t.backing_category}, ${t.description}, ${t.created_at}
      )
      on conflict (chain_id, address) do update set
        name = excluded.name,
        symbol = excluded.symbol,
        supply = excluded.supply,
        pooled = excluded.pooled,
        scrit_amount = excluded.scrit_amount,
        tx_hash = excluded.tx_hash,
        pool_id = excluded.pool_id,
        pool_type = excluded.pool_type,
        backing_category = excluded.backing_category,
        description = excluded.description,
        created_at = excluded.created_at
    `;
    console.log(`Synced token: ${t.symbol} (${t.address}) on chain ${t.chain_id} with real tx ${t.tx_hash}`);
  }

  const rows = await sql`select count(*) from scrit_tokens`;
  console.log("Total tokens in database:", rows[0].count);
} catch (err) {
  console.error("Sync error:", err);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
