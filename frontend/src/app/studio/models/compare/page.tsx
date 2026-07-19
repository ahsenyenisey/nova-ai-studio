"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { ErrorState, toErrorInfo } from "@/components/ui/ErrorState";
import { Panel } from "@/components/ui/Panel";
import { EdaSkeleton } from "@/components/ui/Skeleton";
import { fetchModel } from "@/lib/api";
import { MODEL_LABELS, type ModelDetail } from "@/lib/train-types";

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-6 py-10">
          <EdaSkeleton />
        </div>
      }
    >
      <CompareView />
    </Suspense>
  );
}

function fmt(n: number | null | undefined, d = 3): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("tr-TR", { maximumFractionDigits: d });
}

function CompareView() {
  const params = useSearchParams();
  const ids = (params.get("ids") ?? "").split(",").filter(Boolean);
  const [models, setModels] = useState<ModelDetail[] | null>(null);
  const [error, setError] = useState<{ message: string; code?: string } | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    Promise.all(ids.map((id) => fetchModel(id)))
      .then((m) => active && setModels(m))
      .catch((e: unknown) => active && setError(toErrorInfo(e)));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const rows: { label: string; get: (m: ModelDetail) => string }[] = [
    { label: "Veri seti", get: (m) => m.filename },
    { label: "Hedef", get: (m) => m.target_column },
    {
      label: "Problem",
      get: (m) =>
        m.problem_type === "classification" ? "Sınıflandırma" : "Regresyon",
    },
    { label: "Model", get: (m) => MODEL_LABELS[m.model_type] },
    {
      label: "Birincil metrik",
      get: (m) =>
        `${m.primary_metric_name === "accuracy" ? "Accuracy" : "R²"} ${fmt(m.primary_metric_value)}`,
    },
    {
      label: "CV",
      get: (m) => (m.cv ? `${fmt(m.cv.mean)} ± ${fmt(m.cv.std)}` : "—"),
    },
    { label: "F1", get: (m) => fmt(m.classification?.f1) },
    { label: "AUC", get: (m) => fmt(m.classification?.auc) },
    { label: "MAE", get: (m) => fmt(m.regression?.mae, 2) },
    { label: "RMSE", get: (m) => fmt(m.regression?.rmse, 2) },
    { label: "Eğitim/Test", get: (m) => `${m.n_train}/${m.n_test}` },
  ];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Model Karşılaştırma</h1>
        <Link href="/studio/models">
          <Button variant="ghost" icon={ArrowLeft} className="!px-4 !py-2 text-sm">
            Modeller
          </Button>
        </Link>
      </div>

      {error ? (
        <ErrorState message={error.message} code={error.code} />
      ) : !models ? (
        <EdaSkeleton />
      ) : (
        <Panel className="overflow-x-auto p-6">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border-glow">
                <th className="py-2 pr-4 font-medium text-text-muted"> </th>
                {models.map((m) => (
                  <th
                    key={m.model_id}
                    className="py-2 pr-4 font-medium text-text-primary"
                  >
                    {MODEL_LABELS[m.model_type]}
                    <div className="font-metric text-xs text-text-muted">
                      {m.target_column}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-border-glow/40">
                  <td className="py-2.5 pr-4 text-text-muted">{row.label}</td>
                  {models.map((m) => (
                    <td
                      key={m.model_id}
                      className="py-2.5 pr-4 font-metric text-text-primary"
                    >
                      {row.get(m)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </main>
  );
}
