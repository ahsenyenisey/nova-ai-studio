"use client";

import { motion } from "framer-motion";
import { Terminal } from "lucide-react";
import { useEffect, useRef } from "react";

import { Panel } from "@/components/ui/Panel";
import type { TrainEvent } from "@/lib/train-types";

const STAGE_COLOR: Record<string, string> = {
  validate: "text-text-muted",
  split: "text-text-muted",
  preprocess: "text-text-muted",
  train: "text-accent-cyan",
  evaluate: "text-primary",
  done: "text-accent-cyan",
  error: "text-danger",
};

interface Props {
  events: TrainEvent[];
  running: boolean;
}

/** Terminal estetiğinde GERÇEK eğitim logları (SSE olayları) + ilerleme çubuğu. */
export function TrainingConsole({ events, running }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const progress = events.length ? events[events.length - 1].progress : 0;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [events.length]);

  return (
    <Panel className="p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <Terminal className="h-4 w-4 text-accent-cyan" aria-hidden />
        Eğitim Günlüğü
      </h2>

      <div
        ref={scrollRef}
        className="h-56 overflow-y-auto rounded-xl border border-border-glow bg-bg-void/60 p-4 font-metric text-xs leading-relaxed"
      >
        {events.map((e, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            className={STAGE_COLOR[e.stage] ?? "text-text-muted"}
          >
            <span className="text-text-muted/50">
              {String(i + 1).padStart(2, "0")}
            </span>{" "}
            <span className="text-primary">›</span> {e.message}
          </motion.div>
        ))}
        {running ? (
          <motion.span
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="text-accent-cyan"
          >
            ▍
          </motion.span>
        ) : null}
      </div>

      {/* İlerleme çubuğu — gerçek progress değerinden */}
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent-cyan"
          animate={{ width: `${Math.round(progress * 100)}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </Panel>
  );
}
