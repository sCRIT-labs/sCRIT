import postgres from "postgres";
import { readFileSync, existsSync } from "node:fs";

const env = {};
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match) env[match[1]] = match[2].replace(/^"|"$|^'|'$/g, "").trim();
  }
}

const dbUrl = env.DATABASE_URL;
const sql = postgres(dbUrl, { max: 2, connect_timeout: 15, prepare: false, ssl: "require" });

try {
  const start = Date.now();
  const rows = await sql`select now(), count(*) from scrit_tokens`;
  console.log("Success! Query time:", Date.now() - start, "ms", rows);
} catch (err) {
  console.error("Query failed:", err);
} finally {
  await sql.end({ timeout: 2 });
}
