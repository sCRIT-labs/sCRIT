"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";

type AnySectionRef = { readonly current: HTMLElement | null };

/** Pure: section progress 0..1 as it travels viewport (top==vh → 0, bottom==0 → 1). */
export function calcSectionProgress(rectTop: number, rectHeight: number, vh: number): number {
  if (vh <= 0 || rectHeight <= 0) return 0;
  const p = (vh - rectTop) / (vh + rectHeight);
  return Math.min(1, Math.max(0, p));
}

/** Pure: map progress 0..1 to index 0..count-1. */
export function indexFor(pp: number, count: number): number {
  if (count <= 0) return 0;
  return Math.min(count - 1, Math.max(0, Math.floor(pp * count)));
}

/**
 * Scroll-driven index: section progress picks the active card, rAF-throttled.
 * Clicks still work — last writer wins. Skipped under reduced motion.
 */
export function useScrollIndex(
  ref: AnySectionRef,
  count: number,
  setIdx: Dispatch<SetStateAction<number>>
): void {
  useEffect(() => {
    const el = ref.current;
    if (!el || count <= 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let scheduled = false;
    const update = () => {
      scheduled = false;
      const r = el.getBoundingClientRect();
      const idx = indexFor(calcSectionProgress(r.top, r.height, window.innerHeight), count);
      setIdx((prev) => (prev === idx ? prev : idx));
    };
    const onScroll = () => {
      if (scheduled) return;
      scheduled = true;
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [ref, count, setIdx]);
}

/** Writes --pp 0..1 on section via rAF-throttled passive scroll. Zero dep. */
export function usePinnedProgress(ref: AnySectionRef): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.setProperty("--pp", "1");
      return;
    }
    let raf = 0;
    let scheduled = false;
    const update = () => {
      scheduled = false;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--pp", String(calcSectionProgress(r.top, r.height, window.innerHeight)));
    };
    const onScroll = () => {
      if (scheduled) return;
      scheduled = true;
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [ref]);
}
