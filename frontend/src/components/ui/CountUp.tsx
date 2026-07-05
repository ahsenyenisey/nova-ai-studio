"use client";

import { animate } from "framer-motion";
import { useEffect, useState } from "react";

import { EASE_CINEMATIC } from "@/lib/motion";

interface CountUpProps {
  value: number;
  decimals?: number;
  duration?: number;
  suffix?: string;
  className?: string;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Metrikleri 0'dan hedefe sayarak yükseltir (CLAUDE.md). Sayı fontu çağıran verir. */
export function CountUp({
  value,
  decimals = 0,
  duration = 1.2,
  suffix = "",
  className = "",
}: CountUpProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    // Hareket azaltma tercihinde süre 0 → animate anında son değeri verir.
    // (setState yalnızca onUpdate callback'inde; effect gövdesinde senkron değil.)
    const controls = animate(0, value, {
      duration: prefersReducedMotion() ? 0 : duration,
      ease: EASE_CINEMATIC,
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value, duration]);

  return (
    <span className={className}>
      {display.toLocaleString("tr-TR", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
