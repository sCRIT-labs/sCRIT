import postgres, { type Sql } from "postgres";
import type { Custodian } from "./custodians";

export type Issuer = { wallet: string; name: string; contact: string; approved: boolean; created_at: string };
export type Price = { commodity: string; usd_per_kg: number; source: string; updated_at: string };
export type Attestation = Record<string, string>;
export type TreasuryRow = Record<string, string>;
export type ApApp = { wallet: string; name: string; contact: string; status: string; created_at: string };

const schema = [
  `create table if not exists scrit_issuer_registry (
    wallet text primary key, name text not null default '', contact text not null default '',
    approved boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
  )`,
  `create table if not exists scrit_prices (
    commodity text primary key check (commodity in ('Au','Ag','Pt','Pd','Nd','Dy','Tb','Sc','Li')), usd_per_kg numeric(30,8) not null check (usd_per_kg > 0),
    source text not null, updated_at timestamptz not null default now(), updated_by text not null
  )`,
  `create table if not exists scrit_attestations (
    batch_id text primary key, commodity text not null check (commodity in ('Au','Ag','Pt','Pd','Nd','Dy','Tb','Sc','Li')), mass_kg numeric(30,12) not null check (mass_kg > 0),
    grade_spec text not null, certificate_hash text not null, vault_id text not null, custodian text not null,
    signature text not null, attested_at timestamptz not null, created_at timestamptz not null default now()
  )`,
  `create table if not exists scrit_treasury_log (
    id bigserial primary key, kind text not null, amount_text text not null, token text not null, sender text not null,
    recipient text not null, tx_hash text not null unique, chain_id integer not null, note text not null default '', created_at timestamptz not null default now()
  )`,
  `create table if not exists scrit_custodians (
    address text primary key, name text not null, scope text[] not null default '{}', status text not null default 'demo' check (status in ('demo','contracted','revoked')),
    created_at timestamptz not null default now(), updated_at timestamptz not null default now()
  )`,
  `create table if not exists scrit_ap_applications (
    wallet text primary key, name text not null default '', contact text not null default '', status text not null default 'pending', created_at timestamptz not null default now()
  )`,
  `create table if not exists scrit_ap_rate_limits (
    fingerprint text primary key, window_started_at timestamptz not null default now(), attempts integer not null default 0
  )`,
  `create table if not exists scrit_chain_events (
    chain_id integer not null, contract_address text not null, tx_hash text not null, log_index integer not null,
    block_number bigint not null, event_name text not null, payload jsonb not null, observed_at timestamptz not null default now(),
    primary key(chain_id, contract_address, tx_hash, log_index)
  )`,
  `create index if not exists scrit_chain_events_block_idx on scrit_chain_events(chain_id, block_number desc)`,
  `create table if not exists scrit_indexer_cursors (
    chain_id integer not null, contract_address text not null, block_number bigint not null, updated_at timestamptz not null default now(),
    primary key(chain_id, contract_address)
  )`,
  `create table if not exists scrit_reserve_batches (
    chain_id integer not null, batch_id text not null, tx_hash text not null, block_number bigint not null,
    commodity text not null check (commodity in ('Au','Ag','Pt','Pd','Nd','Dy','Tb','Sc','Li')), mass_kg_e12 numeric(40,0) not null,
    certificate_hash text not null, custodian text not null, minted_amount numeric(78,0) not null,
    reserve_value_usd_e8 numeric(40,0) not null, observed_at timestamptz not null default now(),
    primary key(chain_id,batch_id), unique(chain_id,tx_hash)
  )`,
  `create table if not exists scrit_lot_records (
    chain_id integer not null, lot_id text not null, token_id numeric(78,0) not null, tx_hash text not null,
    block_number bigint not null, commodity text not null, certificate_hash text not null, custodian text not null,
    status text not null default 'issued', observed_at timestamptz not null default now(),
    primary key(chain_id,lot_id)
  )`,
  `create table if not exists scrit_lot_orders (
    chain_id integer not null, order_id text not null, tx_hash text not null, block_number bigint not null,
    lot_id text not null, maker text not null, side text not null check (side in ('ask','bid')),
    remaining_units numeric(78,0) not null, price_per_unit numeric(78,0) not null,
    status text not null default 'open', observed_at timestamptz not null default now(),
    primary key(chain_id,order_id)
  )`,
  `create table if not exists scrit_admin_audit_log (
    id bigserial primary key, actor text not null, action text not null, entity text not null,
    entity_id text not null, evidence_hash text not null default '', created_at timestamptz not null default now()
  )`,
];

let client: Sql | undefined;
let ready: Promise<Sql> | undefined;

