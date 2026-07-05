"use client";

import { motion } from "framer-motion";

import { Panel } from "@/components/ui/Panel";
import { EASE_CINEMATIC, STAGGER } from "@/lib/motion";
import type { MissingCell } from "@/lib/eda-types";

function barColor(ratio: number): string {
  if (ratio === 0) return "bg-accent-cyan";
  if (ratio < 0.2) return "bg-primary";
  if (ratio < 0.5) return "bg-accent-amber";
  return "bg-danger";
}

export function MissingMap({ cells }: { cells: MissingCell[] }) {
  return (
    <Panel animateIn className="p-6">
      <h2 className="mb-1 text-lg font-semibold">Eksik Değer Haritası</h2>
      <p className="mb-4 text-xs text-text-muted">
        Her sütunun eksik (boş) değer oranı.
      </p>
      <div className="max-h-80 space-y-2.5 overflow-y-auto pr-1">
        {cells.map((cell, i) => (
          <div key={cell.name} className="flex items-center gap-3">
            <span className="w-28 shrink-0 truncate text-sm text-text-muted">
              {cell.name}
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/5">
              <motion.div
                className={`h-full rounded-full ${barColor(cell.missing_ratio)}`}
                initial={{ width: 0 }}
                whileInView={{ width: `${Math.max(cell.missing_ratio * 100, 1.5)}%` }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.8,
                  ease: EASE_CINEMATIC,
                  delay: i * STAGGER,
                }}
              />
            </div>
            <span className="w-12 shrink-0 text-right font-metric text-xs text-text-muted">
              {(cell.missing_ratio * 100).toLocaleString("tr-TR", {
                maximumFractionDigits: 1,
              })}
              %
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
