import { NextRequest, NextResponse } from "next/server";
import https from "node:https";

// Cloudflare Anycast edge IP for Robinhood Chain RPC (bypasses local ISP DNS poisoning)
const ROBINHOOD_RPC_IP = "172.66.147.70";

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const chainId = searchParams.get("chainId") === "46630" ? 46630 : 4663;
  const targetHost = chainId === 4663 ? "rpc.mainnet.chain.robinhood.com" : "rpc.testnet.chain.robinhood.com";
  const body = await req.text();

  const sendRequest = (): Promise<{ status: number; data: string }> =>
    new Promise((resolve) => {
      const clientReq = https.request(
        {
          hostname: ROBINHOOD_RPC_IP,
          port: 443,
          path: "/",
          method: "POST",
          headers: {
            Host: targetHost,
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
          },
          servername: targetHost,
          timeout: 10000,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => resolve({ status: res.statusCode || 200, data }));
        }
      );

      clientReq.on("error", (err) => {
        resolve({
          status: 502,
          data: JSON.stringify({ jsonrpc: "2.0", id: 1, error: { message: err.message } }),
        });
      });

      clientReq.write(body);
      clientReq.end();
    });

  let result = await sendRequest();
  if (result.status === 429) {
    await new Promise((r) => setTimeout(r, 400));
    result = await sendRequest();
  }

  return new NextResponse(result.data, {
    status: result.status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
