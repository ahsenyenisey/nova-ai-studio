"use client";

import { motion } from "framer-motion";
import { EyeOff, Grid2x2 } from "lucide-react";

import { Panel } from "@/components/ui/Panel";
import type { ChartData } from "@/lib/eda-types";

/** Korelasyon değerini (-1..1) renge çevirir: pozitif→primary, negatif→danger. */
function cellColor(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "rgba(255,255,255,0.03)";
  const m = Math.min(Math.abs(value), 1);
  const rgb = value >= 0 ? "108,123,255" : "255,92,122";
  return `rgba(${rgb},${(0.12 + m * 0.85).toFixed(3)})`;
}

export function CorrelationHeatmap({ charts }: { charts: ChartData }) {
  const { correlation, correlation_available, correlation_reason } = charts;

  return (
    <Panel animateIn className="relative p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Grid2x2 className="h-4 w-4 text-primary" aria-hidden />
          Korelasyon Isı Haritası
        </h2>
        {charts.hidden_numeric_count > 0 ? (
          <span className="flex items-center gap-1 rounded-full border border-border-glow bg-bg-nebula px-2.5 py-1 text-xs text-text-muted">
            <EyeOff className="h-3 w-3" aria-hidden />+
            {charts.hidden_numeric_count} sütun gizli
          </span>
        ) : null}
      </div>

      {!correlation_available || !correlation ? (
        <p className="py-10 text-center text-sm text-text-muted">
          {correlation_reason ?? "Korelasyon hesaplanamadı."}
        </p>
      ) : (
        <HeatGrid columns={correlation.columns} values={correlation.values} />
      )}
    </Panel>
  );
}

function HeatGrid({
  columns,
  values,
}: {
  columns: string[];
  values: Array<Array<number | null>>;
}) {
  const n = columns.length;
  return (
    <div className="overflow-x-auto">
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `minmax(4.5rem,auto) repeat(${n}, minmax(1.6rem,1fr))`,
        }}
      >
        {/* Başlık satırı */}
        <div />
        {columns.map((c) => (
          <div
            key={`h-${c}`}
            className="truncate text-center font-metric text-[10px] text-text-muted"
            title={c}
          >
            {c}
          </div>
        ))}

        {/* Değer satırları */}
        {columns.map((rowName, i) => (
          <RowCells
            key={rowName}
            rowName={rowName}
            row={values[i]}
            rowIndex={i}
          />
        ))}
      </div>
    </div>
  );
}

function RowCells({
  rowName,
  row,
  rowIndex,
}: {
  rowName: string;
  row: Array<number | null>;
  rowIndex: number;
}) {
  return (
    <>
      <div
        className="truncate pr-2 text-right font-metric text-[10px] text-text-muted"
        title={rowName}
      >
        {rowName}
      </div>
      {row.map((v, j) => (
        <motion.div
          key={j}
          className="group relative aspect-square rounded-[3px]"
          style={{ backgroundColor: cellColor(v) }}
          initial={{ opacity: 0, scale: 0.6 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, delay: (rowIndex + j) * 0.012 }}
          title={v === null ? "—" : v.toFixed(2)}
        >
          <span className="pointer-events-none absolute inset-0 hidden items-center justify-center font-metric text-[8px] text-white/90 group-hover:flex">
            {v === null ? "" : v.toFixed(1)}
          </span>
        </motion.div>
      ))}
    </>
  );
}
