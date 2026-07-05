"use client";

import { Database } from "lucide-react";

import { CountUp } from "@/components/ui/CountUp";

interface StatusBarProps {
  filename: string;
  nRows: number;
  nCols: number;
  encoding: string;
}

/** Üstte ince durum çubuğu: veri seti adı, satır/sütun sayısı, encoding rozeti. */
export function StatusBar({ filename, nRows, nCols, encoding }: StatusBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-border-glow bg-surface-glass px-5 py-3 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-text-primary">
        <Database className="h-4 w-4 text-primary" aria-hidden />
        <span className="font-medium">{filename}</span>
      </div>
      <Metric label="satır" value={nRows} />
      <Metric label="sütun" value={nCols} />
      <span className="ml-auto rounded-full border border-accent-cyan/30 bg-accent-cyan/10 px-3 py-1 font-metric text-xs text-accent-cyan">
        {encoding}
      </span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <CountUp
        value={value}
        className="font-metric text-lg text-text-primary"
      />
      <span className="text-xs text-text-muted">{label}</span>
    </div>
  );
}
