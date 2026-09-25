-- sCRIT-owned tables only. Safe to apply to a PostgreSQL database shared with Kentir.
create table if not exists scrit_issuer_registry (
  wallet text primary key, name text not null default '', contact text not null default '',
  approved boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists scrit_prices (
  commodity text primary key check (commodity in ('Au','Ag','Pt')), usd_per_kg numeric(30,8) not null check (usd_per_kg > 0),
  source text not null, updated_at timestamptz not null default now(), updated_by text not null
);
create table if not exists scrit_attestations (
  batch_id text primary key, commodity text not null check (commodity in ('Au','Ag','Pt')), mass_kg numeric(30,12) not null check (mass_kg > 0),
  grade_spec text not null, certificate_hash text not null, vault_id text not null, custodian text not null,
  signature text not null, attested_at timestamptz not null, created_at timestamptz not null default now()
);
create table if not exists scrit_treasury_log (
  id bigserial primary key, kind text not null, amount_text text not null, token text not null, sender text not null,
  recipient text not null, tx_hash text not null unique, chain_id integer not null, note text not null default '', created_at timestamptz not null default now()
);
create table if not exists scrit_custodians (
  address text primary key, name text not null, scope text[] not null default '{}', status text not null default 'demo' check (status in ('demo','contracted','revoked')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists scrit_ap_applications (
  wallet text primary key, name text not null default '', contact text not null default '', status text not null default 'pending', created_at timestamptz not null default now()
);
create table if not exists scrit_ap_rate_limits (
  fingerprint text primary key, window_started_at timestamptz not null default now(), attempts integer not null default 0
);
