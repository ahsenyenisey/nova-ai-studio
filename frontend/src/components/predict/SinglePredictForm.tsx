"use client";

import { Sparkles } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/Button";
import type { FeatureSchemaItem } from "@/lib/train-types";

type FeatureValue = string | number | null;

interface Props {
  schema: FeatureSchemaItem[];
  loading: boolean;
  onSubmit: (features: Record<string, FeatureValue>) => void;
}

/** Model feature şemasından OTOMATİK üretilen tekil tahmin formu. */
export function SinglePredictForm({ schema, loading, onSubmit }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});

  const setValue = (name: string, value: string) =>
    setValues((v) => ({ ...v, [name]: value }));

  const submit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const features: Record<string, FeatureValue> = {};
      for (const f of schema) {
        const raw = values[f.name] ?? "";
        if (raw === "") {
          features[f.name] = null;
        } else if (f.type === "numeric") {
          const n = Number(raw);
          features[f.name] = Number.isNaN(n) ? null : n;
        } else {
          features[f.name] = raw;
        }
      }
      onSubmit(features);
    },
    [schema, values, onSubmit],
  );

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {schema.map((f) => (
          <div key={f.name}>
            <label className="mb-1.5 block text-sm text-text-muted">
              {f.name}
              <span className="ml-2 text-[11px] text-text-muted/60">
                {f.type === "numeric" ? "sayısal" : "kategorik"}
              </span>
            </label>
            {f.type === "numeric" ? (
              <input
                type="number"
                step="any"
                inputMode="decimal"
                value={values[f.name] ?? ""}
                onChange={(e) => setValue(f.name, e.target.value)}
                placeholder="sayı gir"
                className="w-full rounded-xl border border-border-glow bg-bg-nebula px-4 py-2.5 text-text-primary outline-none focus:border-primary/60"
              />
            ) : (
              <select
                value={values[f.name] ?? ""}
                onChange={(e) => setValue(f.name, e.target.value)}
                className="w-full rounded-xl border border-border-glow bg-bg-nebula px-4 py-2.5 text-text-primary outline-none focus:border-primary/60"
              >
                <option value="">— seç —</option>
                {(f.categories ?? []).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>

      <Button type="submit" icon={Sparkles} disabled={loading} className="w-full">
        {loading ? "Tahmin ediliyor…" : "Tahmin Et"}
      </Button>
    </form>
  );
}
