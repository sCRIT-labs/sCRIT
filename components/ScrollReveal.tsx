"use client";

import React, { useEffect, useRef, useState } from "react";

interface ScrollRevealProps {
  children: React.ReactNode;
  type?: "move" | "fade";
  delayMs?: number;
  className?: string;
  as?: React.ElementType;
}

export function ScrollReveal({
  children,
  type = "move",
  delayMs = 0,
  className = "",
  as: Component = "div",
}: ScrollRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (delayMs > 0) {
              const timer = setTimeout(() => setRevealed(true), delayMs);
              return () => clearTimeout(timer);
            }
            setRevealed(true);
            observer.unobserve(el);
          }
        });
      },
      {
        threshold: 0.05,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    observer.observe(el);

    // Safety fallback: reveal after timeout to prevent permanently hidden content
    const fallback = setTimeout(() => setRevealed(true), 2500);

    return () => {
      observer.disconnect();
      clearTimeout(fallback);
    };
  }, [delayMs]);

  if (type === "fade") {
    return (
      <Component
        ref={ref}
        className={`reveal-fade ${revealed ? "is-revealed" : ""} ${className}`}
        style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
      >
        {children}
      </Component>
    );
  }

  return (
    <span ref={ref} className="reveal-mask" style={{ display: "inline-block", width: "100%" }}>
      <Component
        className={`reveal-move ${revealed ? "is-revealed" : ""} ${className}`}
        style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
      >
        {children}
      </Component>
    </span>
  );
}

