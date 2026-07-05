"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, Brain } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ColumnSelector } from "@/components/eda/ColumnSelector";
import { ColumnTypesPanel } from "@/components/eda/ColumnTypesPanel";
import { CorrelationHeatmap } from "@/components/eda/CorrelationHeatmap";
import { DistributionCharts } from "@/components/eda/DistributionCharts";
import { MissingMap } from "@/components/eda/MissingMap";
import { StatusBar } from "@/components/studio/StatusBar";
import { Button } from "@/components/ui/Button";
import { EdaSkeleton } from "@/components/ui/Skeleton";
import { ApiError, fetchColumns, fetchEda } from "@/lib/api";
import { EASE_CINEMATIC } from "@/lib/motion";
import type { ChartData, EdaResponse } from "@/lib/eda-types";

export function EdaDashboard({ datasetId }: { datasetId: string }) {
  const [eda, setEda] = useState<EdaResponse | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chartsLoading, setChartsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    fetchEda(datasetId)
      .then((res) => {
        if (!active) return;
        setEda(res);
        setCharts(res.charts);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof ApiError ? err.message : "EDA yüklenemedi.",
        );
      });
    return () => {
      active = false;
    };
  }, [datasetId]);

  const allNumeric = useMemo(
    () =>
      eda
        ? eda.column_stats
            .filter((c) => c.inferred_type === "numeric")
            .map((c) => c.name)
        : [],
    [eda],
  );

  const applyColumns = useCallback(
    (cols: string[]) => {
      setChartsLoading(true);
      fetchColumns(datasetId, cols)
        .then((res) => setCharts(res))
        .catch((err: unknown) =>
          setError(
            err instanceof ApiError ? err.message : "Grafikler güncellenemedi.",
          ),
        )
        .finally(() => setChartsLoading(false));
    },
    [datasetId],
  );

  if (error) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
        <AlertTriangle className="h-10 w-10 text-danger" aria-hidden />
        <p className="text-text-primary">{error}</p>
        <Link href="/studio">
          <Button icon={ArrowLeft}>Yeni veri yükle</Button>
        </Link>
      </div>
    );
  }

  if (!eda || !charts) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <EdaSkeleton />
      </div>
    );
  }

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
        <h1 className="text-2xl font-bold">Keşifsel Analiz</h1>
        <div className="flex items-center gap-3">
          <ColumnSelector
            allNumeric={allNumeric}
            selected={charts.selected_columns}
            loading={chartsLoading}
            onApply={applyColumns}
          />
          <Link href={`/studio/train/${datasetId}`}>
            <Button icon={Brain} className="!px-4 !py-2 text-sm">
              Model Eğit
            </Button>
          </Link>
        </div>
      </motion.div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <ColumnTypesPanel stats={eda.column_stats} />
        <MissingMap cells={eda.missing_map} />
      </div>

      <div className="mt-6">
        <CorrelationHeatmap charts={charts} />
      </div>

      <div className="mt-6">
        <h2 className="mb-4 text-lg font-semibold">Dağılımlar</h2>
        <DistributionCharts distributions={charts.distributions} />
      </div>
    </div>
  );
}
