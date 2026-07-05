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
