import { AlertTriangle, DatabaseZap } from "lucide-react";
import type { ReactNode } from "react";

import { ApiError } from "@/lib/api";

/** Hata koduna göre kısa, dostça bir ipucu (mesajın altında gösterilir). */
const CODE_HINTS: Record<string, string> = {
  MODEL_DATASET_EVICTED:
    "Bu işlem kaynak veri setini gerektiriyor; veri seti bellekten düşmüş. CSV'yi yeniden yükleyin.",
  MODEL_NOT_FOUND: "Model bellekten düşmüş olabilir; yeniden eğitin.",
  DATASET_NOT_FOUND: "Veri seti bellekten düşmüş; CSV'yi yeniden yükleyin.",
  MISSING_FEATURES: "Yüklenen CSV modelin beklediği tüm sütunları içermiyor.",
};

interface ErrorStateProps {
  message: string;
  code?: string;
  action?: ReactNode;
}

/** Ortak hata durumu bileşeni; MODEL_DATASET_EVICTED dahil kodları tanır. */
export function ErrorState({ message, code, action }: ErrorStateProps) {
  const hint = code ? CODE_HINTS[code] : undefined;
  const evicted = code === "MODEL_DATASET_EVICTED";
  const Icon = evicted ? DatabaseZap : AlertTriangle;
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-danger/30 bg-danger/10 px-6 py-12 text-center">
      <Icon className="h-8 w-8 text-danger" aria-hidden />
      <p className="max-w-md text-text-primary">{message}</p>
      {hint ? <p className="max-w-md text-xs text-text-muted">{hint}</p> : null}
      {action}
    </div>
  );
}

/** Bilinmeyen hatayı ApiError koduna/mesajına indirger (küçük yardımcı). */
export function toErrorInfo(e: unknown): { message: string; code?: string } {
  if (e instanceof ApiError) return { message: e.message, code: e.code };
  return { message: "Beklenmeyen bir hata oluştu." };
}
