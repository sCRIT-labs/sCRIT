import { NextResponse } from "next/server";
import { checkAdmin, custodianScopeFor, listAttestations, saveAttestation } from "@/lib/db";
import { verifyAttestation, type AttestationMsg } from "@/lib/attestation";

export async function GET() {
  return NextResponse.json({ attestations: await listAttestations() });
}

export async function POST(req: Request) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as {
    message?: AttestationMsg & { timestamp: number | string };
    signature?: `0x${string}`;
  } | null;
  if (!body?.message || !body.signature) {
    return NextResponse.json({ error: "bad_input" }, { status: 400 });
  }
  if (!["Au", "Ag", "Pt"].includes(body.message.commodity)) {
    return NextResponse.json({ error: "pilot_only_Au_Ag_Pt" }, { status: 400 });
  }
  const custodian = process.env.CUSTODIAN_DEMO_ADDRESS ?? "";
  const msg: AttestationMsg = {
    ...body.message,
    timestamp: BigInt(body.message.timestamp),
  };
  const ok = await verifyAttestation({
    chainId: 4663,
    verifying: process.env.NEXT_PUBLIC_SCRIT_LAUNCHER ?? "0x0000000000000000000000000000000000000000",
    message: msg,
    signature: body.signature,
    expected: custodian,
  }).catch(() => false);
  if (!ok) return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  // Per-class scoping (§5.2): a key valid for one class cannot attest another.
  const scope = await custodianScopeFor(custodian);
  if (!scope) return NextResponse.json({ error: "unknown_custodian" }, { status: 403 });
  if (!scope.some((s) => s.toLowerCase() === msg.commodity.toLowerCase())) {
    return NextResponse.json({ error: "out_of_scope", scope }, { status: 403 });
  }
  await saveAttestation({
    batch_id: msg.batchId,
    commodity: msg.commodity,
    mass_kg: msg.massKg,
    grade_spec: msg.gradeSpec,
    certificate_hash: msg.certificateHash,
    vault_id: msg.vaultId,
    custodian,
    signature: body.signature,
    created_at: new Date().toISOString(),
  });
  return NextResponse.json({ ok: true });
}
