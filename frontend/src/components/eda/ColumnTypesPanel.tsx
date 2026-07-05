"use client";

import { Panel } from "@/components/ui/Panel";
import type { ColumnStats, InferredType } from "@/lib/eda-types";

const TYPE_STYLE: Record<InferredType, string> = {
  numeric: "border-primary/40 bg-primary/10 text-primary",
  categorical: "border-accent-amber/40 bg-accent-amber/10 text-accent-amber",
  boolean: "border-accent-cyan/40 bg-accent-cyan/10 text-accent-cyan",
  datetime: "border-text-muted/40 bg-white/5 text-text-muted",
};

const TYPE_LABEL: Record<InferredType, string> = {
  numeric: "sayısal",
  categorical: "kategorik",
  boolean: "boolean",
  datetime: "tarih",
};

function keyStat(col: ColumnStats): string {
  if (col.inferred_type === "numeric" && col.mean !== null) {
    return `ort ${col.mean.toLocaleString("tr-TR", {
      maximumFractionDigits: 2,
    })}`;
  }
  if (col.unique_count !== null) {
    return `${col.unique_count} benzersiz`;
  }
  return "—";
}

export function ColumnTypesPanel({ stats }: { stats: ColumnStats[] }) {
  return (
    <Panel animateIn className="overflow-hidden p-6">
      <h2 className="mb-4 text-lg font-semibold">Sütun Tipleri</h2>
      <div className="max-h-80 overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-bg-nebula/80 text-xs uppercase tracking-wider text-text-muted backdrop-blur">
            <tr>
              <th className="py-2 pr-3 font-medium">Sütun</th>
              <th className="py-2 pr-3 font-medium">Tip</th>
              <th className="py-2 pr-3 font-medium">Eksik</th>
              <th className="py-2 font-medium">Özet</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((col) => (
              <tr
                key={col.name}
                className="border-t border-border-glow/50"
              >
                <td className="max-w-[10rem] truncate py-2 pr-3 text-text-primary">
                  {col.name}
                </td>
                <td className="py-2 pr-3">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs ${TYPE_STYLE[col.inferred_type]}`}
                  >
                    {TYPE_LABEL[col.inferred_type]}
                  </span>
                </td>
                <td className="py-2 pr-3 font-metric text-text-muted">
                  {(col.missing_ratio * 100).toLocaleString("tr-TR", {
                    maximumFractionDigits: 1,
                  })}
                  %
                </td>
                <td className="py-2 font-metric text-text-muted">
                  {keyStat(col)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
