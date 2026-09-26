-- sCRIT-only chain index and v2 ledger tables. Safe to apply beside Kentir tables.
create table if not exists scrit_chain_events (
  chain_id integer not null, contract_address text not null, tx_hash text not null, log_index integer not null,
  block_number bigint not null, event_name text not null, payload jsonb not null, observed_at timestamptz not null default now(),
  primary key(chain_id, contract_address, tx_hash, log_index)
);
create index if not exists scrit_chain_events_block_idx on scrit_chain_events(chain_id, block_number desc);
create table if not exists scrit_indexer_cursors (
  chain_id integer not null, contract_address text not null, block_number bigint not null, updated_at timestamptz not null default now(),
  primary key(chain_id, contract_address)
);
create table if not exists scrit_reserve_batches (
  chain_id integer not null, batch_id text not null, tx_hash text not null, block_number bigint not null,
  commodity text not null check (commodity in ('Au','Ag','Pt')), mass_kg_e12 numeric(40,0) not null,
  certificate_hash text not null, custodian text not null, minted_amount numeric(78,0) not null,
  reserve_value_usd_e8 numeric(40,0) not null, observed_at timestamptz not null default now(),
  primary key(chain_id,batch_id), unique(chain_id,tx_hash)
);
create table if not exists scrit_lot_records (
  chain_id integer not null, lot_id text not null, token_id numeric(78,0) not null, tx_hash text not null,
  block_number bigint not null, commodity text not null, certificate_hash text not null, custodian text not null,
  status text not null default 'issued', observed_at timestamptz not null default now(),
  primary key(chain_id,lot_id)
);
create table if not exists scrit_lot_orders (
  chain_id integer not null, order_id text not null, tx_hash text not null, block_number bigint not null,
  lot_id text not null, maker text not null, side text not null check (side in ('ask','bid')),
  remaining_units numeric(78,0) not null, price_per_unit numeric(78,0) not null,
  status text not null default 'open', observed_at timestamptz not null default now(),
  primary key(chain_id,order_id)
);
create table if not exists scrit_admin_audit_log (
  id bigserial primary key, actor text not null, action text not null, entity text not null,
  entity_id text not null, evidence_hash text not null default '', created_at timestamptz not null default now()
);
