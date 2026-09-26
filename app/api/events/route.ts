import { NextResponse } from "next/server";
import { listChainEvents } from "@/lib/db";

export async function GET(request: Request) {
  const limitParam = new URL(request.url).searchParams.get("limit");
  const chainIdParam = new URL(request.url).searchParams.get("chainId");
  const limit = limitParam ? Number(limitParam) : 100;
  const chainId = chainIdParam ? Number(chainIdParam) : 46630;
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    return NextResponse.json({ error: "invalid_limit" }, { status: 400 });
  }
  if (chainId !== 4663 && chainId !== 46630) {
    return NextResponse.json({ error: "invalid_chain_id" }, { status: 400 });
  }
  try {
    return NextResponse.json({ events: await listChainEvents(limit, chainId), chainId });
  } catch {
    return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
  }
}
