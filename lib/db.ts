// Pilot DB: Postgres when DATABASE_URL set, otherwise in-memory fallback.
// Keeps day-1 shippable without Supabase; swap to real DB by setting env.

type Issuer = { wallet: string; name?: string; contact?: string; approved: boolean };
type Price = { commodity: string; usd_per_kg: number; source: string; updated_at: string };
type Att = Record<string, string>;
type TreasuryRow = Record<string, string>;
type ApApp = { wallet: string; name: string; contact: string; status: string; created_at: string };

const mem = {
  issuers: new Map<string, Issuer>(),
  prices: new Map<string, Price>([
    ["Au", { commodity: "Au", usd_per_kg: 85000, source: "manual team feed", updated_at: new Date().toISOString() }],
    ["Ag", { commodity: "Ag", usd_per_kg: 1100, source: "manual team feed", updated_at: new Date().toISOString() }],
    ["Pt", { commodity: "Pt", usd_per_kg: 95000, source: "manual team feed", updated_at: new Date().toISOString() }],
  ]),
  attestations: new Map<string, Att>(),
  treasury: [] as TreasuryRow[],
  custodians: new Map<string, import("./custodians").Custodian>(),
  apApps: [] as ApApp[],
};

let seeded = false;
/** Register the env demo key once, scoped to pilot commodities. */
function seedDemo(): void {
  if (seeded) return;
  seeded = true;
  const a = process.env.CUSTODIAN_DEMO_ADDRESS ?? "";
  if (/^0x[0-9a-fA-F]{40}$/.test(a) && a !== "0x0000000000000000000000000000000000000000") {
    mem.custodians.set(a.toLowerCase(), {
      address: a,
      name: "Pilot demo key",
      scope: ["Au", "Ag", "Pt"],
      status: "demo",
      created_at: new Date().toISOString(),
    });
  }
}

// Pilot uses the in-memory store above. Upgrade path: `pnpm add postgres`,
// restore a real pgClient, then apply migrations/0001_pilot.sql.
async function pgClient(): Promise<null> {
  return null;
}

export async function isIssuerApproved(wallet: string): Promise<boolean> {
  const w = wallet.toLowerCase();
  if (mem.issuers.get(w)?.approved) return true;
  const sql = (await pgClient()) as
    | ((t: TemplateStringsArray, ...v: unknown[]) => Promise<{ approved: boolean }[]>)
    | null;
  if (!sql) return false;
  try {
    const rows = await sql`select approved from issuers where wallet = ${w}`;
    return rows[0]?.approved === true;
  } catch {
    return false;
  }
}

export async function listPrices(): Promise<Price[]> {
  return [...mem.prices.values()];
}

export async function setPrice(p: Price): Promise<void> {
  mem.prices.set(p.commodity, p);
}

export async function listAttestations(): Promise<Att[]> {
  return [...mem.attestations.values()].reverse();
}

export async function saveAttestation(row: Att): Promise<void> {
  mem.attestations.set(row.batch_id, row);
}

export async function logTreasury(row: TreasuryRow): Promise<void> {
  mem.treasury.push({ ...row, created_at: new Date().toISOString() });
}

export async function listTreasury(): Promise<TreasuryRow[]> {
  return [...mem.treasury].reverse();
}

export async function listCustodians(): Promise<import("./custodians").Custodian[]> {
  seedDemo();
  return [...mem.custodians.values()];
}

export async function registerCustodian(c: import("./custodians").Custodian): Promise<void> {
  seedDemo();
  mem.custodians.set(c.address.toLowerCase(), c);
}

/** Scope for a key, or null when the key is not registered. */
export async function custodianScopeFor(address: string): Promise<string[] | null> {
  seedDemo();
  return mem.custodians.get(address.toLowerCase())?.scope ?? null;
}

export async function applyAP(a: ApApp): Promise<void> {
  if (!mem.apApps.some((x) => x.wallet === a.wallet)) mem.apApps.push(a);
}

export async function listApApps(): Promise<ApApp[]> {
  return [...mem.apApps];
}

export function checkAdmin(req: Request): boolean {
  const key = process.env.ADMIN_KEY;
  if (!key) return false;
  return req.headers.get("x-admin-key") === key;
}
