import { NextResponse } from "next/server";
import { createPublicClient, defineChain, formatUnits, http, keccak256, toBytes, type Address, type Hash } from "viem";
import { checkAdmin, listTreasury, logTreasury } from "@/lib/db";
import { selectedChainIdFor, treasuryConfigFor } from "@/lib/network-api-config";

const transferTopic = keccak256(toBytes("Transfer(address,address,uint256)"));

function chainConfig(config: NonNullable<ReturnType<typeof treasuryConfigFor>>) {
  const chain = defineChain({ id: config.chainId, name: `sCRIT treasury chain ${config.chainId}`, nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [config.rpcUrl] } } });
  return { id: config.chainId, client: createPublicClient({ chain, transport: http(config.rpcUrl) }) };
}

export async function GET() {
  const chainId = selectedChainIdFor(process.env);
  if (!chainId) return NextResponse.json({ error: "chain_unconfigured" }, { status: 503 });
  try { return NextResponse.json({ log: await listTreasury(chainId), chainId }); }
  catch { return NextResponse.json({ error: "database_unavailable" }, { status: 503 }); }
}

export async function POST(req: Request) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { tx_hash?: string; note?: string } | null;
  if (typeof body?.tx_hash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(body.tx_hash) ||
      (body.note !== undefined && typeof body.note !== "string") || (body.note?.length ?? 0) > 240) {
    return NextResponse.json({ error: "bad_input" }, { status: 400 });
  }
  const config = treasuryConfigFor(process.env);
  if (!config) {
    return NextResponse.json({ error: "treasury_verification_unconfigured" }, { status: 503 });
  }
  const { token, recipient } = config;
  try {
    const { id, client } = chainConfig(config);
    if (await client.getChainId() !== id) {
      return NextResponse.json({ error: "treasury_rpc_chain_mismatch" }, { status: 503 });
    }
    const hash = body.tx_hash as Hash;
    const receipt = await client.getTransactionReceipt({ hash });
    if (receipt.status !== "success") return NextResponse.json({ error: "transaction_reverted" }, { status: 400 });
    const transfers = receipt.logs.filter((log) => log.address.toLowerCase() === token.toLowerCase() &&
      log.topics[0]?.toLowerCase() === transferTopic.toLowerCase() && log.topics.length === 3 &&
      `0x${log.topics[2]!.slice(-40)}`.toLowerCase() === recipient.toLowerCase());
    if (transfers.length !== 1) return NextResponse.json({ error: "verified_treasury_transfer_required" }, { status: 400 });
    const log = transfers[0]!;
    const sender = `0x${log.topics[1]!.slice(-40)}` as Address;
    const amount = BigInt(log.data);
    if (amount <= 0n) return NextResponse.json({ error: "zero_transfer" }, { status: 400 });
    const saved = await logTreasury({
      kind: "verified_token_transfer", amount_text: `${formatUnits(amount, 18)} sCRIT`, token, sender, recipient,
      tx_hash: hash, chain_id: String(id), note: body.note?.trim() ?? "",
    });
    if (!saved) return NextResponse.json({ error: "duplicate_transaction" }, { status: 409 });
    return NextResponse.json({ ok: true, verified: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "verification_failed";
    return NextResponse.json({ error: "receipt_verification_failed" }, { status: 400 });
  }
}
