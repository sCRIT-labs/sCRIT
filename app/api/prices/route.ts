import { NextResponse } from "next/server";
import { checkAdmin, listPrices, setPrice } from "@/lib/db";
import { STALENESS_MS } from "@/lib/scrit";

export async function GET() {
  const prices = await listPrices();
  const now = Date.now();
  const rows = prices.map((p) => ({
    ...p,
    stale: now - new Date(p.updated_at).getTime() > STALENESS_MS,
  }));
  return NextResponse.json({ prices: rows });
}

export async function POST(req: Request) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as {
    commodity?: string;
    usd_per_kg?: number;
    source?: string;
  } | null;
  if (!body?.commodity || typeof body.usd_per_kg !== "number" || body.usd_per_kg <= 0) {
    return NextResponse.json({ error: "bad_input" }, { status: 400 });
  }
  if (!["Au", "Ag", "Pt"].includes(body.commodity)) {
    return NextResponse.json({ error: "pilot_only_Au_Ag_Pt" }, { status: 400 });
  }
  await setPrice({
    commodity: body.commodity,
    usd_per_kg: body.usd_per_kg,
    source: body.source ?? "manual team feed",
    updated_at: new Date().toISOString(),
  });
  return NextResponse.json({ ok: true });
}
