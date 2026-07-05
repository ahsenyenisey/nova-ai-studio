"use client";

import { motion } from "framer-motion";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { fetchImportance } from "@/lib/api";
import { EASE_CINEMATIC, STAGGER } from "@/lib/motion";
import type { ImportanceList } from "@/lib/train-types";

/** Feature importance — top-N gösterilir, gerisi istek üzerine (Faz 2 deseni). */
export function FeatureImportance({
  modelId,
  initial,
}: {
  modelId: string;
  initial: ImportanceList;
}) {
  const [data, setData] = useState<ImportanceList>(initial);
  const [loading, setLoading] = useState(false);

  const expand = async () => {
    setLoading(true);
    try {
      setData(await fetchImportance(modelId));
    } finally {
      setLoading(false);
    }
  };

  const max = Math.max(...data.items.map((i) => i.importance), 1e-9);

  return (
    <Panel animateIn className="p-6">
      <h2 className="mb-4 text-lg font-semibold">Özellik Önemi</h2>
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
                  duration: 0.7,
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
            onClick={expand}
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
