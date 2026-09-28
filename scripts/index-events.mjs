// Restartable testnet event indexer. Replays use DB uniqueness keys and block cursors.
import { existsSync, readFileSync } from "node:fs";
import postgres from "postgres";
import { createPublicClient, defineChain, http, parseAbi, parseEventLogs } from "viem";

const env = {};
for (const line of (existsSync(".env.local") ? readFileSync(".env.local", "utf8").split("\n") : [])) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (match) env[match[1]] = match[2].replace(/^"|"$|^'|'$/g, "");
}
const mode = process.argv.includes("--mainnet") ? "mainnet" : "testnet";
const chainId = mode === "mainnet" ? 4663 : 46630;
const suffix = mode === "mainnet" ? "MAINNET" : "TESTNET";
const dbUrl = env.DATABASE_URL || process.env.DATABASE_URL;
if (!dbUrl) throw new Error("DATABASE_URL is required");
const addressFor = (key) => env[`${key}_${suffix}`] || process.env[`${key}_${suffix}`] ||
  (mode === "testnet" ? env[key] || process.env[key] : undefined);
const contracts = [
  ["launcher", "NEXT_PUBLIC_SCRIT_LAUNCHER", mode === "mainnet" ? "SCRIT_LAUNCHER_V4_ABI" : "SCRIT_LAUNCHER_ABI"],
  ["reserve", "NEXT_PUBLIC_SCRIT_RESERVE_MANAGER", "SCRIT_RESERVE_ABI"],
  ["custodians", "NEXT_PUBLIC_SCRIT_CUSTODIANS", "SCRIT_CUSTODIANS_ABI"],
  ["prices", "NEXT_PUBLIC_SCRIT_PRICE_ADAPTER", "SCRIT_PRICES_ABI"],
  ["lots", "NEXT_PUBLIC_SCRIT_LOT_MANAGER", "SCRIT_LOT_MANAGER_ABI"],
  ["lotToken", "NEXT_PUBLIC_SCRIT_LOT_TOKEN", "SCRIT_LOT_TOKEN_ABI"],
  ["marketplace", "NEXT_PUBLIC_SCRIT_LOT_MARKETPLACE", "SCRIT_LOT_MARKET_ABI"],
  ["redemption", "NEXT_PUBLIC_SCRIT_REDEMPTION", "SCRIT_LOT_REDEMPTION_ABI"],
  ...(mode === "mainnet" ? [["taxHook", "NEXT_PUBLIC_SCRIT_TAX_HOOK", "SCRIT_TAX_HOOK_ABI"]] : []),
].flatMap(([kind, envKey, abiName]) => {
  const address = addressFor(envKey);
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address) || /^0x0{40}$/i.test(address)) return [];
  const artifactText = readFileSync("lib/scrit-artifact.ts", "utf8");
  const match = artifactText.match(new RegExp(`export const ${abiName} = (.+?) as const;`, "s"));
  if (!match) throw new Error(`Missing ${abiName}; run pnpm compile`);
  const abi = JSON.parse(match[1]);
  const events = abi.filter((item) => item.type === "event");
  return [{ kind, address: address.toLowerCase(), abi: parseAbi(events.map((event) => `event ${event.name}(${event.inputs.map((i) => `${i.type}${i.indexed ? " indexed" : ""} ${i.name}`).join(",")})`)) }];
});
if (contracts.length === 0) throw new Error("No v2 contract addresses configured");

