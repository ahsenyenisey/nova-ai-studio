"use client";

import { motion } from "framer-motion";
import { Boxes, FileSpreadsheet, History, User } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { BatchPredict } from "@/components/predict/BatchPredict";
import { PredictionReveal } from "@/components/predict/PredictionReveal";
import { SinglePredictForm } from "@/components/predict/SinglePredictForm";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState, toErrorInfo } from "@/components/ui/ErrorState";
import { EdaSkeleton } from "@/components/ui/Skeleton";
import { fetchModel, predict } from "@/lib/api";
import { EASE_CINEMATIC } from "@/lib/motion";
import type { ModelDetail, PredictResponse } from "@/lib/train-types";

type Tab = "single" | "batch";

export function PredictDashboard({ modelId }: { modelId: string }) {
  const [model, setModel] = useState<ModelDetail | null>(null);
  const [loadError, setLoadError] = useState<
    { message: string; code?: string } | null
  >(null);
  const [tab, setTab] = useState<Tab>("single");

  const [result, setResult] = useState<PredictResponse | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [predictError, setPredictError] = useState<
    { message: string; code?: string } | null
  >(null);
  const [history, setHistory] = useState<PredictResponse[]>([]);

  useEffect(() => {
    let active = true;
    fetchModel(modelId)
      .then((m) => active && setModel(m))
      .catch((e: unknown) => active && setLoadError(toErrorInfo(e)));
    return () => {
      active = false;
    };
  }, [modelId]);

  const onSubmit = useCallback(
    async (features: Record<string, string | number | null>) => {
      setPredictError(null);
      setPredicting(true);
      try {
        const res = await predict(modelId, features);
        setResult(res);
        setHistory((h) => [res, ...h].slice(0, 8));
      } catch (e) {
        setPredictError(toErrorInfo(e));
      } finally {
        setPredicting(false);
      }
    },
    [modelId],
  );

  if (loadError) {
    return (
      <div className="mx-auto max-w-md px-6 py-20">
        <ErrorState
          message={loadError.message}
          code={loadError.code}
          action={
            <Link href="/studio/models">
              <Button icon={Boxes}>Modellere dön</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (!model) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <EdaSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_CINEMATIC }}
        className="mb-6 flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl font-bold">Tahmin</h1>
          <p className="mt-1 text-sm text-text-muted">
            {model.filename} · hedef{" "}
            <span className="text-text-primary">{model.target_column}</span> ·{" "}
            {model.problem_type === "classification"
              ? "Sınıflandırma"
              : "Regresyon"}
          </p>
        </div>
        <Link href="/studio/models">
          <Button variant="ghost" icon={Boxes} className="!px-4 !py-2 text-sm">
            Modeller
          </Button>
        </Link>
      </motion.div>

      {/* Sekmeler */}
      <div className="mb-6 flex gap-2">
        <TabButton
          active={tab === "single"}
          icon={User}
          label="Tekil tahmin"
          onClick={() => setTab("single")}
        />
        <TabButton
          active={tab === "batch"}
          icon={FileSpreadsheet}
          label="Toplu (CSV)"
          onClick={() => setTab("batch")}
        />
      </div>

      {tab === "single" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel className="p-6">
            <h2 className="mb-4 text-lg font-semibold">Özellik değerleri</h2>
            {model.feature_schema.length === 0 ? (
              <EmptyState icon={User} title="Bu modelde girdi özelliği yok" />
            ) : (
              <SinglePredictForm
                modelId={modelId}
                schema={model.feature_schema}
                loading={predicting}
                sourceAvailable={model.source_dataset_available}
                onSubmit={onSubmit}
              />
            )}
            {predictError ? (
              <div className="mt-4">
                <ErrorState
                  message={predictError.message}
                  code={predictError.code}
                />
              </div>
            ) : null}
          </Panel>

          {result ? (
            <PredictionReveal result={result} />
          ) : (
            <Panel className="flex items-center justify-center p-6">
              <p className="text-center text-sm text-text-muted">
                Değerleri girip &quot;Tahmin Et&quot;e bas; sonuç burada belirir.
              </p>
            </Panel>
          )}
        </div>
      ) : (
        <BatchPredict modelId={modelId} />
      )}

      {tab === "single" && history.length > 0 ? (
        <Panel className="mt-6 p-6">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-text-muted">
            <History className="h-4 w-4" aria-hidden />
            Tahmin geçmişi (bu oturum)
          </h3>
          <div className="flex flex-wrap gap-2">
            {history.map((h, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setResult(h)}
                className="flex items-center gap-2 rounded-lg border border-border-glow bg-surface-glass px-3 py-1.5 text-sm hover:border-primary/40"
              >
                <span className="font-metric text-text-primary">
                  {typeof h.prediction === "number"
                    ? h.prediction.toLocaleString("tr-TR", {
                        maximumFractionDigits: 2,
                      })
                    : h.prediction}
                </span>
                {h.confidence !== null ? (
                  <span className="font-metric text-xs text-accent-cyan">
                    %{(h.confidence * 100).toFixed(0)}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof User;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex items-center gap-2 rounded-xl border px-4 py-2 text-sm transition-colors " +
        (active
          ? "border-primary bg-primary/15 text-text-primary"
          : "border-border-glow bg-surface-glass text-text-muted hover:border-primary/40")
      }
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}
