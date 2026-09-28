import { NextResponse } from "next/server";
import { createPublicClient, defineChain, http, parseAbi, parseEventLogs } from "viem";
import { database } from "@/lib/db";
import {
  SCRIT_LAUNCHER_ABI, SCRIT_LAUNCHER_V4_ABI, SCRIT_RESERVE_ABI, SCRIT_CUSTODIANS_ABI,
  SCRIT_PRICES_ABI, SCRIT_LOT_MANAGER_ABI, SCRIT_LOT_TOKEN_ABI, SCRIT_LOT_MARKET_ABI,
  SCRIT_LOT_REDEMPTION_ABI, SCRIT_TAX_HOOK_ABI,
} from "@/lib/scrit-artifact";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Vercel Cron (or manual) trigger for mainnet event indexing.
// Same idempotent cursor logic as scripts/index-events.mjs, but bounded to a
// short time budget per invocation so serverless timeouts only pause progress.
const TIME_BUDGET_MS = 25000;
const BATCH_BLOCKS = 1000n;
const CONFIRMATIONS = 5n;

function addr(v: string | undefined): string | null {
  return v && /^0x[0-9a-fA-F]{40}$/.test(v) && !/^0x0{40}$/i.test(v) ? v.toLowerCase() : null;
}

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || req.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (process.env.NEXT_PUBLIC_SCRIT_CHAIN_ID !== "4663") {
    return NextResponse.json({ error: "mainnet_not_selected" }, { status: 503 });
  }
  const started = Date.now();
  const out: Array<Record<string, unknown>> = [];
  try {
    const rpc = process.env.ROBINHOOD_MAINNET_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";
    const chain = defineChain({ id: 4663, name: "Robinhood Chain", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [rpc] } } });
    const client = createPublicClient({ chain, transport: http(rpc, { timeout: 7000 }) });
    if (await client.getChainId() !== 4663) return NextResponse.json({ error: "wrong_rpc_chain" }, { status: 503 });
    const isV4 = true;
    const defs: Array<[string, string | null, unknown]> = [
      ["launcher", addr(process.env.NEXT_PUBLIC_SCRIT_LAUNCHER_MAINNET), isV4 ? SCRIT_LAUNCHER_V4_ABI : SCRIT_LAUNCHER_ABI],
      ["reserve", addr(process.env.NEXT_PUBLIC_SCRIT_RESERVE_MANAGER_MAINNET), SCRIT_RESERVE_ABI],
      ["custodians", addr(process.env.NEXT_PUBLIC_SCRIT_CUSTODIANS_MAINNET), SCRIT_CUSTODIANS_ABI],
      ["prices", addr(process.env.NEXT_PUBLIC_SCRIT_PRICE_ADAPTER_MAINNET), SCRIT_PRICES_ABI],
      ["lots", addr(process.env.NEXT_PUBLIC_SCRIT_LOT_MANAGER_MAINNET), SCRIT_LOT_MANAGER_ABI],
      ["lotToken", addr(process.env.NEXT_PUBLIC_SCRIT_LOT_TOKEN_MAINNET), SCRIT_LOT_TOKEN_ABI],
      ["marketplace", addr(process.env.NEXT_PUBLIC_SCRIT_LOT_MARKETPLACE_MAINNET), SCRIT_LOT_MARKET_ABI],
      ["redemption", addr(process.env.NEXT_PUBLIC_SCRIT_REDEMPTION_MAINNET), SCRIT_LOT_REDEMPTION_ABI],
      ["taxHook", addr(process.env.NEXT_PUBLIC_SCRIT_TAX_HOOK_MAINNET), SCRIT_TAX_HOOK_ABI],
    ];
    const db = await database();
    const head = await client.getBlockNumber();
    if (head <= CONFIRMATIONS) return NextResponse.json({ error: "head_below_confirmations" }, { status: 503 });
    const safeHead = head - CONFIRMATIONS;
    const startDefault = BigInt(process.env.SCRIT_MAINNET_INDEXER_START_BLOCK || "0");
    if (startDefault === 0n) return NextResponse.json({ error: "start_block_unset" }, { status: 503 });

    for (const [kind, address, fullAbi] of defs) {
      if (!address) {
        out.push({ kind, skipped: "unconfigured" });
        continue;
      }
      if (Date.now() - started > TIME_BUDGET_MS) {
        out.push({ kind, deferred: "budget" });
        continue;
      }
      const events = (fullAbi as Array<{ type: string; name?: string; inputs?: Array<{ type: string; indexed?: boolean; name: string }> }>).filter((i) => i.type === "event");
      const abi = parseAbi(events.map((e) => `event ${e.name}(${e.inputs!.map((i) => `${i.type}${i.indexed ? " indexed" : ""} ${i.name}`).join(",")})`));
      const code = await client.getCode({ address: address as `0x${string}` });
      if (!code || code === "0x") {
        out.push({ kind, error: "no_code" });
        continue;
      }
      const cur = await db`select block_number from scrit_indexer_cursors where chain_id=4663 and contract_address=${address}`;
      let from = cur[0] ? BigInt(cur[0].block_number) + 1n : startDefault;
      let scanned = 0;
      let indexed = 0;
      while (from <= safeHead && Date.now() - started < TIME_BUDGET_MS && scanned < 2) {
        const to = from + BATCH_BLOCKS - 1n > safeHead ? safeHead : from + BATCH_BLOCKS - 1n;
        const logs = await client.getLogs({ address: address as `0x${string}`, fromBlock: from, toBlock: to });
        for (const log of logs) {
          const parsed = parseEventLogs({ abi, logs: [log], strict: false })[0];
          if (!parsed || !log.transactionHash || log.blockNumber === null || log.logIndex === null) continue;
          const payload = JSON.parse(JSON.stringify(parsed.args, (_, v) => typeof v === "bigint" ? v.toString() : v));
          const clean = payload !== null && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
          await db`insert into scrit_chain_events(chain_id,contract_address,tx_hash,log_index,block_number,event_name,payload)
            values(4663,${address},${log.transactionHash.toLowerCase()},${log.logIndex},${log.blockNumber.toString()},${parsed.eventName},${JSON.stringify(clean)}::jsonb)
            on conflict(chain_id,contract_address,tx_hash,log_index) do nothing`;
          indexed++;
        }
        await db`insert into scrit_indexer_cursors(chain_id,contract_address,block_number) values(4663,${address},${to.toString()})
          on conflict(chain_id,contract_address) do update set block_number=greatest(scrit_indexer_cursors.block_number,excluded.block_number),updated_at=now()`;
        from = to + 1n;
        scanned++;
      }
      out.push({ kind, indexed, more: from <= safeHead });
    }
    return NextResponse.json({ ok: true, results: out });
  } catch {
    return NextResponse.json({ error: "index_failed", partial: out }, { status: 500 });
  }
}
