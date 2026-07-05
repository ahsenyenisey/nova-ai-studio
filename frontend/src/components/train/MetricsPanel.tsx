"use client";

import {
  CartesianGrid,
  ReferenceLine,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";

import { CountUp } from "@/components/ui/CountUp";
import { Panel } from "@/components/ui/Panel";
import type {
  ClassificationMetrics,
  ModelDetail,
  RegressionMetrics,
} from "@/lib/train-types";

export function MetricsPanel({ detail }: { detail: ModelDetail }) {
  return (
    <Panel animateIn className="p-6">
      <h2 className="mb-1 text-lg font-semibold">Sonuç Metrikleri</h2>
      <p className="mb-5 text-xs text-text-muted">
        Test seti · {detail.n_test} örnek ({detail.n_train} ile eğitildi)
      </p>
      {detail.classification ? (
        <ClassificationView m={detail.classification} />
      ) : detail.regression ? (
        <RegressionView m={detail.regression} />
      ) : null}
    </Panel>
  );
}

function MetricCard({
  label,
  value,
  decimals = 3,
  suffix = "",
}: {
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-xl border border-border-glow bg-surface-glass px-4 py-3">
      <div className="text-xs uppercase tracking-wider text-text-muted">
        {label}
      </div>
      <CountUp
        value={value}
        decimals={decimals}
        suffix={suffix}
        className="font-metric text-2xl text-text-primary"
      />
    </div>
  );
}

function ClassificationView({ m }: { m: ClassificationMetrics }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="accuracy" value={m.accuracy} />
        <MetricCard label="f1" value={m.f1} />
        <MetricCard label="precision" value={m.precision} />
        <MetricCard label="recall" value={m.recall} />
      </div>
      <ConfusionMatrixView
        labels={m.confusion_matrix.labels}
        matrix={m.confusion_matrix.matrix}
      />
    </div>
  );
}

function ConfusionMatrixView({
  labels,
  matrix,
}: {
  labels: string[];
  matrix: number[][];
}) {
  const max = Math.max(1, ...matrix.flat());
  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-text-muted">
        Confusion Matrix{" "}
        <span className="text-xs">(satır: gerçek · sütun: tahmin)</span>
      </h3>
      <div className="overflow-x-auto">
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: `minmax(3rem,auto) repeat(${labels.length}, minmax(2.5rem,1fr))`,
          }}
        >
          <div />
          {labels.map((l) => (
            <div
              key={`c-${l}`}
              className="truncate text-center font-metric text-[11px] text-text-muted"
              title={l}
            >
              {l}
            </div>
          ))}
          {matrix.map((row, i) => (
            <ConfusionRow
              key={labels[i]}
              label={labels[i]}
              row={row}
              max={max}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ConfusionRow({
  label,
  row,
  max,
}: {
  label: string;
  row: number[];
  max: number;
}) {
  return (
    <>
      <div
        className="truncate pr-2 text-right font-metric text-[11px] text-text-muted"
        title={label}
      >
        {label}
      </div>
      {row.map((v, j) => (
        <div
          key={j}
          className="flex aspect-square items-center justify-center rounded-md font-metric text-xs text-text-primary"
          style={{
            backgroundColor: `rgba(108,123,255,${(0.08 + (v / max) * 0.8).toFixed(3)})`,
          }}
        >
          {v}
        </div>
      ))}
    </>
  );
}

function RegressionView({ m }: { m: RegressionMetrics }) {
  const min = Math.min(
    ...m.residuals.map((r) => Math.min(r.actual, r.predicted)),
  );
  const max = Math.max(
    ...m.residuals.map((r) => Math.max(r.actual, r.predicted)),
  );
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="R²" value={m.r2} />
        <MetricCard label="MAE" value={m.mae} decimals={2} />
        <MetricCard label="RMSE" value={m.rmse} decimals={2} />
      </div>
      <div>
        <h3 className="mb-3 text-sm font-medium text-text-muted">
          Gerçek vs Tahmin (test seti)
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <ScatterChart margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="rgba(120,140,255,0.1)" />
            <XAxis
              type="number"
              dataKey="actual"
              name="gerçek"
              tick={{ fill: "#8b90b3", fontSize: 11 }}
              domain={[min, max]}
            />
            <YAxis
              type="number"
              dataKey="predicted"
              name="tahmin"
              tick={{ fill: "#8b90b3", fontSize: 11 }}
              domain={[min, max]}
            />
            <ReferenceLine
              segment={[
                { x: min, y: min },
                { x: max, y: max },
              ]}
              stroke="#4ee1d0"
              strokeDasharray="4 4"
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              contentStyle={{
                background: "#0b0e1f",
                border: "1px solid rgba(120,140,255,0.3)",
                borderRadius: 12,
                color: "#e8eaf6",
                fontSize: 12,
              }}
            />
            <Scatter data={m.residuals} fill="#6c7bff" fillOpacity={0.6} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
