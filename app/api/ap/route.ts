import { NextResponse } from "next/server";
import { applyAP, listApApps } from "@/lib/db";

/**
 * Authorised-participant track (§3.3 option B roadmap).
 * Pilot has NO active APs and NO redemption — this endpoint only queues
 * counterparties for diligence. Honest by construction.
 */
export async function GET() {
  const apps = await listApApps();
  return NextResponse.json({
    active: [],
    pending: apps.length,
    redemption: "none-in-pilot",
    note: "No AP counterparties signed. Applications are queued for diligence only.",
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    wallet?: string;
    name?: string;
    contact?: string;
  } | null;
  if (!body?.wallet || !/^0x[0-9a-fA-F]{40}$/.test(body.wallet)) {
    return NextResponse.json({ error: "bad_wallet" }, { status: 400 });
  }
  await applyAP({
    wallet: body.wallet.toLowerCase(),
    name: body.name ?? "",
    contact: body.contact ?? "",
    status: "pending",
    created_at: new Date().toISOString(),
  });
  return NextResponse.json({ ok: true, status: "pending" });
}
