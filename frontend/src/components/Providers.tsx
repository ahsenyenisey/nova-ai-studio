"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Framer Motion'ın JS tabanlı animasyonlarını da kullanıcının hareket-azaltma
 * tercihine bağlar (globals.css yalnızca CSS animasyonlarını durduruyordu).
 */
export function Providers({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
