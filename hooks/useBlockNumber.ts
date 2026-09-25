"use client";

import { useEffect, useState } from "react";
import { createPublicClient, http } from "viem";
import { HOOD_MAINNET } from "../lib/scrit";

/** Live Robinhood Chain block height, polled. Null until first read / on RPC failure. */
export function useBlockNumber(intervalMs = 8000): bigint | null {
  const [block, setBlock] = useState<bigint | null>(null);

  useEffect(() => {
    let alive = true;
    const client = createPublicClient({ transport: http(HOOD_MAINNET.rpc) });
    const poll = async () => {
      try {
        const n = await client.getBlockNumber();
        if (alive) setBlock(n);
      } catch {
        /* offline: keep last */
      }
    };
    void poll();
    const id = setInterval(() => void poll(), intervalMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [intervalMs]);

  return block;
}
