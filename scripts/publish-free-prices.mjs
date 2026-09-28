// Pilot ops: refresh Au/Ag from the free gold-api.com quote (USD/troy oz -> USD/kg),
// publish on-chain (mainnet) and mirror off-chain to the production API.
// Other commodities stay manual/demo and keep their own source labels.
// Fails loudly when the free source is unreachable: never invents a price.
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const OZ_TO_KG = 32.1507466;
const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$|^'|'$/g, "");
}

async function quote(symbol) {
  const r = await fetch(`https://api.gold-api.com/price/${symbol}`, { signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`free quote source unavailable (${symbol}: ${r.status})`);
  const j = await r.json();
  if (!j || typeof j.price !== "number" || !(j.price > 0)) throw new Error(`bad quote payload (${symbol})`);
  return { perOz: j.price, perKg: j.price * OZ_TO_KG, at: j.updatedAt ?? "unknown" };
}

const au = await quote("XAU");
const ag = await quote("XAG");
console.log(`XAU $${au.perOz}/oz ($${au.perKg.toFixed(2)}/kg) @ ${au.at}`);
console.log(`XAG $${ag.perOz}/oz ($${ag.perKg.toFixed(2)}/kg) @ ${ag.at}`);

const SOURCE = "gold-api.com free quote (Au/Ag spot; not an LBMA fix or audit)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function publishWithRetry(args, tries = 4) {
  for (let attempt = 1; ; attempt++) {
    try {
      execFileSync("node", args, { stdio: "inherit" });
      return;
    } catch (e) {
      if (attempt >= tries) throw e;
      console.log(`retry ${attempt}/${tries} in 25s (public RPC may be rate-limited)`);
      await sleep(25000);
    }
  }
}
for (const [sym, q] of [["Au", au], ["Ag", ag]]) {
  await publishWithRetry(["scripts/publish-price.mjs", "--mainnet", sym, q.perKg.toFixed(2), SOURCE]);
}

const admin = { "x-admin-key": env.ADMIN_KEY, "content-type": "application/json" };
for (const [sym, q] of [["Au", au], ["Ag", ag]]) {
  const r = await fetch("https://s-crit.vercel.app/api/prices", {
    method: "POST", headers: admin,
    body: JSON.stringify({ commodity: sym, usd_per_kg: Number(q.perKg.toFixed(2)), source: SOURCE }),
  });
  console.log("off-chain", sym, r.status);
  if (!r.ok) throw new Error(`production price POST failed (${sym}: ${r.status})`);
}
console.log("free Au/Ag refresh complete; Pt/Pd/Nd/Dy/Tb/Sc/Li remain manual/demo.");
