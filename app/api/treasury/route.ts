import { NextResponse } from "next/server";
import { createPublicClient, defineChain, formatUnits, http, keccak256, toBytes, type Address, type Hash } from "viem";
import { checkAdmin, listTreasury, logTreasury } from "@/lib/db";

const transferTopic = keccak256(toBytes("Transfer(address,address,uint256)"));

function chainConfig() {
  const id = Number(process.env.TREASURY_CHAIN_ID ?? "4663");
  const known = id === 4663 ? "https://rpc.mainnet.chain.robinhood.com" : id === 46630 ? "https://rpc.testnet.chain.robinhood.com" : "";
  const rpc = process.env.TREASURY_RPC_URL || known;
  if (!rpc || !Number.isInteger(id)) throw new Error("treasury_chain_unconfigured");
  const chain = defineChain({ id, name: `sCRIT treasury chain ${id}`, nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [rpc] } } });
  return { id, client: createPublicClient({ chain, transport: http(rpc) }) };
}

export async function GET() {
  try { return NextResponse.json({ log: await listTreasury() }); }
  catch { return NextResponse.json({ error: "database_unavailable" }, { status: 503 }); }
}

export async function POST(req: Request) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { tx_hash?: string; note?: string } | null;
  if (typeof body?.tx_hash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(body.tx_hash) ||
      (body.note !== undefined && typeof body.note !== "string") || (body.note?.length ?? 0) > 240) {
    return NextResponse.json({ error: "bad_input" }, { status: 400 });
  }
  const token = process.env.NEXT_PUBLIC_SCRIT ?? "";
  const recipient = process.env.NEXT_PUBLIC_TREASURY ?? "";
  if (!/^0x[0-9a-fA-F]{40}$/.test(token) || !/^0x[0-9a-fA-F]{40}$/.test(recipient) || /^0x0{40}$/i.test(token) || /^0x0{40}$/i.test(recipient)) {
    return NextResponse.json({ error: "treasury_verification_unconfigured" }, { status: 503 });
  }
  try {
    const { id, client } = chainConfig();
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
    const status = message.includes("treasury_chain_unconfigured") ? 503 : 400;
    return NextResponse.json({ error: status === 503 ? message : "receipt_verification_failed" }, { status });
  }
}
