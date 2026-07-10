"use client";

import { CheckCircle2, Database, DatabaseZap, Play } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { MODEL_LABELS, type ModelSummary } from "@/lib/train-types";

const PROBLEM_LABEL = {
  classification: "Sınıflandırma",
  regression: "Regresyon",
} as const;

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ModelCard({ model }: { model: ModelSummary }) {
  const metricLabel =
    model.primary_metric_name === "accuracy" ? "Accuracy" : "R²";
  return (
    <Panel interactive className="flex flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-text-primary">
            <Database className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span className="truncate font-medium">{model.filename}</span>
          </div>
          <p className="mt-1 text-sm text-text-muted">
            Hedef: <span className="text-text-primary">{model.target_column}</span>
          </p>
        </div>
        {model.source_dataset_available ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-accent-cyan/30 bg-accent-cyan/10 px-2.5 py-1 text-[11px] text-accent-cyan">
            <CheckCircle2 className="h-3 w-3" aria-hidden />
            veri mevcut
          </span>
        ) : (
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-accent-amber/30 bg-accent-amber/10 px-2.5 py-1 text-[11px] text-accent-amber">
            <DatabaseZap className="h-3 w-3" aria-hidden />
            kaynak veri düştü
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <Tag>{PROBLEM_LABEL[model.problem_type]}</Tag>
        <Tag>{MODEL_LABELS[model.model_type]}</Tag>
      </div>

      <div className="flex items-end justify-between border-t border-border-glow/50 pt-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-text-muted">
            {metricLabel}
          </div>
          <div className="font-metric text-2xl text-text-primary">
            {model.primary_metric_value.toLocaleString("tr-TR", {
              maximumFractionDigits: 3,
            })}
          </div>
          <div className="mt-1 font-metric text-[11px] text-text-muted">
            {model.n_train}/{model.n_test} eğitim/test · {formatDate(model.created_at)}
          </div>
        </div>
        <Link href={`/studio/predict/${model.model_id}`}>
          <Button icon={Play} className="!px-4 !py-2 text-sm">
            Tahmin
          </Button>
        </Link>
      </div>
    </Panel>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border-glow bg-surface-glass px-2.5 py-1 text-text-muted">
      {children}
    </span>
  );
}
