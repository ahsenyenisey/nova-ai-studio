"use client";

import { Shuffle, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/Button";
import { ApiError, fetchSampleRow } from "@/lib/api";
import type { FeatureSchemaItem } from "@/lib/train-types";

type FeatureValue = string | number | null;

interface Props {
  modelId: string;
  schema: FeatureSchemaItem[];
  loading: boolean;
  sourceAvailable: boolean;
  onSubmit: (features: Record<string, FeatureValue>) => void;
}

/** Model feature şemasından OTOMATİK üretilen tekil tahmin formu. */
export function SinglePredictForm({
  modelId,
  schema,
  loading,
  sourceAvailable,
  onSubmit,
}: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [sampleError, setSampleError] = useState<string | null>(null);
  const [filling, setFilling] = useState(false);

  const setValue = (name: string, value: string) =>
    setValues((v) => ({ ...v, [name]: value }));

  const fillSample = async () => {
    setSampleError(null);
    setFilling(true);
    try {
      const { values: sample } = await fetchSampleRow(modelId);
      const next: Record<string, string> = {};
      for (const f of schema) {
        const v = sample[f.name];
        next[f.name] = v === null || v === undefined ? "" : String(v);
      }
      setValues(next);
    } catch (e) {
      setSampleError(
        e instanceof ApiError ? e.message : "Örnek satır alınamadı.",
      );
    } finally {
      setFilling(false);
    }
  };

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
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={fillSample}
          disabled={!sourceAvailable || filling || loading}
          title={
            sourceAvailable
              ? "Kaynak veriden rastgele bir satırla doldur"
              : "Kaynak veri seti bellekten düştü"
          }
          className="flex items-center gap-1.5 rounded-lg border border-border-glow bg-surface-glass px-3 py-1.5 text-xs text-text-muted transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Shuffle className="h-3.5 w-3.5" aria-hidden />
          {filling ? "Dolduruluyor…" : "Örnek satırla doldur"}
        </button>
      </div>

      {sampleError ? (
        <p className="text-sm text-danger">{sampleError}</p>
      ) : null}

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
