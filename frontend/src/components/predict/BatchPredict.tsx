"use client";

import { AlertTriangle, Download } from "lucide-react";
import { useCallback, useState } from "react";

import { PredictTable } from "@/components/predict/PredictTable";
import { Dropzone } from "@/components/studio/Dropzone";
import { Button } from "@/components/ui/Button";
import { ErrorState, toErrorInfo } from "@/components/ui/ErrorState";
import { predictBatch } from "@/lib/api";
import { downloadCsv, rowsToCsv } from "@/lib/csv";
import type { BatchPredictResponse } from "@/lib/predict-types";

const TABLE_LIMIT = 100;

export function BatchPredict({ modelId }: { modelId: string }) {
  const [result, setResult] = useState<BatchPredictResponse | null>(null);
  const [error, setError] = useState<{ message: string; code?: string } | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  const onFile = useCallback(
    async (file: File) => {
      setError(null);
      setResult(null);
      setLoading(true);
      try {
        setResult(await predictBatch(modelId, file));
      } catch (e) {
        setError(toErrorInfo(e));
      } finally {
        setLoading(false);
      }
    },
    [modelId],
  );

  const download = () => {
    if (!result) return;
    downloadCsv(
      "tahminler.csv",
      rowsToCsv(result.columns, result.rows),
    );
  };

  return (
    <div className="space-y-6">
      <Dropzone onFile={onFile} disabled={loading} />

      {loading ? (
        <p className="text-center font-metric text-sm text-accent-cyan">
          satırlar tahmin ediliyor…
        </p>
      ) : null}

      {error ? <ErrorState message={error.message} code={error.code} /> : null}

      {result ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-text-muted">
              {result.n_rows.toLocaleString("tr-TR")} satır tahmin edildi
              {result.n_rows > TABLE_LIMIT
                ? ` · ilk ${TABLE_LIMIT} gösteriliyor`
                : ""}
            </p>
            <Button icon={Download} onClick={download} className="!px-4 !py-2 text-sm">
              CSV indir
            </Button>
          </div>

          {result.warnings.length > 0 ? (
            <div className="space-y-2">
              {result.warnings.map((w, i) => (
                <p
                  key={i}
                  className="flex items-center gap-2 rounded-xl border border-accent-amber/30 bg-accent-amber/10 px-4 py-2.5 text-sm text-accent-amber"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                  {w}
                </p>
              ))}
            </div>
          ) : null}

          <PredictTable
            columns={result.columns}
            rows={result.rows}
            predictionColumn={result.prediction_column}
            limit={TABLE_LIMIT}
          />
        </div>
      ) : null}
    </div>
  );
}
