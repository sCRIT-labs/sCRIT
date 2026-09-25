import { NextResponse } from "next/server";
import { checkAdmin, listCustodians, registerCustodian } from "@/lib/db";
import { isValidAddress } from "@/lib/custodians";

const PILOT_COMMODITIES = ["Au", "Ag", "Pt"];

export async function GET() {
  const list = await listCustodians();
  return NextResponse.json({
    custodians: list,
    note: "Pilot: demo keys only. Contracted custodians pending — see /proof evidence table.",
  });
}

export async function POST(req: Request) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as {
    address?: string;
    name?: string;
    scope?: string[];
    status?: "demo" | "contracted";
  } | null;
  if (!body?.address || !isValidAddress(body.address)) {
    return NextResponse.json({ error: "bad_address" }, { status: 400 });
  }
  const scope = (body.scope ?? []).filter((s) => PILOT_COMMODITIES.includes(s));
  if (scope.length === 0) return NextResponse.json({ error: "empty_scope" }, { status: 400 });
  await registerCustodian({
    address: body.address,
    name: body.name ?? "unnamed key",
    scope,
    status: body.status === "contracted" ? "contracted" : "demo",
    created_at: new Date().toISOString(),
  });
  return NextResponse.json({ ok: true, scope });
}
