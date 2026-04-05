import { HistoryItem, LlmResult } from "@/shared/types";

export type ResponseClassification = "explanation" | "list" | "code" | "short answer";

export type ModelAnalytics = {
  model: string;
  provider: string;
  qualityScore: number;
  costPerQuality: number;
  ttftMs: number;
  totalLatencyMs: number;
  costPerToken: number;
  verbosityScore: number;
  classification: ResponseClassification;
  consistencyScore: number | null;
  rankingScore: number;
  badges: string[];
  raw: LlmResult;
};

export type SimilarityEdge = {
  from: string;
  to: string;
  similarityPct: number;
  divergent: boolean;
};

export type FallbackRecommendation = {
  model: string;
  fallbackModel: string;
  similarityPct: number;
  latencyDeltaPct: number;
  costDeltaPct: number;
};

export type TrendPoint = {
  model: string;
  avgLatencyMs: number;
  avgCostUsd: number;
  usageCount: number;
};

export type AnalyticsBundle = {
  models: ModelAnalytics[];
  similarities: SimilarityEdge[];
  fallbacks: FallbackRecommendation[];
  trends: TrendPoint[];
  history: HistoryItem[];
};
