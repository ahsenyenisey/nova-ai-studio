/** Faz 3 (eğitim + minimal tahmin) tipleri — backend schemas.py ile hizalı. */

import type { InferredType } from "@/lib/eda-types";

export type ProblemType = "classification" | "regression";
export type ModelType = "random_forest" | "gradient_boosting" | "linear";
export type Tone = "confident" | "unsure";

export interface TargetAnalysis {
  column: string;
  inferred_type: InferredType;
  unique_count: number;
  sample_values: string[];
  trainable: boolean;
  suggested_problem_type: ProblemType | null;
  tone: Tone | null;
  reason: string;
  error: { code: string; message: string } | null;
}

/** SSE eğitim olayı; alanlar aşamaya göre opsiyonel doludur. */
export interface TrainEvent {
  stage: "validate" | "split" | "preprocess" | "train" | "evaluate" | "done" | "error";
  message: string;
  progress: number;
  n_train?: number;
  n_test?: number;
  trees_built?: number;
  trees_total?: number;
  model_id?: string;
  detail?: ModelDetail;
}

export interface FeatureSchemaItem {
  name: string;
  type: "numeric" | "categorical";
  categories: string[] | null;
}

export interface ConfusionMatrix {
  labels: string[];
  matrix: number[][];
}

export interface RocPoint {
  fpr: number;
  tpr: number;
}

export interface RocCurve {
  points: RocPoint[];
  auc: number;
  positive_label: string;
}

export interface CvScore {
  mean: number;
  std: number;
  folds: number;
  metric: string;
}

export interface ClassificationMetrics {
  accuracy: number;
  f1: number;
  precision: number;
  recall: number;
  class_labels: string[];
  confusion_matrix: ConfusionMatrix;
  auc: number | null;
  roc: RocCurve | null;
}

export interface ResidualPoint {
  actual: number;
  predicted: number;
}

export interface RegressionMetrics {
  r2: number;
  mae: number;
  rmse: number;
  residuals: ResidualPoint[];
  residual_std: number;
}

export interface FeatureImportanceItem {
  name: string;
  importance: number;
}

export interface ImportanceList {
  items: FeatureImportanceItem[];
  total: number;
  hidden_count: number;
}

export interface ModelSummary {
  model_id: string;
  filename: string;
  target_column: string;
  problem_type: ProblemType;
  model_type: ModelType;
  created_at: string;
  n_train: number;
  n_test: number;
  source_dataset_available: boolean;
  primary_metric_name: string;
  primary_metric_value: number;
  cv: CvScore | null;
}

export interface ModelDetail extends ModelSummary {
  feature_schema: FeatureSchemaItem[];
  classification: ClassificationMetrics | null;
  regression: RegressionMetrics | null;
  importance: ImportanceList;
  best_params: Record<string, string> | null;
  has_permutation: boolean;
}

export interface PredictionInterval {
  low: number;
  high: number;
}

export interface PredictResponse {
  model_id: string;
  problem_type: ProblemType;
  prediction: string | number;
  probabilities: Record<string, number> | null;
  confidence: number | null;
  interval: PredictionInterval | null;
  warnings: string[];
}

export interface SampleRow {
  values: Record<string, string | number | null>;
}

export type ImportanceMethod = "model" | "permutation";

export const MODEL_LABELS: Record<ModelType, string> = {
  random_forest: "Random Forest",
  gradient_boosting: "Gradient Boosting",
  linear: "Doğrusal / Lojistik",
};
