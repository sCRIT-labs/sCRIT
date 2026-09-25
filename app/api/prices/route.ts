import { NextResponse } from "next/server";
import { checkAdmin, listPrices, setPrice } from "@/lib/db";
import { STALENESS_MS } from "@/lib/scrit";

export async function GET() {
  try {
    const prices = await listPrices();
    const now = Date.now();
    const rows = prices.map((p) => ({ ...p, stale: now - new Date(p.updated_at).getTime() > STALENESS_MS }));
    return NextResponse.json({ prices: rows });
  } catch {
    return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
  }
}

export async function POST(req: Request) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as {
    commodity?: string;
    usd_per_kg?: number;
    source?: string;
  } | null;
  if (body?.source !== undefined && typeof body.source !== "string") return NextResponse.json({ error: "bad_source" }, { status: 400 });
  if (!body?.commodity || typeof body.usd_per_kg !== "number" || !Number.isFinite(body.usd_per_kg) || body.usd_per_kg <= 0 || body.usd_per_kg > 1e15) {
    return NextResponse.json({ error: "bad_input" }, { status: 400 });
  }
  if (!["Au", "Ag", "Pt"].includes(body.commodity)) {
    return NextResponse.json({ error: "pilot_only_Au_Ag_Pt" }, { status: 400 });
  }
  const source = body.source?.trim() ?? "";
  if (source.length < 3 || source.length > 160) return NextResponse.json({ error: "bad_source" }, { status: 400 });
  try {
    await setPrice({ commodity: body.commodity, usd_per_kg: body.usd_per_kg, source, updated_at: new Date().toISOString() }, "admin");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
  }
}
