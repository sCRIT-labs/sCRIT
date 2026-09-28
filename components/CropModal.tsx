"use client";

import React, { useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut, Check, X, RotateCcw } from "lucide-react";
import {
  CROP_SIZE,
  MAX_ZOOM,
  MIN_ZOOM,
  clampOffset,
  clampZoom,
  cropSquareParams,
} from "../lib/crop-image";

const VIEW = 280;

type Props = {
  src: string;
  fileName: string;
  onCancel: () => void;
  onDone: (dataUrl: string) => void;
};

export default function CropModal({ src, fileName, onCancel, onDone }: Props) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onCancel();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [busy, onCancel]);

  function onZoom(z: number) {
    const nz = clampZoom(z);
    setZoom(nz);
    setOffset((o) => clampOffset(size.w, size.h, VIEW, nz, o.x, o.y));
  }

  function reset() {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  async function confirm() {
    if (busy || size.w === 0) return;
    setBusy(true);
    setError("");
    try {
      const img = new Image();
      img.src = src;
      await img.decode();
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (!(w > 0 && h > 0)) throw new Error("crop_failed");
      const { sx, sy, sSize } = cropSquareParams(w, h, VIEW, zoom, offset.x, offset.y);
      if (!(sSize > 0)) throw new Error("crop_failed");

      const canvas = document.createElement("canvas");
      canvas.width = CROP_SIZE;
      canvas.height = CROP_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("crop_failed");

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, CROP_SIZE, CROP_SIZE);

      const dataUrl = canvas.toDataURL("image/png");
      onDone(dataUrl);
    } catch {
      setError("Crop failed. Please try a different image.");
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Crop token logo 1:1"
      className="crop-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="crop-modal-container">
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>
              Crop Token Emblem 1:1
            </h3>
            <p className="mono-sm" style={{ margin: "4px 0 0", fontSize: 11, color: "#7d8479" }}>
              Pan to position · Output {CROP_SIZE}×{CROP_SIZE} px
            </p>
          </div>
          <button
            type="button"
            className="crop-close-btn"
            onClick={onCancel}
            disabled={busy}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Viewport Canvas Preview */}
        <div
          className="crop-viewport"
          style={{ width: VIEW, height: VIEW }}
          onPointerDown={(e) => {
            if (busy) return;
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            dragRef.current = { sx: e.clientX, sy: e.clientY, ox: offset.x, oy: offset.y };
          }}
          onPointerMove={(e) => {
            const d = dragRef.current;
            if (!d) return;
            setOffset(
              clampOffset(
                size.w,
                size.h,
                VIEW,
                zoom,
                d.ox + (e.clientX - d.sx),
                d.oy + (e.clientY - d.sy),
              ),
            );
          }}
          onPointerUp={() => {
            dragRef.current = null;
          }}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="Crop source"
            draggable={false}
            onLoad={(e) => {
              const el = e.currentTarget;
              setSize({ w: el.naturalWidth, h: el.naturalHeight });
              setOffset({ x: 0, y: 0 });
            }}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              transformOrigin: "center center",
              maxWidth: "none",
              maxHeight: "none",
              width: size.w && size.h ? (size.w > size.h ? "auto" : `${VIEW}px`) : "auto",
              height: size.w && size.h ? (size.w > size.h ? `${VIEW}px` : "auto") : "auto",
              pointerEvents: "none",
              userSelect: "none",
            }}
          />
          {/* Grid overlay for framing */}
          <div className="crop-grid-overlay" />
        </div>

        {/* Zoom & Control Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="crop-control-btn"
            onClick={() => onZoom(zoom - 0.2)}
            disabled={zoom <= MIN_ZOOM || busy}
            title="Zoom out"
          >
            <ZoomOut size={14} />
          </button>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.05}
            value={zoom}
            onChange={(e) => onZoom(parseFloat(e.target.value))}
            className="crop-zoom-slider"
            disabled={busy}
          />
          <button
            type="button"
            className="crop-control-btn"
            onClick={() => onZoom(zoom + 0.2)}
            disabled={zoom >= MAX_ZOOM || busy}
            title="Zoom in"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            className="crop-control-btn"
            onClick={reset}
            disabled={busy}
            title="Reset position"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {error ? <p style={{ margin: 0, color: "#dc2626", fontSize: 12 }}>{error}</p> : null}

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ flex: 1, height: 38 }}
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-gold"
            style={{ flex: 1.3, height: 38, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            onClick={confirm}
            disabled={busy || size.w === 0}
          >
            <Check size={15} />
            <span>{busy ? "Applying..." : "Apply Emblem"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
