"use client";

import {
  buildModelExecutionPlan,
  ExecutionRuntimeCapabilities,
  getDefaultExecutionRuntimeCapabilities
} from "@/features/comparator/domain/modelExecutionService";
import { getProviderByModel } from "@/features/comparator/providers/llmProvider";
import type { RankingFocus } from "@/lib/analytics/rankModels";
import { clearAnalyticsCache, loadAnalyticsCache, loadHistory, saveAnalyticsCache, saveHistory } from "@/shared/lib/storage";
import {
  CompareStartResponse,
  CompareStatusResponse,
  HistoryItem,
  LlmResult,
  PricingMap,
  PricingResponse,
  PricingSource,
  ProviderAvailability,
  ProviderDiagnostics,
  ProviderAvailabilityResponse,
  SortBy
} from "@/shared/types";
import { create } from "zustand";

const defaultModels = ["gpt-4.1", "claude-3-5-sonnet-latest", "gemini-2.0-flash"];
const MAX_SELECTED_MODELS = 5;
const emptyProviderDiagnostics: ProviderDiagnostics = {
  openai: { status: "missingKey", checkedAt: "" },
  anthropic: { status: "missingKey", checkedAt: "" },
  google: { status: "missingKey", checkedAt: "" },
  mistral: { status: "missingKey", checkedAt: "" },
  deepseek: { status: "missingKey", checkedAt: "" },
  xai: { status: "missingKey", checkedAt: "" },
  meta: { status: "missingKey", checkedAt: "" },
  codex: { status: "missingKey", checkedAt: "" },
  amazon: { status: "missingKey", checkedAt: "" },
  minimax: { status: "missingKey", checkedAt: "" },
  moonshot: { status: "missingKey", checkedAt: "" },
  qwen: { status: "missingKey", checkedAt: "" }
};

type ComparatorStore = {
  prompt: string;
  selectedModels: string[];
  mockMode: boolean;
  sortBy: SortBy;
  loading: boolean;
  pricingLoading: boolean;
  error: string | null;
  pricingError: string | null;
  providerAvailabilityLoading: boolean;
  providerAvailabilityError: string | null;
  results: LlmResult[];
  history: HistoryItem[];
  pricingMap: PricingMap;
  pricingSource: PricingSource;
  pricingUpdatedAt: string | null;
  providerAvailabilityUpdatedAt: string | null;
  providerDiagnostics: ProviderDiagnostics;
  providerAvailability: ProviderAvailability;
  runtimeCapabilities: ExecutionRuntimeCapabilities;
  consistencyEnabled: boolean;
  consistencyRuns: number;
  allowUnavailableFallback: boolean;
  batchRuns: LlmResult[][];
  rankingFocus: RankingFocus;
  runProgressPct: number;
  runProgressCompleted: number;
  runProgressTotal: number;
  runLogs: CompareStatusResponse["logs"];
  runStatus: CompareStatusResponse["status"] | null;
  activeRunId: string | null;
  setPrompt: (value: string) => void;
  setSelectedModels: (models: string[]) => void;
  toggleModel: (model: string) => void;
  setMockMode: (enabled: boolean) => void;
  setSortBy: (sort: SortBy) => void;
  setHistory: (history: HistoryItem[]) => void;
  setConsistencyEnabled: (enabled: boolean) => void;
  setConsistencyRuns: (runs: number) => void;
  setAllowUnavailableFallback: (enabled: boolean) => void;
  setRankingFocus: (focus: RankingFocus) => void;
  fetchPricing: (forceRefresh?: boolean) => Promise<void>;
  fetchProviderAvailability: (forceRefresh?: boolean) => Promise<void>;
  runComparison: () => Promise<void>;
  removeResult: (id: string) => void;
  clearResults: () => void;
  rerunFromHistory: (item: HistoryItem) => Promise<void>;
  deleteHistoryItem: (id: string) => void;
  clearHistory: () => void;
};

