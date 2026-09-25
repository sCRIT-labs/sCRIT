create table if not exists custodians (
  address text primary key,
  name text,
  scope text[] not null default '{Au,Ag,Pt}',
  status text not null default 'demo',
  created_at timestamptz default now()
);
create table if not exists ap_applications (
  wallet text primary key,
  name text,
  contact text,
  status text not null default 'pending',
  created_at timestamptz default now()
);
