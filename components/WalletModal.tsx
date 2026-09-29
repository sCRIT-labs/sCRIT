"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import {
  EVM_WALLETS,
  connectEvm,
  detectEvm,
  walletLabel,
  onWalletsChanged,
  requestEip6963Providers,
  type EvmWalletId,
} from "@/lib/wallets";

export default function WalletModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (id: EvmWalletId, address: string) => void;
}) {
  const [detected, setDetected] = useState<EvmWalletId[]>([]);
  const [pending, setPending] = useState<EvmWalletId | null>(null);
  const [err, setErr] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    setErr("");
    setPending(null);

    const refresh = () => {
      setDetected((EVM_WALLETS.map((w) => w.id) as EvmWalletId[]).filter((id) => detectEvm(id) !== null));
    };

    // Immediate check + announce request
    refresh();
    requestEip6963Providers();

    // Listen to EIP-6963 announcements that arrive asynchronously
    const unsub = onWalletsChanged(refresh);

    // Staggered fallbacks for extensions that initialize slightly after injection
    const t1 = setTimeout(refresh, 60);
    const t2 = setTimeout(refresh, 250);

    return () => {
      unsub();
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [open]);

  const [isRendered, setIsRendered] = useState(open);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setIsRendered(true);
      setIsClosing(false);
    } else if (isRendered) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setIsRendered(false);
        setIsClosing(false);
      }, 240);
      return () => clearTimeout(timer);
    }
  }, [open, isRendered]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 220);
  };

  useEffect(() => {
    if (!isRendered) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isRendered]);

  if (!isRendered || !mounted) return null;

  async function pick(id: EvmWalletId) {
    if (!detectEvm(id)) return;
    setErr("");
    setPending(id);
    try {
      const { address } = await connectEvm(id);
      onPick(id, address);
      handleClose();
    } catch (e: unknown) {
      setErr(walletLabel(e));
    } finally {
      setPending(null);
    }
  }

  // Portal to body: page-scoped rules (e.g. `.scrit-subpage-container h3`
  // with !important) must not bleed into the modal.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Connect a wallet"
      onClick={handleClose}
      className={`wallet-modal-backdrop ${isClosing ? "is-closing" : "is-opening"}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="wallet-modal-surface"
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: "#ffffff" }}>Connect wallet</h3>
          <button type="button" onClick={handleClose} aria-label="Close" className="wallet-modal-close-btn">
            <X size={16} />
          </button>
        </div>
        <p className="mono-sm" style={{ color: "#a7ada3", margin: "0 0 16px" }}>EVM only in this pilot. Pick an installed wallet to continue.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {EVM_WALLETS.map((w) => {
            const installed = detected.includes(w.id);
            const busy = pending === w.id;
            const inner = (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- wallet brand marks served from /public */}
                <img src={w.icon} alt="" width={26} height={26} style={{ borderRadius: 6 }} />
                <span style={{ flex: 1, textAlign: "left", fontWeight: 600, fontSize: 14, color: "#ffffff" }}>{w.name}</span>
                <span className="mono-sm" style={{ color: installed ? "#d0aa5b" : "#8b9187" }}>
                  {busy ? "Waiting…" : installed ? "Detected" : "Install"}
                </span>
              </>
            );
            const style = {
              display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 14px",
              borderRadius: 12, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.045)",
              color: "#ffffff", cursor: installed && !busy ? "pointer" : "default", opacity: busy ? 0.7 : 1,
            } as const;
            return installed ? (
              <button key={w.id} type="button" onClick={() => pick(w.id)} disabled={busy} style={style}>{inner}</button>
            ) : (
              <a key={w.id} href={w.installUrl} target="_blank" rel="noreferrer" style={{ ...style, textDecoration: "none" }}>{inner}</a>
            );
          })}
        </div>
        {err ? <p className="mono-sm" role="status" style={{ color: "#fca5a5", margin: "14px 0 0" }}>{err}</p> : null}
      </div>
    </div>,
    document.body
  );
}
