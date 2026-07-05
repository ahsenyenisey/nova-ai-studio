/**
 * Backend (`models/schemas.py`) yanıt tipleri. `any` yasak (CLAUDE.md).
 */

export type InferredType = "numeric" | "boolean" | "datetime" | "categorical";

export interface ColumnInfo {
  name: string;
  dtype: string;
  inferred_type: InferredType;
}

export interface UploadResponse {
  dataset_id: string;
  filename: string;
  encoding: string;
  n_rows: number;
  n_cols: number;
  columns: ColumnInfo[];
  preview: Array<Record<string, string | null>>;
}

export interface TopValue {
  value: string;
  count: number;
}

export interface ColumnStats {
  name: string;
  inferred_type: InferredType;
  missing_count: number;
  missing_ratio: number;
  mean: number | null;
  median: number | null;
  std: number | null;
  min: number | null;
  max: number | null;
  unique_count: number | null;
  top_values: TopValue[] | null;
}

export interface MissingCell {
  name: string;
  missing_ratio: number;
}

export interface HistogramBin {
  start: number;
  end: number;
  count: number;
}

export interface Distribution {
  name: string;
  inferred_type: InferredType;
  bins: HistogramBin[] | null;
  categories: TopValue[] | null;
  other_count: number | null;
}

export interface CorrelationMatrix {
  columns: string[];
  values: Array<Array<number | null>>;
}

export interface ChartData {
  selected_columns: string[];
  total_numeric: number;
  hidden_numeric_count: number;
  correlation_available: boolean;
  correlation_reason: string | null;
  correlation: CorrelationMatrix | null;
  distributions: Distribution[];
}

export interface EdaResponse {
  dataset_id: string;
  filename: string;
  encoding: string;
  n_rows: number;
  n_cols: number;
  column_stats: ColumnStats[];
  missing_map: MissingCell[];
  charts: ChartData;
}

/** Backend hata zarfı: `{ error: { code, message } }`. */
export interface ApiErrorBody {
  error: { code: string; message: string };
}
