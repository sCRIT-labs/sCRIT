"use client";

import { useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import { ensureChain, scritBalanceOf } from "@/lib/scrit-evm";
import { scritDeploymentFor } from "@/lib/scrit";
import {
  EVM_WALLETS,
  clearWallet,
  loadWallet,
  silentEvmAccount,
  subscribeWalletChange,
  walletLabel,
  type EvmWalletId,
} from "@/lib/wallets";
import WalletModal from "./WalletModal";
import ChainLogo from "./ChainLogo";

export function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default function WalletButton({
  chainId,
  onConnect,
  onDisconnect,
}: {
  chainId: 4663 | 46630;
  onConnect: (account: Address, scritBal: bigint) => void;
  onDisconnect?: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [stored, setStored] = useState<{ id: EvmWalletId; address: string } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  useEffect(() => {
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
  });

  useEffect(() => {
    setMounted(true);
    const sync = () => {
      const saved = loadWallet();
      setStored(saved);
      if (saved?.address && /^0x[0-9a-fA-F]{40}$/.test(saved.address)) {
        const addr = saved.address as Address;
        onConnectRef.current(addr, 0n);
        void scritBalanceOf(chainId, addr, scritDeploymentFor(chainId).token)
          .then((bal) => {
            onConnectRef.current(addr, bal);
          })
          .catch(() => {});
      } else {
        onDisconnectRef.current?.();
      }
    };

    sync();
    const unsub = subscribeWalletChange(sync);
    return () => unsub();
  }, [chainId]);

  const walletMeta = mounted && stored ? EVM_WALLETS.find((w) => w.id === stored.id) : undefined;

  async function finish(id: EvmWalletId, account: string) {
    setErr("");
    setBusy(true);
    try {
      await ensureChain(chainId);
      const bal = await scritBalanceOf(chainId, account as Address, scritDeploymentFor(chainId).token).catch(() => 0n);
      setStored({ id, address: account });
      onConnect(account as Address, bal);
    } catch (e: unknown) {
      setErr(walletLabel(e));
    } finally {
      setBusy(false);
    }
  }

  async function continueStored() {
    if (!stored) {
      setModalOpen(true);
      return;
    }
    setErr("");
    setBusy(true);
    try {
      const quiet = await silentEvmAccount(stored.id);
      if (!quiet) {
        setBusy(false);
        setModalOpen(true);
        return;
      }
      await ensureChain(chainId);
      const bal = await scritBalanceOf(chainId, quiet as Address, scritDeploymentFor(chainId).token).catch(() => 0n);
      onConnect(quiet as Address, bal);
    } catch (e: unknown) {
      setErr(walletLabel(e));
    } finally {
      setBusy(false);
    }
  }

  function disconnect() {
    clearWallet();
    setStored(null);
    setErr("");
    onDisconnect?.();
  }

  return (
    <div>
      {stored && walletMeta ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- wallet brand mark served from /public */}
          <img src={walletMeta.icon} alt="" width={22} height={22} style={{ borderRadius: 5 }} />
          <span className="mono-sm" style={{ color: "var(--gold-bright)", fontWeight: 700 }}>{shortAddr(stored.address)}</span>
          <ChainLogo kind="hood" size={16} />
          <button type="button" onClick={disconnect} className="mono-sm" style={{ marginLeft: "auto", background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", textDecoration: "underline" }}>
            Disconnect
          </button>
        </div>
      ) : (
        <button className="btn btn-gold" style={{ width: "100%" }} onClick={continueStored} disabled={busy}>
          {busy ? "Connecting…" : stored ? `Continue as ${shortAddr(stored.address)}` : "Connect wallet"}
        </button>
      )}
      {err ? <p className="mono-sm" style={{ color: "var(--red)", marginTop: 8 }}>Error: {err}</p> : null}
      <WalletModal open={modalOpen} onClose={() => setModalOpen(false)} onPick={(id, address) => finish(id, address)} />
    </div>
  );
}
