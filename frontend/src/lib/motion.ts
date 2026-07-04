/**
 * Ortak Framer Motion sabitleri (bkz. CLAUDE.md "Sinematik Efekt Kuralları").
 * Tüm animasyonlar bu değerleri kullanır ki hareket dili tutarlı kalsın.
 */

import type { Transition, Variants } from "framer-motion";

/** CLAUDE.md sinematik easing eğrisi. */
export const EASE_CINEMATIC = [0.22, 1, 0.36, 1] as const;

/** Standart sayfa/panel geçiş süresi (saniye). */
export const DURATION = 0.5;

/** Staggered giriş gecikmesi (saniye) — 80ms. */
export const STAGGER = 0.08;

/** Fade + hafif ölçek girişi (paneller, sayfa geçişleri). */
export const fadeScale: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATION, ease: EASE_CINEMATIC },
  },
};

/** Aşağıdan yükselerek fade-in. */
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION, ease: EASE_CINEMATIC },
  },
};

/** Çocuk öğeleri sırayla girdiren konteyner. */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: STAGGER },
  },
};

/** Buton hover/tap mikro etkileşimi (CLAUDE.md: hover y:-2, tap scale:0.97). */
export const buttonMotion = {
  whileHover: { y: -2 },
  whileTap: { scale: 0.97 },
  transition: { duration: 0.2, ease: EASE_CINEMATIC } satisfies Transition,
};
