"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { EVM_WALLETS, connectEvm, detectEvm, walletLabel, type EvmWalletId } from "@/lib/wallets";

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
    if (open) {
      setErr("");
      setPending(null);
      setDetected((EVM_WALLETS.map((w) => w.id) as EvmWalletId[]).filter((id) => detectEvm(id) !== null));
    }
  }, [open ]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  async function pick(id: EvmWalletId) {
    if (!detectEvm(id)) return;
    setErr("");
    setPending(id);
    try {
      const { address } = await connectEvm(id);
      onPick(id, address);
      onClose();
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
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center", padding: 18, background: "rgba(9,9,12,.62)", backdropFilter: "blur(6px)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(430px, 100%)", borderRadius: 16, border: "1px solid rgba(255,255,255,.12)", background: "#141417", padding: 22, boxShadow: "0 30px 80px rgba(0,0,0,.5)", color: "#f2f0ea" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: "#ffffff" }}>Connect wallet</h3>
          <button type="button" onClick={onClose} aria-label="Close" style={{ display: "inline-flex", padding: 8, borderRadius: 8, border: "1px solid rgba(255,255,255,.16)", background: "transparent", color: "#ffffff", cursor: "pointer" }}>
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
                <span className="mono-sm" style={{ color: installed ? "#2ed573" : "#8b9187" }}>
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