async function database(): Promise<Sql> {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("database_not_configured");
  if (!ready) {
    client = postgres(url, { max: 5, idle_timeout: 20, connect_timeout: 10, prepare: false });
    ready = (async () => {
      const db = client!;
      await db`select 1`;
      for (const statement of schema) await db.unsafe(statement);
      const demo = process.env.CUSTODIAN_DEMO_ADDRESS?.toLowerCase();
      if (demo && /^0x[0-9a-f]{40}$/.test(demo) && !/^0x0{40}$/.test(demo)) {
        await db`insert into scrit_custodians(address,name,scope,status) values(${demo},'Pilot demo key',${["Au", "Ag", "Pt"]},'demo') on conflict (address) do nothing`;
      }
      return db;
    })().catch(async (error) => {
      ready = undefined;
      const failed = client;
      client = undefined;
      await failed?.end({ timeout: 1 }).catch(() => undefined);
      throw error;
    });
  }
  return ready;
}

export async function databaseHealth(): Promise<{ ok: boolean }> {
  await database();
  return { ok: true };
}

export async function getIndexerCursor(chainId: number, contractAddress: string): Promise<bigint | null> {
  const db = await database();
  const rows = await db`select block_number from scrit_indexer_cursors where chain_id=${chainId} and contract_address=${contractAddress.toLowerCase()}`;
  return rows[0] ? BigInt(rows[0].block_number) : null;
}

export async function saveChainEvent(event: {
  chainId: number; contractAddress: string; txHash: string; logIndex: number; blockNumber: bigint;
  eventName: string; payload: unknown;
}): Promise<boolean> {
  const db = await database();
  const rows = await db`insert into scrit_chain_events(chain_id,contract_address,tx_hash,log_index,block_number,event_name,payload)
    values(${event.chainId},${event.contractAddress.toLowerCase()},${event.txHash.toLowerCase()},${event.logIndex},${event.blockNumber.toString()},${event.eventName},${JSON.stringify(event.payload)}::jsonb)
    on conflict(chain_id,contract_address,tx_hash,log_index) do nothing returning tx_hash`;
  return rows.length > 0;
}

export async function advanceIndexerCursor(chainId: number, contractAddress: string, blockNumber: bigint): Promise<void> {
  const db = await database();
  await db`insert into scrit_indexer_cursors(chain_id,contract_address,block_number) values(${chainId},${contractAddress.toLowerCase()},${blockNumber.toString()})
    on conflict(chain_id,contract_address) do update set block_number=greatest(scrit_indexer_cursors.block_number,excluded.block_number),updated_at=now()`;
}

export async function listChainEvents(limit = 100, chainId = 46630): Promise<Array<Record<string, unknown>>> {
  const db = await database();
  return await db`select chain_id,contract_address,tx_hash,log_index,block_number,event_name,payload,observed_at from scrit_chain_events where chain_id=${chainId} order by block_number desc,log_index desc limit ${Math.min(Math.max(limit,1),500)}` as unknown as Array<Record<string, unknown>>;
}

export async function auditAdminAction(actor: string, action: string, entity: string, entityId: string, evidenceHash = ""): Promise<void> {
  const db = await database();
  await db`insert into scrit_admin_audit_log(actor,action,entity,entity_id,evidence_hash) values(${actor.toLowerCase()},${action},${entity},${entityId},${evidenceHash})`;
}

export async function isIssuerApproved(wallet: string): Promise<boolean> {
  const db = await database();
  const rows = await db`select approved from scrit_issuer_registry where wallet = ${wallet.toLowerCase()}`;
  return rows[0]?.approved === true;
}

export async function issuerApplicationStatus(wallet: string): Promise<"approved" | "pending" | "not-applied"> {
  const db = await database();
  const rows = await db`select approved from scrit_issuer_registry where wallet = ${wallet.toLowerCase()}`;
  if (!rows[0]) return "not-applied";
  return rows[0].approved === true ? "approved" : "pending";
}

export async function listIssuers(): Promise<Issuer[]> {
  const db = await database();
  return await db`select wallet,name,contact,approved,created_at from scrit_issuer_registry order by created_at desc` as unknown as Issuer[];
}

export async function setIssuer(input: Pick<Issuer, "wallet" | "name" | "contact" | "approved">): Promise<void> {
  const db = await database();
  await db`insert into scrit_issuer_registry(wallet,name,contact,approved) values(${input.wallet.toLowerCase()},${input.name},${input.contact},${input.approved})
    on conflict(wallet) do update set name=excluded.name, contact=excluded.contact, approved=excluded.approved, updated_at=now()`;
}

/** Public issuer intake can create pending records only; it can never grant approval or overwrite an existing review. */
export async function applyIssuer(input: Pick<Issuer, "wallet" | "name" | "contact">): Promise<boolean> {
  const db = await database();
  const rows = await db`insert into scrit_issuer_registry(wallet,name,contact,approved) values(${input.wallet.toLowerCase()},${input.name},${input.contact},false) on conflict(wallet) do nothing returning wallet`;
  return rows.length > 0;
}

