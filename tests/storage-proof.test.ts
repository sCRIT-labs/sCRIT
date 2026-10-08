import https from "node:https";
import { describe, it, expect } from "vitest";
import { fetchAccountStorageProof } from "../lib/verify/storage-proof";
import { getCanonicalAddress } from "../lib/addresses";
import { createPublicClient, defineChain, http } from "viem";

const nodeRpcFetch = (url: any, options: any = {}) =>
  new Promise<Response>((resolve, reject) => {
    const u = new URL(url.toString());
    const isHood = u.hostname.includes("chain.robinhood.com");
    const host = isHood ? "172.66.147.70" : u.hostname;
    const req = https.request(
      {
        hostname: host,
        port: 443,
        path: u.pathname + u.search,
        method: options.method || "POST",
        headers: { ...options.headers, Host: u.hostname },
        servername: u.hostname,
        timeout: 15000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve(new Response(Buffer.concat(chunks), { status: res.statusCode, headers: res.headers as any }))
        );
      }
    );
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("RPC timeout")));
    if (options.body) req.write(options.body);
    req.end();
  });

const testClient = createPublicClient({
  chain: defineChain({
    id: 4663,
    name: "Robinhood Chain",
    nativeCurrency: { decimals: 18, name: "ETH", symbol: "ETH" },
    rpcUrls: { default: { http: ["https://rpc.mainnet.chain.robinhood.com"] } },
  }),
  transport: http("https://rpc.mainnet.chain.robinhood.com", {
    fetchOptions: {},
    fetchFn: nodeRpcFetch as any,
  }),
});

describe("Trust-Minimised Storage Proof (v1.1)", () => {
  it("fetches and validates Merkle-Patricia account storage proof from RPC", async () => {
    const deadAddr = getCanonicalAddress("Dead");
    const result = await fetchAccountStorageProof(deadAddr as `0x${string}`, 4663, testClient);

    expect(result.account.toLowerCase()).toBe(deadAddr.toLowerCase());
    expect(result.blockNumber).toBeGreaterThan(0n);
    expect(result.stateRoot).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(result.storageHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(result.verified).toBe(true);
    expect(result.message).toBe(
      "Checks the value against the block's state root. Still trusts the block header."
    );
  }, 30000);
});
