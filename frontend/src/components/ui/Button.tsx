"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { buttonMotion } from "@/lib/motion";

type Variant = "primary" | "ghost";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  /** İsteğe bağlı lucide-react ikonu (metnin solunda gösterilir). */
  icon?: LucideIcon;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-primary text-white shadow-[0_0_24px_-6px_rgba(108,123,255,0.7)] " +
    "hover:shadow-[0_0_32px_-4px_rgba(108,123,255,0.9)]",
  ghost:
    "bg-surface-glass text-text-primary border border-border-glow backdrop-blur-xl " +
    "hover:border-primary/50",
};

/**
 * Sinematik mikro etkileşimli buton: hover'da hafif yükselme + glow,
 * tıklamada scale 0.97 (CLAUDE.md). Emoji yerine yalnızca lucide-react ikonu.
 */
export function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled = false,
  className = "",
  icon: Icon,
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : buttonMotion.whileHover}
      whileTap={disabled ? undefined : buttonMotion.whileTap}
      transition={buttonMotion.transition}
      className={
        "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 " +
        "font-medium tracking-[0.01em] cursor-pointer " +
        "disabled:cursor-not-allowed disabled:opacity-50 " +
        `${VARIANTS[variant]} ${className}`
      }
    >
      {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
      {children}
    </motion.button>
  );
}
