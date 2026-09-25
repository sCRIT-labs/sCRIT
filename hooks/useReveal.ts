"use client";

import { useEffect } from "react";

/** Adds .rv-in to every .rv element as it enters the viewport. Fire once. */
export function useReveal(): void {
  useEffect(() => {
    document.documentElement.classList.add("has-reveal-js");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.querySelectorAll(".rv, .scrit-reveal").forEach((el) => el.classList.add("rv-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("rv-in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    const observeReveal = (el: Element) => {
      if (el.matches(".rv, .scrit-reveal")) io.observe(el);
    };
    const els = document.querySelectorAll(".rv, .scrit-reveal");
    els.forEach((el) => io.observe(el));
    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          observeReveal(node);
          node.querySelectorAll(".rv, .scrit-reveal").forEach(observeReveal);
        }
      }
    });
    mutations.observe(document.body, { childList: true, subtree: true });
    return () => {
      mutations.disconnect();
      io.disconnect();
    };
  }, []);
}
