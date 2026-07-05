"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { FeatureImportance } from "@/components/train/FeatureImportance";
import { MetricsPanel } from "@/components/train/MetricsPanel";
import { TargetModelSelector } from "@/components/train/TargetModelSelector";
import { TrainingConsole } from "@/components/train/TrainingConsole";
import { StatusBar } from "@/components/studio/StatusBar";
import { Button } from "@/components/ui/Button";
import { EdaSkeleton } from "@/components/ui/Skeleton";
import { ApiError, fetchEda, trainStream } from "@/lib/api";
import type { EdaResponse } from "@/lib/eda-types";
import { EASE_CINEMATIC } from "@/lib/motion";
import type {
  ModelDetail,
  ModelType,
  ProblemType,
  TrainEvent,
} from "@/lib/train-types";

export function TrainDashboard({ datasetId }: { datasetId: string }) {
  const [eda, setEda] = useState<EdaResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [events, setEvents] = useState<TrainEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [trainError, setTrainError] = useState<string | null>(null);
  const [result, setResult] = useState<ModelDetail | null>(null);

  useEffect(() => {
    let active = true;
    fetchEda(datasetId)
      .then((res) => active && setEda(res))
      .catch(
        (e: unknown) =>
          active &&
          setLoadError(e instanceof ApiError ? e.message : "Veri yüklenemedi."),
      );
    return () => {
      active = false;
    };
  }, [datasetId]);

  const onTrain = useCallback(
    async (target: string, modelType: ModelType, problemType: ProblemType) => {
      setEvents([]);
      setResult(null);
      setTrainError(null);
      setRunning(true);
      try {
        await trainStream(
          { dataset_id: datasetId, target_column: target, model_type: modelType, problem_type: problemType },
          (event) => {
            setEvents((prev) => [...prev, event]);
            if (event.stage === "done" && event.detail) setResult(event.detail);
            if (event.stage === "error") setTrainError(event.message);
          },
        );
      } catch (e) {
        setTrainError(e instanceof ApiError ? e.message : "Eğitim başarısız.");
      } finally {
        setRunning(false);
      }
    },
    [datasetId],
  );

  if (loadError) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
        <AlertTriangle className="h-10 w-10 text-danger" aria-hidden />
        <p className="text-text-primary">{loadError}</p>
        <Link href="/studio">
          <Button icon={ArrowLeft}>Yeni veri yükle</Button>
        </Link>
      </div>
    );
  }

  if (!eda) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <EdaSkeleton />
      </div>
    );
  }

  const started = events.length > 0 || running;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <StatusBar
        filename={eda.filename}
        nRows={eda.n_rows}
        nCols={eda.n_cols}
        encoding={eda.encoding}
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_CINEMATIC, delay: 0.1 }}
        className="mt-8 flex items-center justify-between"
      >
        <h1 className="text-2xl font-bold">Model Eğitimi</h1>
        <Link href={`/studio/eda/${datasetId}`}>
          <Button variant="ghost" icon={ArrowLeft} className="!px-4 !py-2 text-sm">
            EDA&apos;ya dön
          </Button>
        </Link>
      </motion.div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TargetModelSelector
          datasetId={datasetId}
          columns={eda.column_stats.map((c) => ({ name: c.name }))}
          disabled={running}
          onTrain={onTrain}
        />
        {started ? <TrainingConsole events={events} running={running} /> : null}
      </div>

      {trainError ? (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          {trainError}
        </div>
      ) : null}

      {result ? (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <MetricsPanel detail={result} />
          <FeatureImportance
            modelId={result.model_id}
            initial={result.importance}
          />
        </div>
      ) : null}
    </div>
  );
}