const chain = defineChain({
  id: chainId,
  name: mode === "mainnet" ? "Robinhood Chain" : "Robinhood Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [mode === "mainnet" ? (env.ROBINHOOD_MAINNET_RPC_URL || "https://rpc.mainnet.chain.robinhood.com") : (env.SCRIT_INDEXER_RPC_URL || "https://rpc.testnet.chain.robinhood.com")] } },
});
const rpc = mode === "mainnet" ? (env.ROBINHOOD_MAINNET_RPC_URL || chain.rpcUrls.default.http[0]) : (env.SCRIT_INDEXER_RPC_URL || chain.rpcUrls.default.http[0]);
const client = createPublicClient({ chain, transport: http(rpc) });
if (await client.getChainId() !== chain.id) throw new Error(`Indexer RPC is not ${chain.name}`);
const sql = postgres(dbUrl, { max: 2, connect_timeout: 10, prepare: false });
try {
  await sql`select 1`;
  const head = await client.getBlockNumber();
  const confirmations = BigInt(env[`SCRIT_${suffix}_INDEXER_CONFIRMATIONS`] || process.env[`SCRIT_${suffix}_INDEXER_CONFIRMATIONS`] || env.SCRIT_INDEXER_CONFIRMATIONS || process.env.SCRIT_INDEXER_CONFIRMATIONS || "5");
  if (head <= confirmations) throw new Error("Chain head is below confirmation depth");
  const safeHead = head - confirmations;
  const startValue = mode === "mainnet"
    ? env.SCRIT_MAINNET_INDEXER_START_BLOCK || process.env.SCRIT_MAINNET_INDEXER_START_BLOCK || "0"
    : env.SCRIT_TESTNET_INDEXER_START_BLOCK || process.env.SCRIT_TESTNET_INDEXER_START_BLOCK || env.SCRIT_INDEXER_START_BLOCK || process.env.SCRIT_INDEXER_START_BLOCK || "0";
  const startDefault = BigInt(startValue);
  if (mode === "mainnet" && startDefault === 0n) throw new Error("Set SCRIT_MAINNET_INDEXER_START_BLOCK to the first deployment block to avoid scanning the full chain.");
  const batchSize = BigInt(env[`SCRIT_${suffix}_INDEXER_BATCH_BLOCKS`] || process.env[`SCRIT_${suffix}_INDEXER_BATCH_BLOCKS`] || env.SCRIT_INDEXER_BATCH_BLOCKS || process.env.SCRIT_INDEXER_BATCH_BLOCKS || "1000");

  for (const contract of contracts) {
    const code = await client.getCode({ address: contract.address });
    if (!code || code === "0x") throw new Error(`${contract.kind} address has no code: ${contract.address}`);
    const cursorRows = await sql`select block_number from scrit_indexer_cursors where chain_id=${chain.id} and contract_address=${contract.address}`;
    let from = cursorRows[0] ? BigInt(cursorRows[0].block_number) + 1n : startDefault;
    while (from <= safeHead) {
      const to = from + batchSize - 1n > safeHead ? safeHead : from + batchSize - 1n;
      const logs = await client.getLogs({ address: contract.address, fromBlock: from, toBlock: to });
      for (const log of logs) {
        const parsed = parseEventLogs({ abi: contract.abi, logs: [log], strict: false })[0];
        if (!parsed || !log.transactionHash || log.blockNumber === null || log.logIndex === null) continue;
        let payload = JSON.parse(JSON.stringify(parsed.args, (_, value) => typeof value === "bigint" ? value.toString() : value));
        // Never store a string scalar: older rows were double-encoded and break
        // consumers that expect a jsonb object. Unwrap string layers (max 2).
        for (let depth = 0; depth < 2 && typeof payload === "string"; depth++) {
          try { payload = JSON.parse(payload); } catch { payload = {}; break; }
        }
        if (payload === null || typeof payload !== "object" || Array.isArray(payload)) payload = {};
        await sql`insert into scrit_chain_events(chain_id,contract_address,tx_hash,log_index,block_number,event_name,payload)
          values(${chain.id},${contract.address},${log.transactionHash.toLowerCase()},${log.logIndex},${log.blockNumber.toString()},${parsed.eventName},${JSON.stringify(payload)}::jsonb)
          on conflict(chain_id,contract_address,tx_hash,log_index) do nothing`;
      }
      await sql`insert into scrit_indexer_cursors(chain_id,contract_address,block_number) values(${chain.id},${contract.address},${to.toString()})
        on conflict(chain_id,contract_address) do update set block_number=greatest(scrit_indexer_cursors.block_number,excluded.block_number),updated_at=now()`;
      console.log(`${contract.kind}: indexed ${from}-${to} (${logs.length} logs)`);
      from = to + 1n;
    }
  }
} finally {
  await sql.end({ timeout: 5 });
}
