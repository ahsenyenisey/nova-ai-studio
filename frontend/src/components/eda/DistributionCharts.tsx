"use client";

import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

import { Panel } from "@/components/ui/Panel";
import { EASE_CINEMATIC, STAGGER } from "@/lib/motion";
import type { Distribution } from "@/lib/eda-types";

function toRows(dist: Distribution): Array<{ label: string; count: number }> {
  if (dist.bins) {
    return dist.bins.map((b) => ({
      label: b.start.toLocaleString("tr-TR", { maximumFractionDigits: 1 }),
      count: b.count,
    }));
  }
  return (dist.categories ?? []).map((c) => ({
    label: c.value,
    count: c.count,
  }));
}

function Histogram({ dist, index }: { dist: Distribution; index: number }) {
  const rows = toRows(dist);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: EASE_CINEMATIC, delay: index * STAGGER }}
    >
      <Panel className="p-4">
        <h3 className="mb-3 truncate text-sm font-medium text-text-primary">
          {dist.name}
        </h3>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <XAxis
              dataKey="label"
              tick={{ fill: "#8b90b3", fontSize: 10 }}
              interval="preserveStartEnd"
              tickLine={false}
              axisLine={{ stroke: "rgba(120,140,255,0.15)" }}
            />
            <Tooltip
              cursor={{ fill: "rgba(108,123,255,0.08)" }}
              contentStyle={{
                background: "#0b0e1f",
                border: "1px solid rgba(120,140,255,0.3)",
                borderRadius: 12,
                color: "#e8eaf6",
                fontSize: 12,
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive>
              {rows.map((_, i) => (
                <Cell key={i} fill="#6c7bff" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>
    </motion.div>
  );
}

export function DistributionCharts({
  distributions,
}: {
  distributions: Distribution[];
}) {
  if (distributions.length === 0) {
    return (
      <Panel className="p-6 text-center text-sm text-text-muted">
        Görselleştirilecek sayısal sütun yok.
      </Panel>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {distributions.map((dist, i) => (
        <Histogram key={dist.name} dist={dist} index={i} />
      ))}
    </div>
  );
}
