import { NextResponse } from "next/server";
import { listTreasury, logTreasury } from "@/lib/db";

export async function GET() {
  return NextResponse.json({ log: await listTreasury() });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    kind?: string;
    amount_text?: string;
    tx_hash?: string;
    note?: string;
  } | null;
  if (!body?.kind || !body.amount_text) {
    return NextResponse.json({ error: "bad_input" }, { status: 400 });
  }
  await logTreasury({
    kind: body.kind,
    amount_text: body.amount_text,
    tx_hash: body.tx_hash ?? "",
    note: body.note ?? "",
  });
  return NextResponse.json({ ok: true });
}
