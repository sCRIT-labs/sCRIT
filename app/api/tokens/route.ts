import { NextResponse } from "next/server";
import { listTokensFromDb, insertTokenToDb } from "@/lib/db";
import { mapDbTokenToLaunched } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await listTokensFromDb();
    const tokens = rows.map(mapDbTokenToLaunched);
    return NextResponse.json({
      status: "ok",
      tokens,
      count: tokens.length,
      timestamp: Date.now(),
    });
  } catch (err: unknown) {
    return NextResponse.json({
      status: "ok",
      tokens: [],
      count: 0,
      timestamp: Date.now(),
      error: err instanceof Error ? err.message : "db_unavailable",
    });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    const {
      chainId,
      address,
      name,
      symbol,
      creator,
      supply,
      pooled,
      scritAmount,
      txHash,
      poolId,
      poolType,
      logoUrl,
      backingCategory,
      description,
    } = body as Record<string, unknown>;

    if (!chainId || !address || !name || !symbol || !creator || !supply || !pooled || !scritAmount || !txHash || !poolId) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    const id = `${chainId}-${String(address).toLowerCase()}`;
    await insertTokenToDb({
      id,
      chain_id: Number(chainId),
      address: String(address),
      name: String(name),
      symbol: String(symbol),
      creator: String(creator),
      supply: String(supply),
      pooled: String(pooled),
      scrit_amount: String(scritAmount),
      tx_hash: String(txHash),
      pool_id: String(poolId),
      pool_type: String(poolType || (Number(chainId) === 4663 ? "v4_hook" : "v3_standard")),
      logo_url: logoUrl ? String(logoUrl) : null,
      backing_category: backingCategory ? String(backingCategory) : "Critical Commodity Reserve",
      description: description ? String(description) : "",
    });

    return NextResponse.json({ status: "ok", id });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "internal_error" }, { status: 500 });
  }
}
