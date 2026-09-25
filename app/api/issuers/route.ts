import { NextResponse } from "next/server";
import { checkAdmin, isIssuerApproved, listIssuers, setIssuer } from "@/lib/db";

const validWallet = (wallet: string) => /^0x[0-9a-fA-F]{40}$/.test(wallet) && !/^0x0{40}$/i.test(wallet);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet") ?? "";
  if (wallet) {
    if (!validWallet(wallet)) return NextResponse.json({ error: "bad_wallet" }, { status: 400 });
    try { return NextResponse.json({ wallet, approved: await isIssuerApproved(wallet) }); }
    catch { return NextResponse.json({ error: "database_unavailable" }, { status: 503 }); }
  }
  if (!checkAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try { return NextResponse.json({ issuers: await listIssuers() }); }
  catch { return NextResponse.json({ error: "database_unavailable" }, { status: 503 }); }
}

export async function POST(req: Request) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { wallet?: string; name?: string; contact?: string; approved?: boolean } | null;
  if (typeof body?.wallet !== "string" || !validWallet(body.wallet) || typeof body.approved !== "boolean" ||
      (body.name !== undefined && typeof body.name !== "string") || (body.contact !== undefined && typeof body.contact !== "string")) {
    return NextResponse.json({ error: "bad_input" }, { status: 400 });
  }
  const name = body.name?.trim() ?? "";
  const contact = body.contact?.trim() ?? "";
  if (name.length > 120 || contact.length > 254) return NextResponse.json({ error: "field_too_long" }, { status: 400 });
  try {
    await setIssuer({ wallet: body.wallet, name, contact, approved: body.approved });
    return NextResponse.json({ ok: true, wallet: body.wallet.toLowerCase(), approved: body.approved });
  } catch {
    return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
  }
}
