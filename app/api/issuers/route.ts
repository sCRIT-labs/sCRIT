import { NextResponse } from "next/server";
import { isIssuerApproved } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet") ?? "";
  if (!/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
    return NextResponse.json({ error: "bad_wallet" }, { status: 400 });
  }
  return NextResponse.json({ wallet, approved: await isIssuerApproved(wallet) });
}

export async function POST(req: Request) {
  // Pilot: issuance requests go to Telegram (env NEXT_PUBLIC_TELEGRAM).
  // This endpoint only checks; approvals are manual via DB/admin.
  return NextResponse.json({
    ok: false,
    message: "Gated pilot — request access via Telegram.",
    telegram: process.env.NEXT_PUBLIC_TELEGRAM ?? "",
  });
}
