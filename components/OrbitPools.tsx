"use client";

import React, { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

type OrbitMode = "all" | "base" | "project";

export const OrbitPools: React.FC = () => {
  const [selected, setSelected] = useState<OrbitMode>("all");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    // Particle system: orbiting sparks + inward flowing fee siphon particles
    const sparks = Array.from({ length: 42 }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: 90 + Math.random() * 120,
      speed: (0.004 + Math.random() * 0.008) * (Math.random() > 0.5 ? 1 : -1),
      size: 1 + Math.random() * 2,
      color: Math.random() > 0.3 ? "rgba(217, 169, 46," : "rgba(242, 201, 76,",
      alpha: 0.3 + Math.random() * 0.5,
      inward: Math.random() > 0.6,
    }));

    const render = () => {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;

      for (const s of sparks) {
        s.angle += s.speed;
        if (s.inward) {
          s.radius -= 0.25;
          if (s.radius < 24) {
            s.radius = 160 + Math.random() * 40;
          }
        }

        const px = cx + Math.cos(s.angle) * s.radius;
        const py = cy + Math.sin(s.angle) * s.radius * 0.45; // Isometric squashed orbit

        ctx.beginPath();
        ctx.arc(px, py, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `${s.color} ${s.alpha})`;
        ctx.fill();

        // Draw faint trailing ray to center if inward
        if (s.inward && s.radius < 100) {
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(cx, cy);
          ctx.strokeStyle = `rgba(217, 169, 46, ${0.1 * (1 - s.radius / 100)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="orbit-interactive-root">
      <div className="orbit-narrative" style={{ textAlign: "center", marginBottom: 28 }}>
        <span className="mono-sm" style={{ color: "var(--gold-bright)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
          Two Orbits / One Physical Core
        </span>
        <p style={{ fontSize: "14px", color: "#8e8e93", maxWidth: "620px", margin: "8px auto 0", lineHeight: 1.6 }}>
          The base orbit (sCRIT/ETH) operates untaxed for frictionless liquidity. Project tokens circle the outer orbit, with every swap converting fees into physical metal.
        </p>
      </div>

      <div className="orbit" style={{ position: "relative" }}>
          {/* Kinetic Particle Canvas Layer */}
          <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              zIndex: 1,
            }}
          />

          <div
            className={`orbit-ring ring-a ${selected === "base" ? "active-ring" : ""}`}
            aria-hidden="true"
            style={{ zIndex: 2 }}
          />
          <div
            className={`orbit-ring ring-b ${selected === "project" ? "active-ring" : ""}`}
            aria-hidden="true"
            style={{ zIndex: 2 }}
          />

          <div
            className="orbit-core kinetic-orbit-core"
            style={{ zIndex: 6, cursor: "pointer" }}
            onClick={() => setSelected("all")}
          >
            <svg className="orbit-core-sym" width="16" height="16" viewBox="0 0 24 24" fill="var(--gold-bright)">
              <polygon points="12 2 22 12 12 22 2 12" />
            </svg>
            <span className="orbit-core-name">sCRIT</span>
            <span className="orbit-core-sub">INDEX CORE</span>
          </div>

          <div
            className="orbit-sat sat-a"
            style={{ zIndex: 5, cursor: "pointer" }}
            onClick={() => setSelected("base")}
          >
            <span className="sat-chip" style={{ borderColor: selected === "base" ? "var(--gold-bright)" : "var(--line)" }}>
              ETH · base · 0% TAX
            </span>
          </div>

          <div
            className="orbit-sat sat-b"
            style={{ zIndex: 5, cursor: "pointer" }}
            onClick={() => setSelected("project")}
          >
            <span className="sat-chip" style={{ borderColor: selected === "project" ? "var(--gold-bright)" : "var(--line)" }}>
              TOKEN A · 1% FEE
            </span>
          </div>

          <div
            className="orbit-sat sat-c"
            style={{ zIndex: 5, cursor: "pointer" }}
            onClick={() => setSelected("project")}
          >
            <span className="sat-chip" style={{ borderColor: selected === "project" ? "var(--gold-bright)" : "var(--line)" }}>
              TOKEN B · 1% FEE
            </span>
          </div>
        </div>

        {/* Orbit Detail Inspector */}
        <div
          className="panel rv"
          style={{
            ["--d" as string]: "240ms",
            marginTop: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <span className="mono-sm" style={{ color: "var(--gold-bright)" }}>
              {selected === "base"
                ? "BASE PAIR INSPECTOR: sCRIT / ETH"
                : selected === "project"
                ? "PROJECT PAIR INSPECTOR: TOKEN / sCRIT"
                : "ORBIT OVERVIEW: TWO-TIER MODEL"}
            </span>
            <p style={{ fontSize: 13.5, color: "var(--parchment-dim)", marginTop: 4 }}>
              {selected === "base"
                ? "Untaxed price discovery route. Protocol deployed. Anyone enters and exits index exposure here without paying swap toll."
                : selected === "project"
                ? "Gated launcher pools. Every swap skims configured tax to the Treasury to buy physical commodities under EIP-712 custody."
                : "Click satellites above to inspect why the base pair must never be taxed while project pairs feed the physical reserve."}
            </p>
          </div>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 12, padding: "6px 14px", display: "inline-flex", alignItems: "center", gap: 6 }}
            onClick={() => setSelected(selected === "all" ? "project" : selected === "project" ? "base" : "all")}
          >
            <RefreshCw size={12} strokeWidth={2} />
            <span>{selected === "all" ? "Inspect Project Pools" : selected === "project" ? "Inspect Base Pool" : "Reset View"}</span>
          </button>
        </div>

        <div className="orbit-legend rv" style={{ marginTop: 14 }}>
          <span><i className="sw-a" /> sCRIT/ETH — protocol base, untaxed</span>
          <span><i className="sw-b" /> TOKEN/sCRIT — gated launches, fee hook</span>
        </div>
    </div>
  );
};
