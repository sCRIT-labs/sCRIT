"use client";

import React, { useState, useRef } from "react";

type MetalType = "Au" | "Ag" | "Pt";

const METALS: Record<
  MetalType,
  {
    name: string;
    label: string;
    fineness: string;
    grade: string;
    serial: string;
    hallmark: string;
    skinClass: string;
    weight: string;
  }
> = {
  Au: {
    name: "FINE GOLD",
    label: "Gold Ingot",
    fineness: "999.9",
    grade: "LBMA Good Delivery",
    serial: "AU-2026-9941",
    hallmark: "LBMA",
    skinClass: "bullion-gold",
    weight: "1000g · NET WEIGHT",
  },
  Ag: {
    name: "FINE SILVER",
    label: "Silver Bar",
    fineness: "999.0",
    grade: "Commercial Grade",
    serial: "AG-2026-1049",
    hallmark: "999",
    skinClass: "bullion-silver",
    weight: "1000g · NET WEIGHT",
  },
  Pt: {
    name: "FINE PLATINUM",
    label: "Platinum Sponge/Ingot",
    fineness: "999.5",
    grade: "Sponge Ingot",
    serial: "PT-2026-0812",
    hallmark: "9995",
    skinClass: "bullion-platinum",
    weight: "500g · NET WEIGHT",
  },
};

interface Bullion3DProps {
  activeMetal?: "au" | "ag" | "pt";
}

export const Bullion3D: React.FC<Bullion3DProps> = ({ activeMetal }) => {
  const [metal, setMetal] = useState<MetalType>("Au");

  React.useEffect(() => {
    if (activeMetal) {
      const mapped = activeMetal === "au" ? "Au" : activeMetal === "ag" ? "Ag" : "Pt";
      setMetal(mapped);
    }
  }, [activeMetal]);

  const cardRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const target = useRef({ rx: 0, ry: 0, tx: 0, ty: 0, gx: 50, gy: 50 });
  const pos = useRef({ rx: 0, ry: 0, tx: 0, ty: 0, gx: 50, gy: 50 });
  const rafRef = useRef(0);

  const motionOk = () =>
    typeof window !== "undefined" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    window.matchMedia("(any-pointer: fine)").matches;

  const settle = () => {
    const c = pos.current;
    const t = target.current;
    const card = cardRef.current;
    const wrap = wrapRef.current;
    const glare = glareRef.current;
    if (!card || !wrap || !glare) return;
    c.rx += (t.rx - c.rx) * 0.14;
    c.ry += (t.ry - c.ry) * 0.14;
    c.tx += (t.tx - c.tx) * 0.14;
    c.ty += (t.ty - c.ty) * 0.14;
    c.gx += (t.gx - c.gx) * 0.14;
    c.gy += (t.gy - c.gy) * 0.14;
    card.style.transform = `rotateX(${c.tx}deg) rotateY(${c.ty}deg)`;
    wrap.style.setProperty("--rx", `${c.rx.toFixed(2)}px`);
    wrap.style.setProperty("--ry", `${c.ry.toFixed(2)}px`);
    glare.style.setProperty("--gx", `${c.gx.toFixed(2)}%`);
    glare.style.setProperty("--gy", `${c.gy.toFixed(2)}%`);
    const rest =
      Math.abs(t.rx - c.rx) + Math.abs(t.ry - c.ry) + Math.abs(t.tx - c.tx) + Math.abs(t.ty - c.ty);
    if (rest > 0.05) {
      rafRef.current = requestAnimationFrame(settle);
    } else {
      rafRef.current = 0;
    }
  };

  const kick = () => {
    if (!rafRef.current) rafRef.current = requestAnimationFrame(settle);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!motionOk() || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    target.current = {
      ty: ((x - cx) / cx) * 16,
      tx: ((y - cy) / cy) * -16,
      rx: ((cx - x) / cx) * -10,
      ry: ((cy - y) / cy) * -10,
      gx: (x / rect.width) * 100,
      gy: (y / rect.height) * 100,
    };
    kick();
  };

  const handleMouseLeave = () => {
    target.current = { rx: 0, ry: 0, tx: 0, ty: 0, gx: 50, gy: 50 };
    kick();
  };

  React.useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const current = METALS[metal];

  return (
    <div className="bullion-wrapper">
      <div className="bullion-tabs" role="tablist" aria-label="Select Metal Ingot">
        {(["Au", "Ag", "Pt"] as MetalType[]).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={metal === m}
            className={`bullion-tab ${metal === m ? "active" : ""}`}
            onClick={() => setMetal(m)}
          >
            {m} · {METALS[m].label}
          </button>
        ))}
      </div>

      <div ref={wrapRef} className="repel-wrap">
      <div
        ref={cardRef}
        className="bullion-card"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className={`bullion-face float-loop ${current.skinClass}`}>
          <div ref={glareRef} className="bullion-glare" />

          <div className="bullion-stamp-top">
            <div>
              <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: "0.14em", display: "block" }}>
                sCRIT VAULT PHYSICAL RESERVE
              </span>
              <h4>{current.name}</h4>
            </div>
            <span className="bullion-hallmark">{current.hallmark}</span>
          </div>

          <div className="bullion-mid">
            <p className="bullion-fineness">{current.fineness}</p>
            <p className="bullion-spec">{current.grade}</p>
          </div>

          <div className="bullion-bot">
            <span>SERIAL: {current.serial}</span>
            <span>{current.weight}</span>
          </div>
        </div>
      </div>
      </div>
      <p className="mono-sm" style={{ marginTop: 14, color: "var(--muted)", fontSize: 11 }}>
        Tilt or hover cursor to inspect physical assay lustre &amp; serial marks
      </p>
    </div>
  );
};
