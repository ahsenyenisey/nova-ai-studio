"use client";

import { motion } from "framer-motion";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { fetchImportance } from "@/lib/api";
import { EASE_CINEMATIC, STAGGER } from "@/lib/motion";
import type { ImportanceList, ImportanceMethod } from "@/lib/train-types";

const TOP = 15;

/** Feature importance — Model / Permutation; top-N + "+N daha" (Faz 2 deseni). */
export function FeatureImportance({
  modelId,
  initial,
  hasPermutation,
}: {
  modelId: string;
  initial: ImportanceList;
  hasPermutation: boolean;
}) {
  const [data, setData] = useState<ImportanceList>(initial);
  const [method, setMethod] = useState<ImportanceMethod>("model");
  const [loading, setLoading] = useState(false);

  const load = async (m: ImportanceMethod, limit?: number) => {
    setLoading(true);
    try {
      setData(await fetchImportance(modelId, { method: m, limit }));
      setMethod(m);
    } finally {
      setLoading(false);
    }
  };

  const max = Math.max(...data.items.map((i) => i.importance), 1e-9);

  return (
    <Panel animateIn className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Özellik Önemi</h2>
        {hasPermutation ? (
          <div className="flex rounded-lg border border-border-glow bg-surface-glass p-0.5 text-xs">
            <Toggle active={method === "model"} onClick={() => load("model", TOP)}>
              Model
            </Toggle>
            <Toggle
              active={method === "permutation"}
              onClick={() => load("permutation", TOP)}
            >
              Permutation
            </Toggle>
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        {data.items.map((item, idx) => (
          <div key={item.name} className="flex items-center gap-3">
            <span className="w-32 shrink-0 truncate text-sm text-text-muted">
              {item.name}
            </span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/5">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent-cyan"
                initial={{ width: 0 }}
                animate={{ width: `${(item.importance / max) * 100}%` }}
                transition={{
                  duration: 0.6,
                  ease: EASE_CINEMATIC,
                  delay: idx * STAGGER,
                }}
              />
            </div>
            <span className="w-14 shrink-0 text-right font-metric text-xs text-text-muted">
              {(item.importance * 100).toLocaleString("tr-TR", {
                maximumFractionDigits: 1,
              })}
              %
            </span>
          </div>
        ))}
      </div>

      {data.hidden_count > 0 ? (
        <div className="mt-5 flex justify-center">
          <Button
            variant="ghost"
            onClick={() => load(method)}
            disabled={loading}
            className="!px-4 !py-2 text-sm"
          >
            {loading ? "Yükleniyor…" : `+${data.hidden_count} özellik daha göster`}
          </Button>
        </div>
      ) : null}
    </Panel>
  );
}

function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-md px-3 py-1 transition-colors " +
        (active
          ? "bg-primary/20 text-text-primary"
          : "text-text-muted hover:text-text-primary")
      }
    >
      {children}
    </button>
  );
}