export async function listPrices(): Promise<Price[]> {
  const db = await database();
  return await db`select commodity,usd_per_kg::float8 as usd_per_kg,source,updated_at from scrit_prices order by commodity` as unknown as Price[];
}

export async function setPrice(p: Price, updatedBy: string): Promise<void> {
  const db = await database();
  await db`insert into scrit_prices(commodity,usd_per_kg,source,updated_at,updated_by) values(${p.commodity},${p.usd_per_kg},${p.source},${p.updated_at},${updatedBy.toLowerCase()})
    on conflict(commodity) do update set usd_per_kg=excluded.usd_per_kg, source=excluded.source, updated_at=excluded.updated_at, updated_by=excluded.updated_by`;
}

export async function listAttestations(): Promise<Attestation[]> {
  const db = await database();
  return await db`select batch_id,commodity,mass_kg::text,grade_spec,certificate_hash,vault_id,custodian,signature,attested_at as created_at from scrit_attestations order by created_at desc limit 500` as unknown as Attestation[];
}

export async function saveAttestation(row: Attestation): Promise<boolean> {
  const db = await database();
  const rows = await db`insert into scrit_attestations(batch_id,commodity,mass_kg,grade_spec,certificate_hash,vault_id,custodian,signature,attested_at)
    values(${row.batch_id},${row.commodity},${row.mass_kg},${row.grade_spec},${row.certificate_hash},${row.vault_id},${row.custodian.toLowerCase()},${row.signature},to_timestamp(${Number(row.timestamp)}))
    on conflict(batch_id) do nothing returning batch_id`;
  return rows.length > 0;
}

export async function logTreasury(row: TreasuryRow): Promise<boolean> {
  const db = await database();
  const rows = await db`insert into scrit_treasury_log(kind,amount_text,token,sender,recipient,tx_hash,chain_id,note)
    values(${row.kind},${row.amount_text},${row.token.toLowerCase()},${row.sender.toLowerCase()},${row.recipient.toLowerCase()},${row.tx_hash.toLowerCase()},${Number(row.chain_id)},${row.note ?? ""})
    on conflict(tx_hash) do nothing returning tx_hash`;
  return rows.length > 0;
}

export async function listTreasury(): Promise<TreasuryRow[]> {
  const db = await database();
  return await db`select kind,amount_text,token,sender,recipient,tx_hash,chain_id,note,created_at from scrit_treasury_log order by created_at desc limit 500` as unknown as TreasuryRow[];
}

export async function listCustodians(): Promise<Custodian[]> {
  const db = await database();
  return await db`select address,name,scope,status,created_at from scrit_custodians order by created_at` as unknown as Custodian[];
}

export async function registerCustodian(c: Custodian): Promise<void> {
  const db = await database();
  await db`insert into scrit_custodians(address,name,scope,status) values(${c.address.toLowerCase()},${c.name},${c.scope},${c.status})
    on conflict(address) do update set name=excluded.name,scope=excluded.scope,status=excluded.status,updated_at=now()`;
}

export async function custodianScopeFor(address: string): Promise<string[] | null> {
  const db = await database();
  const rows = await db`select scope,status from scrit_custodians where address=${address.toLowerCase()}`;
  return rows[0] && rows[0].status !== "revoked" ? (rows[0].scope as string[]) : null;
}

export async function applyAP(a: ApApp): Promise<boolean> {
  const db = await database();
  const rows = await db`insert into scrit_ap_applications(wallet,name,contact,status) values(${a.wallet.toLowerCase()},${a.name},${a.contact},'pending') on conflict(wallet) do nothing returning wallet`;
  return rows.length > 0;
}

export async function listApApps(): Promise<ApApp[]> {
  const db = await database();
  return await db`select wallet,name,contact,status,created_at from scrit_ap_applications order by created_at desc limit 1000` as unknown as ApApp[];
}

export async function consumeApRateLimit(fingerprint: string): Promise<boolean> {
  const db = await database();
  const rows = await db`insert into scrit_ap_rate_limits(fingerprint,window_started_at,attempts) values(${fingerprint},now(),1)
    on conflict(fingerprint) do update set
      window_started_at=case when scrit_ap_rate_limits.window_started_at < now() - interval '15 minutes' then now() else scrit_ap_rate_limits.window_started_at end,
      attempts=case when scrit_ap_rate_limits.window_started_at < now() - interval '15 minutes' then 1 else scrit_ap_rate_limits.attempts + 1 end
    returning attempts`;
  return Number(rows[0]?.attempts ?? 6) <= 5;
}

export function checkAdmin(req: Request): boolean {
  const key = process.env.ADMIN_KEY;
  return Boolean(key && key.length >= 32 && req.headers.get("x-admin-key") === key);
}
