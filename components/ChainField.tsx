"use client";

import React, { useEffect, useRef } from "react";

type Node = { x: number; y: number; vx: number; vy: number; r: number; gold: boolean };
type Pulse = { x: number; y: number; age: number };

/**
 * Interactive block-field: drifting nodes link into chain segments,
 * cursor bends them, clicks fire attestation pulses. Pure decoration —
 * labeled as ambient art, never as data.
 */
export const ChainField: React.FC<{ density?: number; className?: string }> = ({
  density = 1,
  className = "",
}) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let nodes: Node[] = [];
    let pulses: Pulse[] = [];
    let raf = 0;
    const mouse = { x: -9999, y: -9999, down: false };
    let visible = true;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.floor(((w * h) / 16000) * density);
      nodes = Array.from({ length: Math.min(130, Math.max(24, count)) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: 1 + Math.random() * 2.2,
        gold: Math.random() < 0.22,
      }));
    };

    const LINK = 130;

    const frame = () => {
      if (visible) {
        ctx.clearRect(0, 0, w, h);

        // links
        for (let i = 0; i < nodes.length; i++) {
          const a = nodes[i];
          for (let j = i + 1; j < nodes.length; j++) {
            const b = nodes[j];
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const d = Math.hypot(dx, dy);
            if (d < LINK) {
              const alpha = (1 - d / LINK) * 0.35;
              ctx.strokeStyle = `rgba(217,169,46,${alpha.toFixed(3)})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }

        // pulses
        pulses = pulses.filter((p) => p.age < 1);
        for (const p of pulses) {
          p.age += 0.022;
          const pr = p.age * 190;
          ctx.strokeStyle = `rgba(242,201,76,${(0.7 * (1 - p.age)).toFixed(3)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, pr, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = `rgba(242,201,76,${(0.25 * (1 - p.age)).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, pr * 0.6, 0, Math.PI * 2);
          ctx.stroke();
        }

        // nodes
        for (const n of nodes) {
          // drift
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < -20) n.x = w + 20;
          if (n.x > w + 20) n.x = -20;
          if (n.y < -20) n.y = h + 20;
          if (n.y > h + 20) n.y = -20;

          // cursor gravity well
          const dx = n.x - mouse.x;
          const dy = n.y - mouse.y;
          const d = Math.hypot(dx, dy);
          if (d < 170 && d > 1) {
            const f = ((170 - d) / 170) * (mouse.down ? -0.9 : 0.55);
            n.x += (dx / d) * f;
            n.y += (dy / d) * f;
          }

          // pulse lift
          let lift = 0;
          for (const p of pulses) {
            const pd = Math.hypot(n.x - p.x, n.y - p.y);
            const front = p.age * 190;
            if (Math.abs(pd - front) < 26) lift = 1;
          }

          if (n.gold || lift > 0) {
            ctx.fillStyle = lift > 0 ? "#f2c94c" : "rgba(217,169,46,0.9)";
            ctx.shadowColor = "rgba(242,201,76,0.9)";
            ctx.shadowBlur = lift > 0 ? 14 : 7;
          } else {
            ctx.fillStyle = "rgba(244,236,218,0.4)";
            ctx.shadowBlur = 0;
          }
          const rr = n.r + lift * 1.6;
          // blocky node: rotated square
          ctx.save();
          ctx.translate(n.x, n.y);
          ctx.rotate(Math.PI / 4);
          ctx.fillRect(-rr / 1.4, -rr / 1.4, rr * 1.42, rr * 1.42);
          ctx.restore();
          ctx.shadowBlur = 0;
        }
      }
      raf = requestAnimationFrame(frame);
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };
    const onDown = () => { mouse.down = true; };
    const onUp = () => { mouse.down = false; };
    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      pulses.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, age: 0 });
      if (pulses.length > 6) pulses.shift();
    };
    const onVis = () => { visible = !document.hidden; };

    const parent = canvas.parentElement;
    resize();
    window.addEventListener("resize", resize);
    parent?.addEventListener("pointermove", onMove as EventListener, { passive: true });
    parent?.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    parent?.addEventListener("click", onClick as EventListener);
    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      parent?.removeEventListener("pointermove", onMove as EventListener);
      parent?.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      parent?.removeEventListener("click", onClick as EventListener);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [density]);

  return (
    <canvas
      ref={ref}
      className={className}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    />
  );
};
