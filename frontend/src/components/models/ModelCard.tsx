"use client";

import {
  Check,
  CheckCircle2,
  Database,
  DatabaseZap,
  Play,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { deleteModel } from "@/lib/api";
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

interface Props {
  model: ModelSummary;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onDeleted: (id: string) => void;
}

export function ModelCard({ model, selected, onToggleSelect, onDeleted }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const metricLabel =
    model.primary_metric_name === "accuracy" ? "Accuracy" : "R²";

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteModel(model.model_id);
      onDeleted(model.model_id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Panel
      interactive
      className={
        "flex flex-col gap-4 p-6 " + (selected ? "ring-1 ring-primary/60" : "")
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            onClick={() => onToggleSelect(model.model_id)}
            aria-label="Karşılaştırma için seç"
            className={
              "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border " +
              (selected
                ? "border-primary bg-primary text-white"
                : "border-border-glow")
            }
          >
            {selected ? <Check className="h-3 w-3" aria-hidden /> : null}
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-text-primary">
              <Database className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span className="truncate font-medium">{model.filename}</span>
            </div>
            <p className="mt-1 text-sm text-text-muted">
              Hedef:{" "}
              <span className="text-text-primary">{model.target_column}</span>
            </p>
          </div>
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
        {model.cv ? (
          <Tag>
            CV {model.cv.mean.toLocaleString("tr-TR", { maximumFractionDigits: 3 })}
          </Tag>
        ) : null}
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
            {model.n_train}/{model.n_test} · {formatDate(model.created_at)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {confirming ? (
            <>
              <button
                type="button"
                onClick={remove}
                disabled={deleting}
                className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger"
              >
                {deleting ? "Siliniyor…" : "Sil"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-lg border border-border-glow px-3 py-2 text-xs text-text-muted"
              >
                Vazgeç
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label="Modeli sil"
              className="rounded-lg border border-border-glow p-2 text-text-muted hover:border-danger/40 hover:text-danger"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          )}
          <Link href={`/studio/predict/${model.model_id}`}>
            <Button icon={Play} className="!px-4 !py-2 text-sm">
              Tahmin
            </Button>
          </Link>
        </div>
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
