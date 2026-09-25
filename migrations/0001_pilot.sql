create table if not exists issuers (
  wallet text primary key,
  name text,
  contact text,
  approved boolean default false,
  created_at timestamptz default now()
);
create table if not exists prices (
  commodity text primary key,
  usd_per_kg double precision not null,
  source text not null,
  updated_at timestamptz default now()
);
create table if not exists attestations (
  batch_id text primary key,
  commodity text not null,
  mass_kg text not null,
  grade_spec text,
  certificate_hash text,
  vault_id text,
  custodian text not null,
  signature text not null,
  created_at timestamptz default now()
);
create table if not exists treasury_log (
  id bigserial primary key,
  kind text not null,
  amount_text text not null,
  tx_hash text,
  note text,
  created_at timestamptz default now()
);
