import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { applyAP, checkAdmin, consumeApRateLimit, listApApps } from "@/lib/db";

export async function GET(req: Request) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const apps = await listApApps();
    return NextResponse.json({ applications: apps, active: [], pending: apps.length, redemption: "none-in-pilot", note: "No AP counterparties are signed; applications are diligence only." });
  } catch {
    return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const pepper = process.env.AP_RATE_LIMIT_SECRET || process.env.ADMIN_KEY;
  if (!pepper || pepper.length < 32) return NextResponse.json({ error: "rate_limit_unconfigured" }, { status: 503 });
  const ip = (req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown").slice(0, 120);
  const fingerprint = createHmac("sha256", pepper).update(ip).digest("hex");
  try {
    if (!(await consumeApRateLimit(fingerprint))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  } catch {
    return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
  }
  const body = (await req.json().catch(() => null)) as { wallet?: string; name?: string; contact?: string } | null;
  if (typeof body?.wallet !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(body.wallet) || /^0x0{40}$/i.test(body.wallet) ||
      (body.name !== undefined && typeof body.name !== "string") || (body.contact !== undefined && typeof body.contact !== "string")) {
    return NextResponse.json({ error: "bad_wallet" }, { status: 400 });
  }
  const name = body.name?.trim() ?? "";
  const contact = body.contact?.trim() ?? "";
  if (name.length < 2 || name.length > 120 || contact.length < 3 || contact.length > 254) {
    return NextResponse.json({ error: "bad_application" }, { status: 400 });
  }
  try {
    const inserted = await applyAP({ wallet: body.wallet.toLowerCase(), name, contact, status: "pending", created_at: new Date().toISOString() });
    return NextResponse.json({ ok: true, status: "pending", duplicate: !inserted });
  } catch {
    return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
  }
}
