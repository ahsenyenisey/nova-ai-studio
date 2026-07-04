"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { fadeScale } from "@/lib/motion";

interface PanelProps {
  children: ReactNode;
  className?: string;
  /** true ise ekrana girdiğinde fade+scale animasyonuyla belirir. */
  animateIn?: boolean;
  /** Hover'da kenar parlamasını güçlendirir (etkileşimli paneller için). */
  interactive?: boolean;
}

/**
 * Glassmorphism panel — NOVA'nın temel yüzey bileşeni.
 * `backdrop-blur-xl`, ince parlayan kenarlık, hafif iç gölge (CLAUDE.md).
 */
export function Panel({
  children,
  className = "",
  animateIn = false,
  interactive = false,
}: PanelProps) {
  const base =
    "rounded-2xl border border-border-glow bg-surface-glass backdrop-blur-xl " +
    "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_8px_32px_-12px_rgba(0,0,0,0.6)] " +
    "transition-shadow duration-300";

  const hover = interactive
    ? "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(120,140,255,0.35),0_12px_40px_-12px_rgba(108,123,255,0.35)]"
    : "";

  return (
    <motion.section
      className={`${base} ${hover} ${className}`}
      variants={animateIn ? fadeScale : undefined}
      initial={animateIn ? "hidden" : undefined}
      whileInView={animateIn ? "visible" : undefined}
      viewport={animateIn ? { once: true, amount: 0.3 } : undefined}
    >
      {children}
    </motion.section>
  );
}
