import { NextResponse } from "next/server";
import { createPublicClient, defineChain, encodeAbiParameters, http, keccak256, type Address, type Hex } from "viem";
import { HOOD_MAINNET } from "@/lib/scrit";
import { ethPerScritFromSqrtPrice, marketPriceUsd } from "@/lib/scrit-market";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATE_VIEW_ABI = [
  { type: "function", name: "getSlot0", stateMutability: "view", inputs: [{ name: "poolId", type: "bytes32" }], outputs: [{ name: "sqrtPriceX96", type: "uint160" }, { name: "tick", type: "int24" }, { name: "protocolFee", type: "uint24" }, { name: "lpFee", type: "uint24" }] },
  { type: "function", name: "getLiquidity", stateMutability: "view", inputs: [{ name: "poolId", type: "bytes32" }], outputs: [{ name: "liquidity", type: "uint128" }] },
] as const;
const ERC20_ABI = [{ type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint8" }] }] as const;
const ERC20_ZERO = "0x0000000000000000000000000000000000000000";
const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

function unavailable(reason: string, status = 200) {
  return NextResponse.json({ status: "unavailable", reason }, { status, headers: NO_STORE });
}

export async function GET() {
  if (process.env.NEXT_PUBLIC_SCRIT_CHAIN_ID !== "4663") return unavailable("mainnet_market_not_selected");
  const poolId = process.env.SCRIT_BASE_POOL_ID_MAINNET ?? process.env.NEXT_PUBLIC_SCRIT_BASE_POOL_ID_MAINNET;
  const token = process.env.NEXT_PUBLIC_SCRIT_MAINNET;
  const rpc = process.env.ROBINHOOD_MAINNET_RPC_URL || HOOD_MAINNET.rpc;
  const stateView = (process.env.MAINNET_V4_STATE_VIEW_ADDRESS || process.env.NEXT_PUBLIC_SCRIT_V4_STATE_VIEW_MAINNET || "0xf3334192d15450cdd385c8b70e03f9a6bd9e673b") as Address;

  if (!poolId || !/^0x[0-9a-fA-F]{64}$/.test(poolId) || !token || !/^0x[0-9a-fA-F]{40}$/.test(token) || token.toLowerCase() === ERC20_ZERO) {
    return unavailable("canonical_market_not_configured");
  }
  const canonicalPoolId = keccak256(encodeAbiParameters(
    [{ type: "tuple", components: [
      { name: "currency0", type: "address" }, { name: "currency1", type: "address" },
      { name: "fee", type: "uint24" }, { name: "tickSpacing", type: "int24" }, { name: "hooks", type: "address" },
    ] }],
    [{ currency0: ERC20_ZERO as Address, currency1: token as Address, fee: 3_000, tickSpacing: 60, hooks: ERC20_ZERO as Address }],
  ));
  if (canonicalPoolId.toLowerCase() !== poolId.toLowerCase()) return unavailable("pool_id_does_not_match_canonical_key");

  try {
    const chain = defineChain({ id: 4663, name: HOOD_MAINNET.name, nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [rpc] } } });
    const client = createPublicClient({ chain, transport: http(rpc, { timeout: 8_000 }) });
    const [chainId, blockNumber, slot0, liquidity, tokenDecimals] = await Promise.all([
      client.getChainId(),
      client.getBlockNumber(),
      client.readContract({ address: stateView, abi: STATE_VIEW_ABI, functionName: "getSlot0", args: [poolId as Hex] }),
      client.readContract({ address: stateView, abi: STATE_VIEW_ABI, functionName: "getLiquidity", args: [poolId as Hex] }),
      client.readContract({ address: token as Address, abi: ERC20_ABI, functionName: "decimals" }),
    ]);
    if (chainId !== 4663) return unavailable("wrong_rpc_chain");
    const [sqrtPriceX96] = slot0;
    if (sqrtPriceX96 === 0n || liquidity === 0n) return unavailable("canonical_market_uninitialized");

    const priceResponse = await fetch("https://coins.llama.fi/prices/current/coingecko:ethereum", { cache: "no-store", signal: AbortSignal.timeout(5_000) });
    if (!priceResponse.ok) return unavailable("eth_usd_source_unavailable");
    const priceBody = await priceResponse.json() as { coins?: Record<string, { price?: number; timestamp?: number; confidence?: number }> };
    const eth = priceBody.coins?.["coingecko:ethereum"];
    const now = Math.floor(Date.now() / 1000);
    if (!eth || !Number.isFinite(eth.price) || !eth.timestamp || eth.timestamp > now + 60 || now - eth.timestamp > 15 * 60) {
      return unavailable("eth_usd_quote_stale_or_missing");
    }

    const ethPerScrit = ethPerScritFromSqrtPrice(sqrtPriceX96, tokenDecimals);
    const priceUsd = marketPriceUsd(ethPerScrit, eth.price!);
    if (priceUsd === null) return unavailable("market_quote_invalid");
    return NextResponse.json({
      status: "ready",
      chainId,
      poolId,
      blockNumber: blockNumber.toString(),
      marketPriceUsd: priceUsd,
      marketPriceEth: ethPerScrit,
      ethUsd: eth.price,
      ethUsdSource: "DeFiLlama · coingecko:ethereum",
      ethUsdUpdatedAt: new Date(eth.timestamp * 1000).toISOString(),
      poolPriceSource: "Uniswap V4 spot price · canonical sCRIT/ETH pool",
      liquidity: liquidity.toString(),
      observedAt: new Date().toISOString(),
    }, { headers: NO_STORE });
  } catch {
    return unavailable("market_rpc_or_price_source_failed");
  }
}
