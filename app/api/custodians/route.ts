import { NextResponse } from "next/server";
import { checkAdmin, listCustodians, registerCustodian } from "@/lib/db";
import { isValidAddress } from "@/lib/custodians";
import { isCommoditySymbol } from "@/lib/scrit-basket";

export async function GET() {
  try {
    return NextResponse.json({ custodians: await listCustodians(), note: "A demo key is not evidence of contracted custody." });
  } catch {
    return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
  }
}

export async function POST(req: Request) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { address?: string; name?: string; scope?: string[]; status?: string } | null;
  if (typeof body?.address !== "string" || !isValidAddress(body.address)) return NextResponse.json({ error: "bad_address" }, { status: 400 });
  if (body.status === "contracted") return NextResponse.json({ error: "contract_evidence_required" }, { status: 400 });
  if (body.name !== undefined && typeof body.name !== "string") return NextResponse.json({ error: "bad_name" }, { status: 400 });
  const name = body.name?.trim() ?? "";
  if (name.length < 1 || name.length > 100) return NextResponse.json({ error: "bad_name" }, { status: 400 });
  if (body.scope !== undefined && (!Array.isArray(body.scope) || body.scope.some((s) => typeof s !== "string" || !isCommoditySymbol(s)))) {
    return NextResponse.json({ error: "invalid_scope" }, { status: 400 });
  }
  const scope = [...new Set(body.scope ?? [])];
  if (scope.length === 0) return NextResponse.json({ error: "empty_scope" }, { status: 400 });
  try {
    await registerCustodian({ address: body.address, name, scope, status: "demo", created_at: new Date().toISOString() });
    return NextResponse.json({ ok: true, scope });
  } catch {
    return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
  }
}

export async function PATCH(req: Request) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { address?: string; status?: string } | null;
  if (typeof body?.address !== "string" || !isValidAddress(body.address) || body.status !== "revoked") {
    return NextResponse.json({ error: "bad_input" }, { status: 400 });
  }
  try {
    const current = (await listCustodians()).find((c) => c.address.toLowerCase() === body.address!.toLowerCase());
    if (!current) return NextResponse.json({ error: "custodian_not_found" }, { status: 404 });
    await registerCustodian({ ...current, status: "revoked" });
    return NextResponse.json({ ok: true, status: "revoked" });
  } catch {
    return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
  }
}
