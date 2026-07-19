/**
 * NOVA backend için tipli fetch client.
 * Base URL: NEXT_PUBLIC_API_URL (varsayılan http://localhost:8000).
 */

import type {
  ApiErrorBody,
  ChartData,
  EdaResponse,
  UploadResponse,
} from "@/lib/eda-types";
import type {
  ImportanceList,
  ImportanceMethod,
  ModelDetail,
  ModelSummary,
  ModelType,
  PredictResponse,
  ProblemType,
  SampleRow,
  TargetAnalysis,
  TrainEvent,
} from "@/lib/train-types";
import type { BatchPredictResponse } from "@/lib/predict-types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Backend hata kodunu taşıyan istemci hatası. */
export class ApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== "object" || value === null) return false;
  const err = (value as { error?: unknown }).error;
  return (
    typeof err === "object" &&
    err !== null &&
    typeof (err as { code?: unknown }).code === "string" &&
    typeof (err as { message?: unknown }).message === "string"
  );
}

async function parseOrThrow<T>(res: Response): Promise<T> {
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    if (isErrorBody(data)) {
      throw new ApiError(data.error.code, data.error.message, res.status);
    }
    throw new ApiError(
      "UNKNOWN",
      `Beklenmeyen sunucu hatası (${res.status}).`,
      res.status,
    );
  }
  return data as T;
}

export async function uploadCsv(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      body: form,
    });
  } catch {
    throw new ApiError(
      "NETWORK",
      "Sunucuya ulaşılamadı. Backend çalışıyor mu?",
      0,
    );
  }
  return parseOrThrow<UploadResponse>(res);
}

export async function fetchEda(datasetId: string): Promise<EdaResponse> {
  const res = await fetch(
    `${BASE_URL}/api/eda/${encodeURIComponent(datasetId)}`,
  );
  return parseOrThrow<EdaResponse>(res);
}

export async function fetchColumns(
  datasetId: string,
  include: string[],
): Promise<ChartData> {
  const query =
    include.length > 0
      ? `?include=${encodeURIComponent(include.join(","))}`
      : "";
  const res = await fetch(
    `${BASE_URL}/api/eda/${encodeURIComponent(datasetId)}/columns${query}`,
  );
  return parseOrThrow<ChartData>(res);
}

// --- Eğitim / model / tahmin (Faz 3) -------------------------------------

export async function analyzeTarget(
  datasetId: string,
  column: string,
): Promise<TargetAnalysis> {
  const res = await fetch(
    `${BASE_URL}/api/train/target/${encodeURIComponent(datasetId)}?column=${encodeURIComponent(column)}`,
  );
  return parseOrThrow<TargetAnalysis>(res);
}

export interface TrainBody {
  dataset_id: string;
  target_column: string;
  model_type: ModelType;
  problem_type?: ProblemType;
  tune?: boolean;
}

/**
 * Eğitimi başlatır ve SSE olaylarını `onEvent` ile akıtır (fetch + ReadableStream).
 * Akış başlamadan gelen hata (ör. INVALID_TARGET) ApiError olarak fırlatılır.
 */
export async function trainStream(
  body: TrainBody,
  onEvent: (event: TrainEvent) => void,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api/train`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("NETWORK", "Sunucuya ulaşılamadı.", 0);
  }

  if (!res.ok || !res.body) {
    // Akış başlamadan hata → JSON gövdesi.
    const data: unknown = await res.json().catch(() => null);
    if (isErrorBody(data)) {
      throw new ApiError(data.error.code, data.error.message, res.status);
    }
    throw new ApiError("UNKNOWN", `Eğitim başlatılamadı (${res.status}).`, res.status);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const line = chunk.trim();
      if (line.startsWith("data: ")) {
        onEvent(JSON.parse(line.slice(6)) as TrainEvent);
      }
    }
  }
}

export async function fetchModels(): Promise<ModelSummary[]> {
  const res = await fetch(`${BASE_URL}/api/models`);
  return parseOrThrow<ModelSummary[]>(res);
}

export async function fetchModel(modelId: string): Promise<ModelDetail> {
  const res = await fetch(`${BASE_URL}/api/models/${encodeURIComponent(modelId)}`);
  return parseOrThrow<ModelDetail>(res);
}

export async function fetchImportance(
  modelId: string,
  opts?: { limit?: number; method?: ImportanceMethod },
): Promise<ImportanceList> {
  const params = new URLSearchParams();
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.method) params.set("method", opts.method);
  const query = params.toString() ? `?${params}` : "";
  const res = await fetch(
    `${BASE_URL}/api/models/${encodeURIComponent(modelId)}/importance${query}`,
  );
  return parseOrThrow<ImportanceList>(res);
}

export async function deleteModel(modelId: string): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/api/models/${encodeURIComponent(modelId)}`,
    { method: "DELETE" },
  );
  if (!res.ok) {
    const data: unknown = await res.json().catch(() => null);
    if (isErrorBody(data)) {
      throw new ApiError(data.error.code, data.error.message, res.status);
    }
    throw new ApiError("UNKNOWN", `Silinemedi (${res.status}).`, res.status);
  }
}

export async function fetchSampleRow(modelId: string): Promise<SampleRow> {
  const res = await fetch(
    `${BASE_URL}/api/models/${encodeURIComponent(modelId)}/sample-row`,
  );
  return parseOrThrow<SampleRow>(res);
}

export async function predict(
  modelId: string,
  features: Record<string, string | number | boolean | null>,
): Promise<PredictResponse> {
  const res = await fetch(`${BASE_URL}/api/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model_id: modelId, features }),
  });
  return parseOrThrow<PredictResponse>(res);
}

export async function predictBatch(
  modelId: string,
  file: File,
): Promise<BatchPredictResponse> {
  const form = new FormData();
  form.append("model_id", modelId);
  form.append("file", file);
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api/predict/batch`, {
      method: "POST",
      body: form,
    });
  } catch {
    throw new ApiError("NETWORK", "Sunucuya ulaşılamadı.", 0);
  }
  return parseOrThrow<BatchPredictResponse>(res);
}
