/** Toplu tahmin yanıtı — backend schemas.BatchPredictResponse ile hizalı. */

import type { ProblemType } from "@/lib/train-types";

export interface BatchPredictResponse {
  model_id: string;
  problem_type: ProblemType;
  prediction_column: string;
  columns: string[];
  rows: Array<Record<string, string | number | null>>;
  n_rows: number;
  warnings: string[];
}
