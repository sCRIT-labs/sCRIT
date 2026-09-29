import { NextResponse } from "next/server";
import { createWalletClient, http, defineChain, parseEther, isAddress, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { HOOD_TESTNET } from "@/lib/scrit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SCRIT_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const recipient = body.recipient as string;
    const chainId = Number(body.chainId || 46630);

    if (!recipient || !isAddress(recipient)) {
      return NextResponse.json({ error: "invalid_address" }, { status: 400 });
    }

    // Only allow faucet for testnet or pilot rehearsal
    if (chainId !== 46630) {
      return NextResponse.json({ error: "faucet_available_on_testnet_only" }, { status: 403 });
    }

    const privateKey = (process.env.PRIVATE_KEY || process.env.TESTNET_DEPLOYER_PRIVATE_KEY) as `0x${string}`;
    const tokenAddress = (process.env.NEXT_PUBLIC_SCRIT_TESTNET || process.env.NEXT_PUBLIC_SCRIT) as Address;

    if (!privateKey || !tokenAddress) {
      return NextResponse.json({ error: "faucet_unconfigured" }, { status: 503 });
    }

    const account = privateKeyToAccount(privateKey);
    const chain = defineChain({
      id: 46630,
      name: HOOD_TESTNET.name,
      nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
      rpcUrls: { default: { http: [HOOD_TESTNET.rpc] } },
    });

    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(HOOD_TESTNET.rpc),
    });

    // Send 1,000 sCRIT
    const amount = parseEther("1000");
    const hash = await walletClient.writeContract({
      address: tokenAddress,
      abi: SCRIT_TRANSFER_ABI,
      functionName: "transfer",
      args: [recipient as Address, amount],
    });

    return NextResponse.json({
      ok: true,
      amount: "1000",
      txHash: hash,
      recipient,
    });
  } catch (err: unknown) {
    console.error("Faucet error:", err);
    let msg = "Faucet transfer could not be completed.";
    if (err instanceof Error) {
      if (/fetch failed|ECONNREFUSED|ENOTFOUND|timeout/i.test(err.message)) {
        msg = "Robinhood testnet RPC is currently unreachable. Please check network connectivity or retry shortly.";
      } else {
        msg = err.message.split("\n")[0] || "Faucet transfer reverted on chain.";
      }
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
