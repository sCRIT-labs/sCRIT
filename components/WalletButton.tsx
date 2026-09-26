"use client";

import { useState } from "react";
import type { Address } from "viem";
import { connectWallet, ensureChain, scritBalanceOf } from "@/lib/scrit-evm";
import { scritDeploymentFor } from "@/lib/scrit";

export function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default function WalletButton({
  chainId,
  onConnect,
}: {
  chainId: 4663 | 46630;
  onConnect: (account: Address, scritBal: bigint) => void;
}) {
  const [account, setAccount] = useState<Address | null>(null);
  const [err, setErr] = useState("");

  async function connect() {
    setErr("");
    try {
      await ensureChain(chainId);
      const acc = await connectWallet();
      const bal = await scritBalanceOf(chainId, acc, scritDeploymentFor(chainId).token).catch(() => 0n);
      setAccount(acc);
      onConnect(acc, bal);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "connect_failed");
    }
  }

  return (
    <div>
      {account ? (
        <span className="mono-sm" style={{ display: "inline-block", border: "1px solid var(--line)", borderRadius: 8, padding: "13px 15px", color: "var(--gold-bright)" }}>
          CONNECTED {shortAddr(account)}
        </span>
      ) : (
        <button className="btn btn-gold" style={{ width: "100%" }} onClick={connect}>
          Connect MetaMask
        </button>
      )}
      {err ? <p className="mono-sm" style={{ color: "var(--red)", marginTop: 8 }}>Error: {err}</p> : null}
    </div>
  );
}
