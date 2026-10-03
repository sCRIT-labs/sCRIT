"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import { Copy, Check, ExternalLink, RefreshCw, LogOut, AlertTriangle, ShieldCheck } from "lucide-react";
import { EVM_WALLETS, type EvmWalletId } from "@/lib/wallets";

export interface WalletMenuProps {
  address: Address;
  shortLabel: string;
  ethBalance: string | null;
  scritBalance: string | null;
  walletId?: EvmWalletId | null;
  wrongNetwork?: boolean;
  onSwitchNetwork?: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onDisconnect: () => void;
}

export default function WalletMenu({
  address,
  shortLabel,
  ethBalance,
  scritBalance,
  walletId,
  wrongNetwork,
  onSwitchNetwork,
  onRefresh,
  onDisconnect,
}: WalletMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }

  const walletMeta = EVM_WALLETS.find((w) => w.id === walletId);

  return (
    <div className="nav-wallet-menu-wrapper" ref={menuRef} style={{ position: "relative" }}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Connected wallet details"
        onClick={() => setOpen((prev) => !prev)}
        className="nav-btn-wallet-connected"
      >
        {walletMeta && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={walletMeta.icon}
            alt=""
            width={14}
            height={14}
            style={{ borderRadius: "50%", flexShrink: 0 }}
          />
        )}
        <span className="nav-wallet-short">{shortLabel}</span>
        {ethBalance !== null && (
          <span className="nav-wallet-balance-pill">{ethBalance} ETH</span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Connected account summary"
          className="nav-wallet-dropdown"
        >
          {/* Header with status */}
          <div className="nav-wallet-dd-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {walletMeta && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={walletMeta.icon} alt="" width={18} height={18} style={{ borderRadius: 4 }} />
              )}
              <span className="nav-wallet-dd-title">
                {walletMeta?.name ?? "EVM Wallet"}
              </span>
            </div>
            <span className="nav-wallet-dd-network">
              <ShieldCheck size={12} color="#4ade80" />
              Robinhood Chain (4663)
            </span>
          </div>

          {/* Full address + copy */}
          <div className="nav-wallet-dd-address-box">
            <span className="nav-wallet-dd-addr mono-xs">{address}</span>
            <button
              type="button"
              onClick={handleCopy}
              className="nav-wallet-dd-copy-btn"
              title="Copy address"
            >
              {copied ? <Check size={13} color="#4ade80" /> : <Copy size={13} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>

          {/* Wrong Network Warning */}
          {wrongNetwork && onSwitchNetwork && (
            <div className="nav-wallet-dd-warning">
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <AlertTriangle size={14} color="#f59e0b" />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b" }}>
                  Wrong Network Detected
                </span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await onSwitchNetwork();
                  setOpen(false);
                }}
                className="nav-wallet-dd-switch-btn"
              >
                Switch to Robinhood Mainnet
              </button>
            </div>
          )}

          {/* Balances */}
          <div className="nav-wallet-dd-balances">
            <div className="nav-wallet-dd-bal-row">
              <span className="nav-wallet-dd-bal-label">ETH (Gas):</span>
              <span className="nav-wallet-dd-bal-val">
                {refreshing ? "…" : ethBalance !== null ? `${ethBalance} ETH` : "—"}
              </span>
            </div>
            {scritBalance !== null && (
              <div className="nav-wallet-dd-bal-row">
                <span className="nav-wallet-dd-bal-label">sCRIT (Commodity):</span>
                <span className="nav-wallet-dd-bal-val gold-val">
                  {refreshing ? "…" : `${scritBalance} sCRIT`}
                </span>
              </div>
            )}
          </div>

          {/* Actions deck */}
          <div className="nav-wallet-dd-actions">
            <a
              href={`https://robinhoodchain.blockscout.com/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="nav-wallet-dd-act-btn"
            >
              <ExternalLink size={13} />
              <span>Explorer (Blockscout)</span>
            </a>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="nav-wallet-dd-act-btn"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              <span>{refreshing ? "Refreshing…" : "Refresh Balances"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onDisconnect();
                setOpen(false);
              }}
              className="nav-wallet-dd-act-btn is-disconnect"
            >
              <LogOut size={13} />
              <span>Disconnect Wallet</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
