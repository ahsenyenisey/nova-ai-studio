"use client";

import { motion } from "framer-motion";
import { Check, HelpCircle, Lightbulb, Play } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { analyzeTarget, ApiError } from "@/lib/api";
import {
  MODEL_LABELS,
  type ModelType,
  type ProblemType,
  type TargetAnalysis,
} from "@/lib/train-types";

interface Props {
  datasetId: string;
  columns: { name: string }[];
  disabled?: boolean;
  onTrain: (
    target: string,
    modelType: ModelType,
    problemType: ProblemType,
    tune: boolean,
  ) => void;
}

const MODEL_TYPES: ModelType[] = ["random_forest", "gradient_boosting", "linear"];

export function TargetModelSelector({
  datasetId,
  columns,
  disabled = false,
  onTrain,
}: Props) {
  const [target, setTarget] = useState<string>("");
  const [analysis, setAnalysis] = useState<TargetAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [override, setOverride] = useState<ProblemType | null>(null);
  const [modelType, setModelType] = useState<ModelType>("random_forest");
  const [tune, setTune] = useState(false);

  useEffect(() => {
    if (!target) return;
    let active = true;
    analyzeTarget(datasetId, target)
      .then((a) => active && setAnalysis(a))
      .catch(
        (e: unknown) =>
          active &&
          setAnalysisError(e instanceof ApiError ? e.message : "Analiz başarısız."),
      );
    return () => {
      active = false;
    };
  }, [datasetId, target]);

  // Hedef değişince önceki analizi/override'ı olay anında sıfırla (effect-içi
  // senkron setState yerine — cascading render yok).
  const selectTarget = (value: string) => {
    setTarget(value);
    setAnalysis(null);
    setAnalysisError(null);
    setOverride(null);
  };

  const effectiveType: ProblemType | null =
    override ?? analysis?.suggested_problem_type ?? null;

  const numericTarget = analysis?.inferred_type === "numeric";

  const handleTrain = useCallback(() => {
    if (target && effectiveType) onTrain(target, modelType, effectiveType, tune);
  }, [target, effectiveType, modelType, tune, onTrain]);

  return (
    <Panel className="p-6">
      <h2 className="mb-4 text-lg font-semibold">Model Eğit</h2>

      {/* Hedef sütun */}
      <label className="mb-2 block text-sm text-text-muted">Hedef sütun</label>
      <select
        value={target}
        onChange={(e) => selectTarget(e.target.value)}
        disabled={disabled}
        className="w-full rounded-xl border border-border-glow bg-bg-nebula px-4 py-2.5 text-text-primary outline-none focus:border-primary/60"
      >
        <option value="">— sütun seç —</option>
        {columns.map((c) => (
          <option key={c.name} value={c.name}>
            {c.name}
          </option>
        ))}
      </select>

      {/* Öneri rozeti */}
      {analysisError ? (
        <p className="mt-4 text-sm text-danger">{analysisError}</p>
      ) : null}

      {analysis && !analysis.trainable ? (
        <p className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {analysis.reason}
        </p>
      ) : null}

      {analysis && analysis.trainable ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 space-y-4"
        >
          <div
            className={
              "flex items-start gap-2 rounded-xl border px-4 py-3 text-sm " +
              (analysis.tone === "unsure"
                ? "border-accent-amber/40 bg-accent-amber/10 text-accent-amber"
                : "border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan")
            }
          >
            {analysis.tone === "unsure" ? (
              <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            )}
            <span>
              {analysis.reason}{" "}
              <span className="text-text-muted">
                ({analysis.unique_count} benzersiz: {analysis.sample_values
                  .slice(0, 4)
                  .join(", ")}
                )
              </span>
            </span>
          </div>

          {/* Problem tipi override */}
          <div>
            <label className="mb-2 block text-sm text-text-muted">
              Problem tipi
            </label>
            <div className="flex gap-2">
              <TypePill
                label="Sınıflandırma"
                active={effectiveType === "classification"}
                suggested={analysis.suggested_problem_type === "classification"}
                onClick={() => setOverride("classification")}
              />
              <TypePill
                label="Regresyon"
                active={effectiveType === "regression"}
                suggested={analysis.suggested_problem_type === "regression"}
                disabled={!numericTarget}
                onClick={() => setOverride("regression")}
              />
            </div>
          </div>

          {/* Model tipi */}
          <div>
            <label className="mb-2 block text-sm text-text-muted">Model</label>
            <div className="flex flex-wrap gap-2">
              {MODEL_TYPES.map((m) => (
                <TypePill
                  key={m}
                  label={MODEL_LABELS[m]}
                  active={modelType === m}
                  onClick={() => setModelType(m)}
                />
              ))}
            </div>
          </div>

          {/* Hiperparametre ayarı */}
          <button
            type="button"
            onClick={() => setTune((t) => !t)}
            disabled={disabled}
            className="flex w-full items-center gap-3 rounded-xl border border-border-glow bg-surface-glass px-4 py-3 text-left text-sm disabled:opacity-50"
          >
            <span
              className={
                "flex h-4 w-4 shrink-0 items-center justify-center rounded border " +
                (tune ? "border-primary bg-primary text-white" : "border-border-glow")
              }
            >
              {tune ? <Check className="h-3 w-3" aria-hidden /> : null}
            </span>
            <span>
              <span className="text-text-primary">Hiperparametre ayarı</span>
              <span className="ml-2 text-xs text-text-muted">
                küçük grid ile en iyi ayarı ara (biraz yavaşlatır)
              </span>
            </span>
          </button>

          <Button
            icon={Play}
            onClick={handleTrain}
            disabled={disabled || !effectiveType}
            className="w-full"
          >
            {disabled ? "Eğitiliyor…" : "Eğitimi Başlat"}
          </Button>
        </motion.div>
      ) : null}
    </Panel>
  );
}

function TypePill({
  label,
  active,
  suggested = false,
  disabled = false,
  onClick,
}: {
  label: string;
  active: boolean;
  suggested?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        "relative rounded-xl border px-4 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 " +
        (active
          ? "border-primary bg-primary/15 text-text-primary"
          : "border-border-glow bg-surface-glass text-text-muted hover:border-primary/40")
      }
    >
      {label}
      {suggested ? (
        <span className="ml-2 rounded-full bg-accent-cyan/20 px-1.5 py-0.5 text-[10px] text-accent-cyan">
          önerilen
        </span>
      ) : null}
    </button>
  );
}
