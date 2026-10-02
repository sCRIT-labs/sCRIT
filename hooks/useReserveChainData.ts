"use client";

import { useEffect, useState } from "react";
import { createPublicClient, defineChain, http, type Address } from "viem";
import { SCRIT_INDEX_ABI, SCRIT_RESERVE_ABI } from "@/lib/scrit-artifact";
import { HOOD_MAINNET, HOOD_TESTNET, SCRIT_CHAIN_ID, scritDeploymentFor } from "@/lib/scrit";
import { BASKET } from "@/lib/scrit-basket";

const network = SCRIT_CHAIN_ID === 4663 ? HOOD_MAINNET : HOOD_TESTNET;
const chain = defineChain({
  id: network.id,
  name: network.name,
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [network.rpc] } },
  blockExplorers: { default: { name: "Robinhood Explorer", url: network.explorer } },
});
const rpcUrl = typeof window !== "undefined" ? `/api/rpc?chainId=${network.id}` : network.rpc;
const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
const configured = (value?: string): value is Address => Boolean(value && /^0x[0-9a-fA-F]{40}$/.test(value) && !/^0x0{40}$/i.test(value));
const deployment = scritDeploymentFor(SCRIT_CHAIN_ID);

export type ReserveChainState = {
  status: "unconfigured" | "loading" | "ready" | "unavailable";
  chainId: number;
  reserveManager?: Address;
  token?: Address;
  reserveValueUsdE8?: bigint | null;
  supplyE18?: bigint;
  holdingsKgE12?: Record<string, bigint>;
  blockNumber?: bigint;
};

export function useReserveChainData(): ReserveChainState {
  const token = deployment.token as Address | undefined;
  const reserveManager = deployment.reserveManager as Address | undefined;
  const [state, setState] = useState<ReserveChainState>({ status: "unconfigured", chainId: chain.id });

  useEffect(() => {
    if (!configured(token) || !configured(reserveManager)) {
      setState({ status: "unconfigured", chainId: chain.id });
      return;
    }
    let active = true;
    const read = async () => {
      setState((previous) => ({ ...previous, status: previous.status === "ready" ? "ready" : "loading", chainId: chain.id, token, reserveManager }));
      try {
        const [chainId, blockNumber, supplyE18, ...holdings] = await Promise.all([
          publicClient.getChainId(), publicClient.getBlockNumber(),
          publicClient.readContract({ address: token, abi: SCRIT_INDEX_ABI, functionName: "totalSupply" }),
          ...BASKET.map((_, commodity) => publicClient.readContract({ address: reserveManager, abi: SCRIT_RESERVE_ABI, functionName: "holdingsKgE12", args: [commodity] })),
        ]);
        if (chainId !== chain.id) throw new Error("wrong_chain");
        const reserveValueUsdE8 = await publicClient.readContract({ address: reserveManager, abi: SCRIT_RESERVE_ABI, functionName: "currentReserveValue" }).catch(() => null);
        if (active) setState({ status: "ready", chainId, reserveManager, token, reserveValueUsdE8, supplyE18, holdingsKgE12: Object.fromEntries(BASKET.map((row, index) => [row.symbol, holdings[index] as bigint])), blockNumber });
      } catch {
        if (active) setState({ status: "unavailable", chainId: chain.id, reserveManager, token });
      }
    };
    void read();
    const timer = window.setInterval(read, 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [token, reserveManager]);

  return state;
}
