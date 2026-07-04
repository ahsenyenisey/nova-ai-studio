"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Sparkles } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { EASE_CINEMATIC, riseIn, staggerContainer } from "@/lib/motion";

const TITLE = "NOVA";

/** Başlığı harf harf, staggered olarak belirten varyantlar. */
const letter = {
  hidden: { opacity: 0, y: 40, filter: "blur(12px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: EASE_CINEMATIC },
  },
};

export function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      {/* Üst rozet */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE_CINEMATIC, delay: 0.1 }}
        className="mb-8 inline-flex items-center gap-2 rounded-full border border-border-glow bg-surface-glass px-4 py-1.5 text-sm text-text-muted backdrop-blur-xl"
      >
        <Sparkles className="h-3.5 w-3.5 text-accent-cyan" aria-hidden />
        AI Destekli Veri Analiz Stüdyosu
      </motion.div>

      {/* Harf harf beliren başlık */}
      <motion.h1
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="flex text-7xl font-bold sm:text-8xl md:text-[10rem]"
        aria-label={TITLE}
      >
        {TITLE.split("").map((char, i) => (
          <motion.span
            key={i}
            variants={letter}
            className="inline-block bg-gradient-to-b from-text-primary to-primary bg-clip-text text-transparent"
            aria-hidden
          >
            {char}
          </motion.span>
        ))}
      </motion.h1>

      {/* Alt başlık + CTA, başlıktan sonra staggered girer */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        transition={{ delayChildren: 0.9 }}
        className="mt-8 flex max-w-xl flex-col items-center gap-8"
      >
        <motion.p
          variants={riseIn}
          className="text-lg text-text-muted sm:text-xl"
        >
          CSV verini yükle; otomatik keşifsel analiz, model eğitimi ve tahmini
          bir bilim kurgu komuta merkezinde deneyimle.
        </motion.p>

        <motion.div variants={riseIn}>
          <Link href="/studio" aria-label="Veri Yükle">
            <Button icon={ArrowUpRight}>Veri Yükle</Button>
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
