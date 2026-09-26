import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { applyIssuer, checkAdmin, consumeApRateLimit, issuerApplicationStatus, listIssuers, setIssuer } from "@/lib/db";

const validWallet = (wallet: string) => /^0x[0-9a-fA-F]{40}$/.test(wallet) && !/^0x0{40}$/i.test(wallet);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet") ?? "";
  if (wallet) {
    if (!validWallet(wallet)) return NextResponse.json({ error: "bad_wallet" }, { status: 400 });
    try {
      const status = await issuerApplicationStatus(wallet);
      return NextResponse.json({ wallet, approved: status === "approved", status });
    }
    catch { return NextResponse.json({ error: "database_unavailable" }, { status: 503 }); }
  }
  if (!checkAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try { return NextResponse.json({ issuers: await listIssuers() }); }
  catch { return NextResponse.json({ error: "database_unavailable" }, { status: 503 }); }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { wallet?: string; name?: string; contact?: string; approved?: boolean } | null;
  if (typeof body?.wallet !== "string" || !validWallet(body.wallet) || typeof body.approved !== "boolean" ||
      (body.name !== undefined && typeof body.name !== "string") || (body.contact !== undefined && typeof body.contact !== "string")) {
    return NextResponse.json({ error: "bad_input" }, { status: 400 });
  }
  const name = body.name?.trim() ?? "";
  const contact = body.contact?.trim() ?? "";
  if (name.length > 120 || contact.length > 254) return NextResponse.json({ error: "field_too_long" }, { status: 400 });
  if (!checkAdmin(req)) {
    if (body.approved !== false || !name) return NextResponse.json({ error: "pending_application_only" }, { status: 401 });
    const pepper = process.env.AP_RATE_LIMIT_SECRET || process.env.ADMIN_KEY;
    if (!pepper || pepper.length < 32) return NextResponse.json({ error: "rate_limit_unconfigured" }, { status: 503 });
    const ip = (req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown").slice(0, 120);
    const fingerprint = createHmac("sha256", pepper).update(ip).digest("hex");
    try {
      if (!(await consumeApRateLimit(fingerprint))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
      const created = await applyIssuer({ wallet: body.wallet, name, contact });
      return created
        ? NextResponse.json({ ok: true, wallet: body.wallet.toLowerCase(), approved: false, status: "pending" }, { status: 201 })
        : NextResponse.json({ error: "issuer_record_exists" }, { status: 409 });
    } catch {
      return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
    }
  }
  try {
    await setIssuer({ wallet: body.wallet, name, contact, approved: body.approved });
    return NextResponse.json({ ok: true, wallet: body.wallet.toLowerCase(), approved: body.approved });
  } catch {
    return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
  }
}