function sortResults(results: LlmResult[], sortBy: SortBy): LlmResult[] {
  const cloned = [...results];
  if (sortBy === "fastest") {
    return cloned.sort((a, b) => a.latencyMs - b.latencyMs);
  }
  return cloned.sort((a, b) => a.costUsd - b.costUsd);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const useComparatorStore = create<ComparatorStore>((set, get) => ({
  prompt: "",
  selectedModels: defaultModels,
  mockMode: false,
  sortBy: "fastest",
  loading: false,
  pricingLoading: false,
  error: null,
  pricingError: null,
  providerAvailabilityLoading: false,
  providerAvailabilityError: null,
  results: [],
  history: [],
  pricingMap: {},
  pricingSource: "fallback",
  pricingUpdatedAt: null,
  providerAvailabilityUpdatedAt: null,
  providerDiagnostics: emptyProviderDiagnostics,
  consistencyEnabled: false,
  consistencyRuns: 3,
  allowUnavailableFallback: false,
  batchRuns: [],
  rankingFocus: "balanced",
  runProgressPct: 0,
  runProgressCompleted: 0,
  runProgressTotal: 0,
  runLogs: [],
  runStatus: null,
  activeRunId: null,
  providerAvailability: {
    openai: false,
    anthropic: false,
    google: false,
    mistral: false,
    deepseek: false,
    xai: false,
    meta: false,
    codex: false,
    amazon: false,
    minimax: false,
    moonshot: false,
    qwen: false
  },
  runtimeCapabilities: getDefaultExecutionRuntimeCapabilities(),
  setPrompt: (value) => set({ prompt: value }),
  setSelectedModels: (models) => set({ selectedModels: models }),
  toggleModel: (model) => {
    const selected = get().selectedModels;
    if (selected.includes(model)) {
      set({ selectedModels: selected.filter((item) => item !== model), error: null });
      return;
    }
    if (selected.length >= MAX_SELECTED_MODELS) {
      set({ error: `Selecione no máximo ${MAX_SELECTED_MODELS} modelos por execução.` });
      return;
    }
    set({ selectedModels: [...selected, model], error: null });
  },
  setMockMode: (enabled) => set({ mockMode: enabled }),
  setSortBy: (sortBy) => {
    const nextResults = sortResults(get().results, sortBy);
    set({ sortBy, results: nextResults });
    const state = get();
    saveAnalyticsCache({
      results: nextResults,
      batchRuns: state.batchRuns,
      consistencyEnabled: state.consistencyEnabled,
      consistencyRuns: state.consistencyRuns,
      rankingFocus: state.rankingFocus
    });
  },
  setHistory: (history) => set({ history }),
  setConsistencyEnabled: (enabled) => {
    set({ consistencyEnabled: enabled });
    const state = get();
    saveAnalyticsCache({
      results: state.results,
      batchRuns: state.batchRuns,
      consistencyEnabled: enabled,
      consistencyRuns: state.consistencyRuns,
      rankingFocus: state.rankingFocus
    });
  },
  setConsistencyRuns: (runs) => {
    const nextRuns = Math.max(2, Math.min(5, runs));
    set({ consistencyRuns: nextRuns });
    const state = get();
    saveAnalyticsCache({
      results: state.results,
      batchRuns: state.batchRuns,
      consistencyEnabled: state.consistencyEnabled,
      consistencyRuns: nextRuns,
      rankingFocus: state.rankingFocus
    });
  },
  setAllowUnavailableFallback: (enabled) => set({ allowUnavailableFallback: enabled }),
  setRankingFocus: (focus) => {
    set({ rankingFocus: focus });
    const state = get();
    saveAnalyticsCache({
      results: state.results,
      batchRuns: state.batchRuns,
      consistencyEnabled: state.consistencyEnabled,
      consistencyRuns: state.consistencyRuns,
      rankingFocus: focus
    });
  },
  fetchPricing: async (forceRefresh = false) => {
    set({ pricingLoading: true, pricingError: null });
    try {
      const response = await fetch(`/api/pricing?forceRefresh=${forceRefresh ? "true" : "false"}`);
      const body = (await response.json()) as PricingResponse & { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Erro ao carregar pricing");
      }
      set({
        pricingLoading: false,
        pricingMap: body.pricing,
        pricingSource: body.source,
        pricingUpdatedAt: body.updatedAt
      });
    } catch (error) {
      set({
        pricingLoading: false,
        pricingError: error instanceof Error ? error.message : "Erro inesperado ao carregar pricing"
      });
    }
  },
  fetchProviderAvailability: async (forceRefresh = false) => {
    set({ providerAvailabilityLoading: true, providerAvailabilityError: null });
    try {
      const response = await fetch(`/api/provider-availability?forceRefresh=${forceRefresh ? "true" : "false"}`);
      const body = (await response.json()) as ProviderAvailabilityResponse & { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Erro ao carregar disponibilidade de providers");
      }
      set({
        providerAvailabilityLoading: false,
        providerAvailability: body.availability,
        providerDiagnostics: body.diagnostics ?? emptyProviderDiagnostics,
        runtimeCapabilities: body.runtimeCapabilities ?? getDefaultExecutionRuntimeCapabilities(),
        providerAvailabilityUpdatedAt: new Date().toISOString()
      });
    } catch (error) {
      set({
        providerAvailabilityLoading: false,
        providerAvailabilityError: error instanceof Error ? error.message : "Erro inesperado ao carregar providers"
      });
    }
  },
  runComparison: async () => {
    const state = get();
    const executionPlan = buildModelExecutionPlan(
      state.selectedModels,
      state.runtimeCapabilities,
      { allowFallback: state.allowUnavailableFallback }
    );
    const blockedModels = executionPlan
      .filter((item) => !item.executionModel)
      .map((item) => item.requestedModel);
    if (!state.allowUnavailableFallback && blockedModels.length > 0) {
      set({
        error: `Modo estrito ativo (sem fallback). Estes modelos exigem tools externas indisponiveis no runtime: ${blockedModels.join(", ")}.`
      });
      return;
    }
    const executableModels = Array.from(
      new Set(
        executionPlan
      .map((item) => item.executionModel)
          .filter((model): model is string => Boolean(model))
      )
    );
    const allowedModels = state.mockMode
      ? executableModels
      : executableModels.filter((model) => state.providerAvailability[getProviderByModel(model)]);

    if (!state.prompt.trim() || allowedModels.length === 0) {
      set({ error: "Informe prompt e selecione ao menos um modelo suportado." });
      return;
    }

    set({
      loading: true,
      error: null,
      results: [],
      runProgressPct: 0,
      runProgressCompleted: 0,
      runProgressTotal: Math.max(allowedModels.length, 1),
      runLogs: [],
      runStatus: "running",
      activeRunId: null
    });
    try {
      const totalRuns = state.consistencyEnabled ? state.consistencyRuns : 1;
      const collectedRuns: LlmResult[][] = [];
      let lastBody: (CompareStatusResponse & { error?: string }) | null = null;

      for (let runIndex = 0; runIndex < totalRuns; runIndex += 1) {
        const startResponse = await fetch("/api/compare/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: state.prompt,
            selectedModels: allowedModels,
            mockMode: state.mockMode,
            allowFallback: state.allowUnavailableFallback
          })
        });
        const startBody = (await startResponse.json()) as CompareStartResponse & { error?: string };
        if (!startResponse.ok) {
          throw new Error(startBody.error ?? "Erro ao iniciar comparação");
        }
        const { runId } = startBody;
        set({ activeRunId: runId });
        while (true) {
          await sleep(350);
          const statusResponse = await fetch(`/api/compare/status?runId=${runId}`);
          const statusBody = (await statusResponse.json()) as CompareStatusResponse & { error?: string };
          if (!statusResponse.ok) {
            throw new Error(statusBody.error ?? "Erro ao consultar status da execução");
          }
          const absoluteCompleted = runIndex * allowedModels.length + statusBody.completed;
          const absoluteTotal = totalRuns * allowedModels.length;
          set({
            runProgressCompleted: absoluteCompleted,
            runProgressTotal: Math.max(absoluteTotal, 1),
            runProgressPct: Math.round((absoluteCompleted / Math.max(absoluteTotal, 1)) * 100),
            runLogs: statusBody.logs,
            runStatus: statusBody.status
          });
          if (statusBody.status === "failed") {
            throw new Error(statusBody.error ?? "Falha ao executar modelos");
          }
          if (statusBody.status === "completed") {
            if (statusBody.results) {
              collectedRuns.push(statusBody.results);
            }
            lastBody = statusBody;
            break;
          }
        }
      }

      const baseResults = collectedRuns[collectedRuns.length - 1] ?? [];
      const sorted = sortResults(baseResults, get().sortBy);
      const historyItem: HistoryItem = {
        id: crypto.randomUUID(),
        prompt: state.prompt,
        models: [...allowedModels],
        results: sorted,
        timestamp: lastBody?.timestamp ?? new Date().toISOString()
      };
      const nextHistory = [historyItem, ...get().history].slice(0, 20);
      saveHistory(nextHistory);
      saveAnalyticsCache({
        results: sorted,
        batchRuns: collectedRuns,
        consistencyEnabled: state.consistencyEnabled,
        consistencyRuns: state.consistencyRuns,
        rankingFocus: state.rankingFocus
      });
      set({
        results: sorted,
        batchRuns: collectedRuns,
        history: nextHistory,
        loading: false,
        pricingSource: lastBody?.pricingMeta?.source ?? get().pricingSource,
        pricingUpdatedAt: lastBody?.pricingMeta?.updatedAt ?? get().pricingUpdatedAt,
        runProgressPct: 100,
        runProgressCompleted: Math.max(totalRuns * allowedModels.length, 1),
        runProgressTotal: Math.max(totalRuns * allowedModels.length, 1),
        runStatus: "completed",
        activeRunId: null
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Erro inesperado",
        runStatus: "failed",
        activeRunId: null
      });
    }
  },
  removeResult: (id) => {
    const nextResults = get().results.filter(
      (item) => `${item.provider}:${item.model}:${item.requestedModel ?? "direct"}` !== id
    );
    set({ results: nextResults });
    const state = get();
    saveAnalyticsCache({
      results: nextResults,
      batchRuns: state.batchRuns,
      consistencyEnabled: state.consistencyEnabled,
      consistencyRuns: state.consistencyRuns,
      rankingFocus: state.rankingFocus
    });
  },
  clearResults: () => {
    set({ results: [], batchRuns: [] });
    clearAnalyticsCache();
  },
  rerunFromHistory: async (item) => {
    set({ prompt: item.prompt, selectedModels: item.models });
    await get().runComparison();
  },
  deleteHistoryItem: (id) => {
    const next = get().history.filter((item) => item.id !== id);
    saveHistory(next);
    set({ history: next });
  },
  clearHistory: () => {
    saveHistory([]);
    set({ history: [] });
  }
}));

export function hydrateHistoryFromStorage(): void {
  const cachedHistory = loadHistory();
  const cachedAnalytics = loadAnalyticsCache();
  useComparatorStore.setState({
    history: cachedHistory,
    results: cachedAnalytics?.results ?? [],
    batchRuns: cachedAnalytics?.batchRuns ?? [],
    consistencyEnabled: cachedAnalytics?.consistencyEnabled ?? false,
    consistencyRuns: cachedAnalytics?.consistencyRuns ?? 3,
    rankingFocus: cachedAnalytics?.rankingFocus ?? "balanced"
  });
}
