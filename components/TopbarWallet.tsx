"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import { formatEther } from "viem";
import { ArrowUpRight } from "lucide-react";
import {
  clearWallet,
  detectEvm,
  getEvmChainId,
  loadWallet,
  saveWallet,
  silentEvmAccount,
  subscribeWalletChange,
  type EvmWalletId,
} from "@/lib/wallets";
import { ensureChain, publicClientFor, scritBalanceOf } from "@/lib/scrit-evm";
import { scritDeploymentFor, SCRIT_CHAIN_ID } from "@/lib/scrit";
import WalletModal from "./WalletModal";
import WalletMenu from "./WalletMenu";

function short(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatBalanceDecimals(valStr: string, decimals = 4): string {
  const parts = valStr.split(".");
  if (parts.length === 1) return parts[0];
  return `${parts[0]}.${parts[1].slice(0, decimals)}`;
}

export default function TopbarWallet() {
  const [account, setAccount] = useState<Address | null>(null);
  const [walletId, setWalletId] = useState<EvmWalletId | null>(null);
  const [ethBalance, setEthBalance] = useState<string | null>(null);
  const [scritBalance, setScritBalance] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const [mounted, setMounted] = useState(false);

  const seqRef = useRef(0);

  const refreshBalances = useCallback(async (addr: Address, chainId: 4663 | 46630) => {
    try {
      const pub = publicClientFor(chainId);
      const [wei, scritBal] = await Promise.all([
        pub.getBalance({ address: addr }).catch(() => null),
        scritBalanceOf(chainId, addr, scritDeploymentFor(chainId).token).catch(() => null),
      ]);

      if (wei !== null) {
        setEthBalance(formatBalanceDecimals(formatEther(wei), 4));
      } else {
        setEthBalance(null);
      }

      if (scritBal !== null) {
        setScritBalance(formatBalanceDecimals(formatEther(scritBal), 2));
      } else {
        setScritBalance(null);
      }
    } catch {
      setEthBalance(null);
      setScritBalance(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    const mySeq = ++seqRef.current;
    const stored = loadWallet();

    if (!stored || !stored.address) {
      if (mySeq !== seqRef.current) return;
      setAccount(null);
      setWalletId(null);
      setEthBalance(null);
      setScritBalance(null);
      setWrongNetwork(false);
      return;
    }

    const addr = (await silentEvmAccount(stored.id)) || stored.address;
    if (mySeq !== seqRef.current) return;

    if (!addr) {
      setAccount(null);
      setWalletId(null);
      setEthBalance(null);
      setScritBalance(null);
      setWrongNetwork(false);
      return;
    }

    const parsedAddr = addr as Address;
    setAccount(parsedAddr);
    setWalletId(stored.id);

    const provider = detectEvm(stored.id);
    if (provider) {
      const currentChain = await getEvmChainId(provider);
      if (mySeq !== seqRef.current) return;
      setWrongNetwork(currentChain !== null && currentChain !== SCRIT_CHAIN_ID);
    }

    await refreshBalances(parsedAddr, SCRIT_CHAIN_ID);
  }, [refreshBalances]);

  useEffect(() => {
    setMounted(true);
    void refresh();
  }, [refresh]);

  // Global wallet change sync across tabs and across pages (/swap, /launch, /issuer, etc.)
  useEffect(() => {
    const unsub = subscribeWalletChange(() => {
      void refresh();
    });
    return () => unsub();
  }, [refresh]);

  // Provider event listeners (accountsChanged, chainChanged)
  useEffect(() => {
    if (!walletId) return;
    const provider = detectEvm(walletId);
    if (!provider?.on) return;

    const onAccounts = (accs: unknown) => {
      const list = accs as string[];
      if (!list || list.length === 0 || !list[0]) {
        clearWallet();
        void refresh();
      } else {
        saveWallet(walletId, list[0]);
        void refresh();
      }
    };

    const onChain = () => {
      void refresh();
    };

    provider.on("accountsChanged", onAccounts);
    provider.on("chainChanged", onChain);

    return () => {
      provider.removeListener?.("accountsChanged", onAccounts);
      provider.removeListener?.("chainChanged", onChain);
    };
  }, [walletId, refresh]);

  function handleDisconnect() {
    clearWallet();
    seqRef.current++;
    setAccount(null);
    setWalletId(null);
    setEthBalance(null);
    setScritBalance(null);
    setWrongNetwork(false);
  }

  async function handleSwitchNetwork() {
    try {
      await ensureChain(SCRIT_CHAIN_ID);
      await refresh();
    } catch {
      // ignore rejection
    }
  }

  function handlePicked(id: EvmWalletId, address: string) {
    saveWallet(id, address);
    setAccount(address as Address);
    setWalletId(id);
    void refresh();
  }

  if (!mounted) {
    return (
      <div className="nav-wallet-placeholder" style={{ minWidth: 110, height: 38 }} />
    );
  }

  return (
    <>
      {!account ? (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="nav-btn-wallet"
          aria-label="Connect wallet to sCRIT Protocol"
        >
          <span>Connect Wallet</span>
          <ArrowUpRight size={13} strokeWidth={2.5} />
        </button>
      ) : (
        <WalletMenu
          address={account}
          shortLabel={short(account)}
          ethBalance={ethBalance}
          scritBalance={scritBalance}
          walletId={walletId}
          wrongNetwork={wrongNetwork}
          onSwitchNetwork={handleSwitchNetwork}
          onRefresh={refresh}
          onDisconnect={handleDisconnect}
        />
      )}

      <WalletModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onPick={handlePicked}
      />
    </>
  );
}
