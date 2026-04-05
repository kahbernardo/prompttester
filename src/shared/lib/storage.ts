import { HistoryItem } from "@/shared/types";
import type { RankingFocus } from "@/lib/analytics/rankModels";
import type { LlmResult } from "@/shared/types";

const HISTORY_KEY = "llmComparatorHistory";
const ANALYTICS_CACHE_KEY = "llmComparatorAnalyticsCache";

export type AnalyticsCachePayload = {
  results: LlmResult[];
  batchRuns: LlmResult[][];
  consistencyEnabled: boolean;
  consistencyRuns: number;
  rankingFocus: RankingFocus;
};

export function loadHistory(): HistoryItem[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as HistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistory(history: HistoryItem[]): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function loadAnalyticsCache(): AnalyticsCachePayload | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(ANALYTICS_CACHE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as AnalyticsCachePayload;
    if (!parsed || !Array.isArray(parsed.results) || !Array.isArray(parsed.batchRuns)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveAnalyticsCache(payload: AnalyticsCachePayload): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(ANALYTICS_CACHE_KEY, JSON.stringify(payload));
}

export function clearAnalyticsCache(): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(ANALYTICS_CACHE_KEY);
}
