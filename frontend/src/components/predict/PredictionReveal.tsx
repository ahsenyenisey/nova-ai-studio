"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Sparkles } from "lucide-react";

import { CountUp } from "@/components/ui/CountUp";
import { Panel } from "@/components/ui/Panel";
import { EASE_CINEMATIC, STAGGER } from "@/lib/motion";
import type { PredictResponse } from "@/lib/train-types";

export function PredictionReveal({ result }: { result: PredictResponse }) {
  const probs = result.probabilities
    ? Object.entries(result.probabilities).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <Panel className="relative overflow-hidden p-8">
      {/* Arka plan parıltısı */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: EASE_CINEMATIC }}
        className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
      />

      <div className="relative text-center">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-border-glow bg-surface-glass px-3 py-1 text-xs text-text-muted"
        >
          <Sparkles className="h-3.5 w-3.5 text-accent-cyan" aria-hidden />
          {result.problem_type === "classification" ? "Tahmin" : "Tahmini değer"}
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={String(result.prediction)}
            initial={{ opacity: 0, scale: 0.8, filter: "blur(12px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.6, ease: EASE_CINEMATIC }}
            className="bg-gradient-to-b from-text-primary to-primary bg-clip-text text-6xl font-bold text-transparent sm:text-7xl"
          >
            {typeof result.prediction === "number"
              ? result.prediction.toLocaleString("tr-TR", {
                  maximumFractionDigits: 3,
                })
              : result.prediction}
          </motion.div>
        </AnimatePresence>

        {result.confidence !== null && result.confidence !== undefined ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-3 text-text-muted"
          >
            güven{" "}
            <CountUp
              value={result.confidence * 100}
              decimals={1}
              suffix="%"
              className="font-metric text-accent-cyan"
            />
          </motion.p>
        ) : null}
      </div>

      {/* Sınıf olasılıkları */}
      {probs.length > 0 ? (
        <div className="mt-8 space-y-2.5">
          {probs.map(([label, p], i) => (
            <div key={label} className="flex items-center gap-3">
              <span className="w-24 shrink-0 truncate text-sm text-text-muted">
                {label}
              </span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/5">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent-cyan"
                  initial={{ width: 0 }}
                  animate={{ width: `${p * 100}%` }}
                  transition={{
                    duration: 0.7,
                    ease: EASE_CINEMATIC,
                    delay: 0.3 + i * STAGGER,
                  }}
                />
              </div>
              <span className="w-14 shrink-0 text-right font-metric text-xs text-text-muted">
                {(p * 100).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}%
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {/* Uyarılar (bilinmeyen kategori vb.) */}
      {result.warnings.length > 0 ? (
        <div className="mt-6 space-y-2">
          {result.warnings.map((w, i) => (
            <p
              key={i}
              className="flex items-center gap-2 rounded-xl border border-accent-amber/30 bg-accent-amber/10 px-4 py-2.5 text-sm text-accent-amber"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
              {w}
            </p>
          ))}
        </div>
      ) : null}
    </Panel>
  );
}
