import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import type { Address } from "viem";
import { checkAdmin, consumeApRateLimit, issuerApplicationStatus, listIssuers, setIssuer } from "@/lib/db";
import { processIssuerApprovalOnChain } from "@/lib/issuer-onchain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function rateLimitKey(req: Request): string {
  const pepper = process.env.AP_RATE_LIMIT_SECRET || process.env.ADMIN_KEY || "";
  const ip = (req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown").slice(0, 120);
  return createHmac("sha256", pepper).update(`issuers:${ip}`).digest("hex");
}

const validWallet = (wallet: string) => /^0x[0-9a-fA-F]{40}$/.test(wallet) && !/^0x0{40}$/i.test(wallet);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet") ?? "";
  if (wallet) {
    if (!validWallet(wallet)) return NextResponse.json({ error: "bad_wallet" }, { status: 400 });
    try {
      const status = await issuerApplicationStatus(wallet);
      return NextResponse.json({ wallet: wallet.toLowerCase(), approved: status === "approved", status });
    } catch {
      return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
    }
  }
  if (!checkAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ issuers: await listIssuers() });
  } catch {
    return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    wallet?: string;
    name?: string;
    contact?: string;
    approved?: boolean;
    chainId?: 4663 | 46630;
  } | null;

  if (
    typeof body?.wallet !== "string" ||
    !validWallet(body.wallet) ||
    (body.approved !== undefined && typeof body.approved !== "boolean") ||
    (body.name !== undefined && typeof body.name !== "string") ||
    (body.contact !== undefined && typeof body.contact !== "string")
  ) {
    return NextResponse.json({ error: "bad_input" }, { status: 400 });
  }

  const targetWallet = body.wallet.toLowerCase() as Address;
  const name = body.name?.trim() ?? "";
  const contact = body.contact?.trim() ?? "";
  if (name.length > 120 || contact.length > 254) {
    return NextResponse.json({ error: "field_too_long" }, { status: 400 });
  }

  if (name.length === 0) {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }
  const targetName = name;
  const targetContact = contact;

  // If caller attempts an explicit approval flag without admin privileges, reject as unauthorized
  if (body.approved !== undefined && !checkAdmin(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // If admin sends approved explicitly with valid credentials, execute direct update
  if (checkAdmin(req) && body.approved !== undefined) {
    try {
      await setIssuer({
        wallet: targetWallet,
        name: targetName,
        contact: targetContact,
        approved: body.approved,
      });
      return NextResponse.json({
        ok: true,
        wallet: targetWallet,
        approved: body.approved,
        status: body.approved ? "approved" : "pending",
      });
    } catch {
      return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
    }
  }

  // Abuse guard: public submissions are rate-limited per IP so a funded
  // spammer cannot trigger unlimited operator-paid timelock transactions.
  const pepper = process.env.AP_RATE_LIMIT_SECRET || process.env.ADMIN_KEY || "";
  if (pepper.length < 32) {
    return NextResponse.json({ error: "rate_limit_unconfigured" }, { status: 503 });
  }
  try {
    if (!(await consumeApRateLimit(rateLimitKey(req)))) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
  } catch {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }

  // Real-Time Algorithmic On-Chain Approval Engine:
  // 1. Checks on-chain sCRIT anti-spam balance (>= 0.001 sCRIT)
  // 2. If valid, signs and broadcasts Timelock allowlist transaction directly
  const result = await processIssuerApprovalOnChain(targetWallet, body.chainId);

  if (!result.approved) {
    try {
      await setIssuer({
        wallet: targetWallet,
        name: targetName,
        contact: targetContact,
        approved: false,
      });
    } catch (e) {
      console.warn("[api/issuers] failed to record pending application in DB:", e);
    }

    return NextResponse.json(
      {
        ok: false,
        wallet: targetWallet,
        approved: false,
        status: "pending",
        code: result.code || "insufficient_scrit",
        balance: result.balanceFormatted,
        message: result.message,
      },
      { status: 400 }
    );
  }

  // Successfully approved on-chain or credentials satisfied
  try {
    await setIssuer({
      wallet: targetWallet,
      name: targetName,
      contact: targetContact,
      approved: true,
    });
  } catch (e) {
    console.warn("[api/issuers] DB write warning:", e);
  }

  return NextResponse.json(
    {
      ok: true,
      wallet: targetWallet,
      approved: true,
      status: "approved",
      onchain: result.onchain,
      txHash: result.txHash,
      message: result.message,
    },
    { status: 200 }
  );
}
