"use client";

import React, { useEffect, useRef, useState } from "react";

interface CounterNumberProps {
  value: string;
  prefix?: string;
  suffix?: string;
}

export function CounterNumber({ value, prefix = "", suffix = "" }: CounterNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [displayed, setDisplayed] = useState("0");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const numeric = parseFloat(value.replace(/[^0-9.]/g, ""));
    const isFloat = value.includes(".");

    const startAnimation = () => {
      const startTime = performance.now();
      const duration = 1400;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(1, elapsed / duration);
        // Exponential ease out for high-precision luxury feel
        const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const currentVal = ease * numeric;

        setDisplayed(isFloat ? currentVal.toFixed(1) : Math.floor(currentVal).toString());

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setDisplayed(isFloat ? numeric.toFixed(1) : numeric.toString());
        }
      };

      requestAnimationFrame(animate);
    };

    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      startAnimation();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          startAnimation();
          observer.unobserve(el);
        }
      },
      { threshold: 0.05 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <span ref={ref}>
      {prefix}
      {displayed}
      {suffix}
    </span>
  );
}
