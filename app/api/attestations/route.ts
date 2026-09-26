import { NextResponse } from "next/server";
import { checkAdmin, custodianScopeFor, listAttestations, listCustodians, saveAttestation } from "@/lib/db";
import { verifyAttestation, type AttestationMsg } from "@/lib/attestation";
import { isValidAddress } from "@/lib/custodians";
import { isCommoditySymbol } from "@/lib/scrit-basket";
import { attestationConfigFor, selectedChainIdFor } from "@/lib/network-api-config";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const MAX_FUTURE_SKEW_SECONDS = 5 * 60;

export async function GET() {
  const chainId = selectedChainIdFor(process.env);
  if (!chainId) return NextResponse.json({ error: "chain_unconfigured" }, { status: 503 });
  try {
    return NextResponse.json({ attestations: await listAttestations(chainId), chainId });
  } catch {
    return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
  }
}

export async function POST(req: Request) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const config = attestationConfigFor(process.env);
  if (!config || !isValidAddress(config.verifying)) {
    return NextResponse.json({ error: "attestation_verifier_unconfigured" }, { status: 503 });
  }
  const { verifying, chainId } = config;
  const body = (await req.json().catch(() => null)) as {
    message?: AttestationMsg & { timestamp: number | string };
    signature?: `0x${string}`;
  } | null;
  const raw = body?.message;
  if (!raw || !body?.signature || !/^0x[0-9a-fA-F]{130}$/.test(body.signature)) {
    return NextResponse.json({ error: "bad_input" }, { status: 400 });
  }
  if (typeof raw.batchId !== "string" || !/^[A-Za-z0-9._:-]{1,100}$/.test(raw.batchId) ||
      typeof raw.commodity !== "string" || !isCommoditySymbol(raw.commodity) ||
      typeof raw.massKg !== "string" || !/^(?:0|[1-9]\d{0,17})(?:\.\d{1,12})?$/.test(raw.massKg) || Number(raw.massKg) <= 0 ||
      typeof raw.gradeSpec !== "string" || raw.gradeSpec.length < 1 || raw.gradeSpec.length > 100 ||
      typeof raw.certificateHash !== "string" || raw.certificateHash.length < 1 || raw.certificateHash.length > 256 ||
      typeof raw.vaultId !== "string" || raw.vaultId.length < 1 || raw.vaultId.length > 100) {
    return NextResponse.json({ error: "bad_message" }, { status: 400 });
  }
  let timestamp: bigint;
  try {
    if (!/^[0-9]{10,12}$/.test(String(raw.timestamp))) throw new Error();
    timestamp = BigInt(raw.timestamp);
  } catch {
    return NextResponse.json({ error: "bad_timestamp" }, { status: 400 });
  }
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (timestamp > now + BigInt(MAX_FUTURE_SKEW_SECONDS) || timestamp < now - BigInt(MAX_AGE_SECONDS)) {
    return NextResponse.json({ error: "stale_timestamp" }, { status: 400 });
  }
  const msg: AttestationMsg = { ...raw, timestamp };
  try {
    const custodians = await listCustodians();
    let signer: string | undefined;
    for (const c of custodians) {
      if (c.status === "revoked" || !c.scope.includes(msg.commodity)) continue;
      const scope = await custodianScopeFor(c.address);
      if (!scope?.some((s) => s.toLowerCase() === msg.commodity.toLowerCase())) continue;
      const ok = await verifyAttestation({
        chainId,
        verifying,
        message: msg,
        signature: body.signature,
        expected: c.address,
      }).catch(() => false);
      if (ok) { signer = c.address; break; }
    }
    if (!signer) return NextResponse.json({ error: "unknown_or_invalid_custodian_signature" }, { status: 403 });
    const saved = await saveAttestation({
      batch_id: msg.batchId, chain_id: String(chainId), commodity: msg.commodity, mass_kg: msg.massKg, grade_spec: msg.gradeSpec,
      certificate_hash: msg.certificateHash, vault_id: msg.vaultId, custodian: signer,
      signature: body.signature, timestamp: timestamp.toString(),
    });
    if (!saved) return NextResponse.json({ error: "duplicate_batch_id" }, { status: 409 });
    return NextResponse.json({ ok: true, custodian: signer });
  } catch {
    return NextResponse.json({ error: "database_or_verification_unavailable" }, { status: 503 });
  }
}
