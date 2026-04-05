"use client";

import { buildLineDiff } from "@/features/comparator/domain/diffUtils";
import {
  buildModelExecutionPlan,
  getDefaultExecutionRuntimeCapabilities
} from "@/features/comparator/domain/modelExecutionService";
import { estimateTokens } from "@/features/comparator/domain/tokenUtils";
import { HistoryPanel } from "@/features/comparator/components/HistoryPanel";
import { ResultCard } from "@/features/comparator/components/ResultCard";
import { getProviderByModel, providerModels } from "@/features/comparator/providers/llmProvider";
import { hydrateHistoryFromStorage, useComparatorStore } from "@/features/comparator/store/comparatorStore";
import { AnalyticsPanel } from "@/features/comparator/components/AnalyticsPanel";
import { buildAnalytics } from "@/lib/analytics";
import type { RankingFocus } from "@/lib/analytics/rankModels";
import { CheckButton } from "@/shared/components/checkButton";
import { exportJson } from "@/shared/lib/exportUtils";
import { getMessage } from "@/shared/i18n/messages";
import { useUiPreferencesStore } from "@/shared/store/uiPreferencesStore";
import gsap from "gsap";
import { ChevronLeft, ChevronRight, CircleHelp, Clock3, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

function formatUsdPerMillion(valuePerThousand: number): string {
  return Number((valuePerThousand * 1000).toFixed(4)).toString();
}

const neutralPalette = [
  { border: "#6b7280", background: "rgba(107,114,128,0.18)", badge: "rgba(107,114,128,0.42)", diff: "rgba(107,114,128,0.22)" },
  { border: "#78716c", background: "rgba(120,113,108,0.18)", badge: "rgba(120,113,108,0.42)", diff: "rgba(120,113,108,0.22)" },
  { border: "#64748b", background: "rgba(100,116,139,0.18)", badge: "rgba(100,116,139,0.42)", diff: "rgba(100,116,139,0.22)" },
  { border: "#52525b", background: "rgba(82,82,91,0.18)", badge: "rgba(82,82,91,0.42)", diff: "rgba(82,82,91,0.22)" },
  { border: "#4b5563", background: "rgba(75,85,99,0.18)", badge: "rgba(75,85,99,0.42)", diff: "rgba(75,85,99,0.22)" },
  { border: "#57534e", background: "rgba(87,83,78,0.18)", badge: "rgba(87,83,78,0.42)", diff: "rgba(87,83,78,0.22)" }
] as const;

function modelIndex(model: string): number {
  let hash = 0;
  for (let i = 0; i < model.length; i += 1) {
    hash = (hash * 31 + model.charCodeAt(i)) % 2147483647;
  }
  return Math.abs(hash) % neutralPalette.length;
}

function modelPalette(model: string) {
  return neutralPalette[modelIndex(model)];
}

const providerIconSlug: Record<keyof typeof providerModels, string> = {
  openai: "openai",
  anthropic: "anthropic",
  google: "google",
  mistral: "mistralai",
  deepseek: "deepseek",
  xai: "x",
  meta: "meta",
  codex: "openai",
  amazon: "amazon",
  minimax: "mini",
  moonshot: "moonrepo",
  qwen: "alibabacloud"
};

const providerIconDomain: Partial<Record<keyof typeof providerModels, string>> = {
  openai: "openai.com",
  deepseek: "deepseek.com",
  codex: "openai.com"
};

function providerMonogram(provider: keyof typeof providerModels): string {
  if (provider === "openai") return "OA";
  if (provider === "deepseek") return "DS";
  if (provider === "codex") return "CX";
  return provider.slice(0, 2).toUpperCase();
}

const providerLockMessageKey: Record<
  keyof typeof providerModels,
  | "providerLockedDescriptionOpenAi"
  | "providerLockedDescriptionAnthropic"
  | "providerLockedDescriptionGoogle"
  | "providerLockedDescriptionMistral"
  | "providerLockedDescriptionDeepseek"
  | "providerLockedDescriptionXai"
  | "providerLockedDescriptionMeta"
  | "providerLockedDescriptionCodex"
  | "providerLockedDescriptionAmazon"
  | "providerLockedDescriptionMinimax"
  | "providerLockedDescriptionMoonshot"
  | "providerLockedDescriptionQwen"
> = {
  openai: "providerLockedDescriptionOpenAi",
  anthropic: "providerLockedDescriptionAnthropic",
  google: "providerLockedDescriptionGoogle",
  mistral: "providerLockedDescriptionMistral",
  deepseek: "providerLockedDescriptionDeepseek",
  xai: "providerLockedDescriptionXai",
  meta: "providerLockedDescriptionMeta",
  codex: "providerLockedDescriptionCodex",
  amazon: "providerLockedDescriptionAmazon",
  minimax: "providerLockedDescriptionMinimax",
  moonshot: "providerLockedDescriptionMoonshot",
  qwen: "providerLockedDescriptionQwen"
};

export function ComparatorPanel() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [useAnalyticsSort, setUseAnalyticsSort] = useState(false);
  const [hoveredProvider, setHoveredProvider] = useState<keyof typeof providerModels | null>(null);
  const [pinnedProvider, setPinnedProvider] = useState<keyof typeof providerModels | null>(null);
  const [providerIconLoaded, setProviderIconLoaded] = useState<Partial<Record<keyof typeof providerModels, boolean>>>({});
  const locale = useUiPreferencesStore((state) => state.locale);
  const prompt = useComparatorStore((state) => state.prompt);
  const selectedModels = useComparatorStore((state) => state.selectedModels);
  const mockMode = useComparatorStore((state) => state.mockMode);
  const sortBy = useComparatorStore((state) => state.sortBy);
  const loading = useComparatorStore((state) => state.loading);
  const pricingLoading = useComparatorStore((state) => state.pricingLoading);
  const providerAvailabilityLoading = useComparatorStore((state) => state.providerAvailabilityLoading);
  const error = useComparatorStore((state) => state.error);
  const pricingError = useComparatorStore((state) => state.pricingError);
  const providerAvailabilityError = useComparatorStore((state) => state.providerAvailabilityError);
  const results = useComparatorStore((state) => state.results);
  const history = useComparatorStore((state) => state.history);
  const consistencyEnabled = useComparatorStore((state) => state.consistencyEnabled);
  const consistencyRuns = useComparatorStore((state) => state.consistencyRuns);
  const batchRuns = useComparatorStore((state) => state.batchRuns);
  const rankingFocus = useComparatorStore((state) => state.rankingFocus);
  const allowUnavailableFallback = useComparatorStore((state) => state.allowUnavailableFallback);
  const pricingMap = useComparatorStore((state) => state.pricingMap);
  const pricingSource = useComparatorStore((state) => state.pricingSource);
  const pricingUpdatedAt = useComparatorStore((state) => state.pricingUpdatedAt);
  const providerAvailabilityUpdatedAt = useComparatorStore((state) => state.providerAvailabilityUpdatedAt);
  const providerDiagnostics = useComparatorStore((state) => state.providerDiagnostics);
  const providerAvailability = useComparatorStore((state) => state.providerAvailability);
  const runtimeCapabilities = useComparatorStore((state) => state.runtimeCapabilities);
  const runProgressPct = useComparatorStore((state) => state.runProgressPct);
  const runProgressCompleted = useComparatorStore((state) => state.runProgressCompleted);
  const runProgressTotal = useComparatorStore((state) => state.runProgressTotal);
  const runLogs = useComparatorStore((state) => state.runLogs);
  const activeRunId = useComparatorStore((state) => state.activeRunId);
  const setPrompt = useComparatorStore((state) => state.setPrompt);
  const setSelectedModels = useComparatorStore((state) => state.setSelectedModels);
  const toggleModel = useComparatorStore((state) => state.toggleModel);
  const setMockMode = useComparatorStore((state) => state.setMockMode);
  const setSortBy = useComparatorStore((state) => state.setSortBy);
  const fetchPricing = useComparatorStore((state) => state.fetchPricing);
  const fetchProviderAvailability = useComparatorStore((state) => state.fetchProviderAvailability);
  const runComparison = useComparatorStore((state) => state.runComparison);
  const removeResult = useComparatorStore((state) => state.removeResult);
  const clearResults = useComparatorStore((state) => state.clearResults);
  const setConsistencyEnabled = useComparatorStore((state) => state.setConsistencyEnabled);
  const setConsistencyRuns = useComparatorStore((state) => state.setConsistencyRuns);
  const setRankingFocus = useComparatorStore((state) => state.setRankingFocus);
  const [showLiveLogs, setShowLiveLogs] = useState(true);

  useEffect(() => {
    hydrateHistoryFromStorage();
    fetchPricing();
    fetchProviderAvailability();
  }, [fetchPricing, fetchProviderAvailability]);

  useEffect(() => {
    if (mockMode) return;
    const allowed = selectedModels.filter((model) => providerAvailability[getProviderByModel(model)]);
    if (allowed.length !== selectedModels.length) {
      setSelectedModels(allowed);
    }
  }, [mockMode, providerAvailability, selectedModels, setSelectedModels]);

  const modelsByProvider = useMemo(() => {
    const order: Array<keyof typeof providerModels> = [
      "openai",
      "anthropic",
      "google",
      "mistral",
      "deepseek",
      "xai",
      "meta",
      "codex",
      "amazon",
      "minimax",
      "moonshot",
      "qwen"
    ];
    const grouped = order.reduce((acc, provider) => {
      acc[provider] = new Set<string>(providerModels[provider]);
      return acc;
    }, {} as Record<keyof typeof providerModels, Set<string>>);
    Object.keys(pricingMap).forEach((model) => grouped[getProviderByModel(model)].add(model));
    return order.reduce((acc, provider) => {
      acc[provider] = Array.from(grouped[provider]).sort((a, b) => a.localeCompare(b));
      return acc;
    }, {} as Record<keyof typeof providerModels, string[]>);
  }, [pricingMap]);

  const analytics = useMemo(
    () => buildAnalytics(results, batchRuns, history, consistencyEnabled, rankingFocus),
    [results, batchRuns, history, consistencyEnabled, rankingFocus]
  );
  const displayedResults = useMemo(() => {
    if (!useAnalyticsSort || analytics.models.length === 0) return results;
    const byModel = new Map(results.map((item) => [item.model, item]));
    return analytics.models.map((item) => byModel.get(item.model)).filter((item): item is (typeof results)[number] => Boolean(item));
  }, [analytics.models, results, useAnalyticsSort]);
  const diffLines = useMemo(() => {
    if (displayedResults.length < 2) return [];
    return buildLineDiff(displayedResults[0].responseText, displayedResults[1].responseText).slice(0, 40);
  }, [displayedResults]);
  const firstModelPalette = displayedResults[0] ? modelPalette(displayedResults[0].model) : neutralPalette[0];
  const secondModelPalette = displayedResults[1] ? modelPalette(displayedResults[1].model) : neutralPalette[1];
  const providersWithSelectedModels = useMemo(() => {
    return new Set(selectedModels.map((model) => getProviderByModel(model)));
  }, [selectedModels]);
  const executionPlanByModel = useMemo(() => {
    const models = Object.values(modelsByProvider).flat();
    const plan = buildModelExecutionPlan(models, runtimeCapabilities ?? getDefaultExecutionRuntimeCapabilities(), {
      allowFallback: allowUnavailableFallback
    });
    return new Map(plan.map((item) => [item.requestedModel, item]));
  }, [allowUnavailableFallback, modelsByProvider, runtimeCapabilities]);
  const isProviderOpen = (provider: keyof typeof providerModels): boolean =>
    providersWithSelectedModels.has(provider) || pinnedProvider === provider || hoveredProvider === provider;
  const providerStatusBadge = (provider: keyof typeof providerModels) => {
    const status = providerDiagnostics[provider]?.status ?? "missingKey";
    if (status === "ok") {
      return {
        label: getMessage(locale, "providerStatusOk"),
        className: "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
      };
    }
    if (status === "unreachable") {
      return {
        label: getMessage(locale, "providerStatusUnreachable"),
        className: "border-rose-500/50 bg-rose-500/10 text-rose-300"
      };
    }
    return {
      label: getMessage(locale, "providerStatusMissingKey"),
      className: "border-amber-500/50 bg-amber-500/10 text-amber-300"
    };
  };

  useEffect(() => {
    if (!rootRef.current) {
      return;
    }
    const ctx = gsap.context(() => {
      const sections = gsap.utils.toArray<HTMLElement>(".cmp-section");
      if (sections.length === 0) {
        return;
      }
      gsap.fromTo(sections, { opacity: 0 }, { opacity: 1, duration: 0.35, stagger: 0.08, ease: "power2.out", clearProps: "opacity" });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!rootRef.current) {
      return;
    }
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>(".result-item");
      if (cards.length === 0) {
        return;
      }
      gsap.fromTo(cards, { opacity: 0.4 }, { opacity: 1, duration: 0.25, stagger: 0.04, ease: "power2.out", clearProps: "opacity" });
    }, rootRef);
    return () => ctx.revert();
  }, [results]);

  return (
    <div ref={rootRef} className="grid gap-6 xl:grid-cols-2">
      <div className="space-y-6">
        <section className="cmp-section relative z-50 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 shadow-sm backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-100">{getMessage(locale, "prompt")}</h2>
            <CheckButton id="mock-mode-toggle" checked={mockMode} onCheckedChange={setMockMode} label={getMessage(locale, "mockMode")} compact />
          </div>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={getMessage(locale, "promptPlaceholder")}
            className="h-44 w-full rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-100 outline-none transition focus:border-emerald-500/60"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-zinc-400">{getMessage(locale, "tokenEstimate")}: {estimateTokens(prompt)}</p>
            <button type="button" onClick={() => runComparison()} disabled={loading} className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:-translate-y-0.5 hover:bg-emerald-400 disabled:opacity-50">
              {loading ? getMessage(locale, "running") : getMessage(locale, "runComparison")}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-xs">
            <div className="group relative z-[1200] inline-flex items-center gap-2">
              <CheckButton
                id="consistency-check-toggle"
                checked={consistencyEnabled}
                onCheckedChange={setConsistencyEnabled}
                label={getMessage(locale, "consistencyCheck")}
                compact
              />
              <span
                role="img"
                aria-label={getMessage(locale, "consistencyInfoLabel")}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-300"
              >
                <CircleHelp className="h-3 w-3" />
              </span>
              <div className="pointer-events-none absolute left-0 top-full z-[1300] mt-2 w-80 rounded-md border border-emerald-400/70 bg-zinc-950 px-3 py-2 text-[12px] leading-relaxed text-zinc-100 opacity-0 shadow-2xl ring-1 ring-emerald-500/30 transition group-hover:opacity-100">
                {getMessage(locale, "consistencyInfoTooltip")}
              </div>
            </div>
            <label className="flex items-center gap-2">
              {getMessage(locale, "repetitions")}:
              <select
                value={consistencyRuns}
                disabled={!consistencyEnabled}
                onChange={(event) => setConsistencyRuns(Number(event.target.value))}
                className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs"
              >
                <option value={2}>2x</option>
                <option value={3}>3x</option>
                <option value={4}>4x</option>
                <option value={5}>5x</option>
              </select>
            </label>
          </div>
        </section>

        <section className="cmp-section relative z-10 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 shadow-sm backdrop-blur">
          <h2 className="mb-3 text-sm font-semibold text-zinc-100">{getMessage(locale, "modelSelection")}</h2>
          <div className="mb-3 rounded-md border border-zinc-800 bg-zinc-950 p-2 text-xs">
            {pricingLoading && <p>{getMessage(locale, "pricingLoading")}</p>}
            {!pricingLoading && (
              <div className="flex flex-wrap items-center gap-2">
                <p>{getMessage(locale, "pricingSource")}: {pricingSource} {pricingUpdatedAt ? `• ${getMessage(locale, "updated")}: ${new Date(pricingUpdatedAt).toLocaleString()}` : ""}</p>
                {pricingSource === "live" && <span className="rounded-full border border-emerald-500/60 bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">REAL-TIME</span>}
                <button type="button" onClick={() => fetchPricing(true)} disabled={pricingLoading} className="rounded-md border border-zinc-700 px-2 py-0.5 text-[10px] font-semibold transition hover:border-emerald-500/60">Atualizar agora</button>
                <button
                  type="button"
                  onClick={() => fetchProviderAvailability(true)}
                  disabled={providerAvailabilityLoading}
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-0.5 text-[10px] font-semibold transition hover:border-emerald-500/60 disabled:opacity-60"
                >
                  <RefreshCw className={`h-3 w-3 ${providerAvailabilityLoading ? "animate-spin" : ""}`} />
                  {getMessage(locale, "revalidateProviders")}
                </button>
              </div>
            )}
            {pricingError && <p className="mt-1 text-red-500">{pricingError}</p>}
            {providerAvailabilityLoading && <p className="mt-1">{getMessage(locale, "loadingProviders")}</p>}
            {providerAvailabilityError && <p className="mt-1 text-red-500">{providerAvailabilityError}</p>}
            {providerAvailabilityUpdatedAt && !providerAvailabilityLoading && (
              <p className="mt-1 text-[10px] text-zinc-400">
                {getMessage(locale, "providersValidatedAt")}: {new Date(providerAvailabilityUpdatedAt).toLocaleTimeString()}
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {(Object.keys(modelsByProvider) as Array<keyof typeof providerModels>)
              .filter((provider) => modelsByProvider[provider].length > 0)
              .map((provider) => (
                <div
                  key={provider}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isProviderOpen(provider)}
                  onMouseEnter={() => setHoveredProvider(provider)}
                  onMouseLeave={() => setHoveredProvider((value) => (value === provider ? null : value))}
                  onFocusCapture={() => setHoveredProvider(provider)}
                  onBlurCapture={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                      setHoveredProvider((value) => (value === provider ? null : value));
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setPinnedProvider((value) => (value === provider ? null : provider));
                    }
                  }}
                  className={`rounded-2xl border p-4 transition ${
                    !mockMode && !providerAvailability[provider]
                      ? "border-amber-400/80 bg-amber-50/70 dark:border-amber-500/70 dark:bg-amber-950/20"
                      : isProviderOpen(provider)
                        ? "border-emerald-500/70 bg-emerald-50/30 shadow-sm dark:border-emerald-500/50 dark:bg-emerald-950/10"
                        : "border-zinc-700 hover:border-emerald-400/60 hover:bg-zinc-900/80"
                  }`}
                >
                  <div className="mb-3 flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-4 text-center">
                    <span className="relative inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800/10 shadow-sm dark:bg-zinc-100/10">
                      {!providerIconLoaded[provider] && (
                        <span className="text-sm font-semibold text-zinc-200">{providerMonogram(provider)}</span>
                      )}
                      <img
                        src={
                          providerIconDomain[provider]
                            ? `https://icon.horse/icon/${providerIconDomain[provider]}`
                            : `https://cdn.simpleicons.org/${providerIconSlug[provider]}/9ca3af`
                        }
                        alt={`${provider} logo`}
                        className="absolute inset-0 h-14 w-14 rounded-2xl p-2"
                        onLoad={() => {
                          setProviderIconLoaded((state) => ({ ...state, [provider]: true }));
                        }}
                        onError={(event) => {
                          const img = event.currentTarget;
                          const domain = providerIconDomain[provider];
                          if (domain && !img.dataset.fallbackLoaded) {
                            img.dataset.fallbackLoaded = "true";
                            img.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
                            return;
                          }
                          setProviderIconLoaded((state) => ({ ...state, [provider]: false }));
                          img.style.display = "none";
                        }}
                      />
                    </span>
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-200">{provider}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${providerStatusBadge(provider).className}`}>
                      {providerStatusBadge(provider).label}
                    </span>
                    {pinnedProvider === provider && (
                      <span className="rounded-full border border-emerald-500/50 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                        {getMessage(locale, "pinnedState")}
                      </span>
                    )}
                  </div>

                  <div className={`overflow-hidden transition-all duration-300 ${isProviderOpen(provider) ? "max-h-72 opacity-100" : "max-h-0 opacity-0"}`}>
                    <div className={`max-h-72 space-y-2 overflow-y-auto pr-1 ${!mockMode && !providerAvailability[provider] ? "opacity-60" : ""}`}>
                      {!mockMode && !providerAvailability[provider] && (
                        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-700 dark:text-amber-300">
                          {getMessage(locale, "providerLockedTitle")}: {getMessage(locale, providerLockMessageKey[provider])}
                        </p>
                      )}
                      {modelsByProvider[provider].map((model) => {
                        const id = `${provider}-${model}`.replace(/[^a-zA-Z0-9-_]/g, "-");
                        const planItem = executionPlanByModel.get(model);
                        const supportedModel = Boolean(planItem?.executionModel);
                        const fallbackModel = planItem?.usesFallback ? planItem.executionModel : null;
                        return (
                          <div key={model} className="group flex items-center justify-between gap-2 rounded-md border border-zinc-800 px-2 py-1.5 text-sm transition hover:bg-emerald-950/20">
                            <span className="flex items-center gap-2">
                              <CheckButton
                                id={id}
                                checked={selectedModels.includes(model)}
                                disabled={(!mockMode && !providerAvailability[provider]) || !supportedModel}
                                onCheckedChange={() => toggleModel(model)}
                                label={model}
                                compact
                              />
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {!supportedModel
                                ? getMessage(locale, "unsupportedModelRequiresTools")
                                : fallbackModel
                                  ? `${getMessage(locale, "fallbackExecution")}: ${fallbackModel}`
                                : pricingMap[model]
                                  ? `$${formatUsdPerMillion(pricingMap[model].input)}/1M in • $${formatUsdPerMillion(pricingMap[model].output)}/1M out`
                                  : getMessage(locale, "noPrice")}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-zinc-800 px-2 py-1 text-xs text-zinc-300">
              Selecionados: {selectedModels.length}/5
            </span>
            <button type="button" onClick={() => setSortBy("fastest")} className={`rounded-md border px-3 py-2 text-sm transition ${sortBy === "fastest" ? "border-emerald-500 text-emerald-300" : "border-zinc-700 text-zinc-200 hover:border-zinc-500"}`}>{getMessage(locale, "fastest")}</button>
            <button type="button" onClick={() => setSortBy("cheapest")} className={`rounded-md border px-3 py-2 text-sm transition ${sortBy === "cheapest" ? "border-emerald-500 text-emerald-300" : "border-zinc-700 text-zinc-200 hover:border-zinc-500"}`}>{getMessage(locale, "cheapest")}</button>
            <button type="button" onClick={() => exportJson(`comparison-${Date.now()}.json`, { prompt, selectedModels, mockMode, results })} className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 transition hover:border-zinc-500">{getMessage(locale, "exportJson")}</button>
            <CheckButton
              id="analytics-sort-toggle"
              checked={useAnalyticsSort}
              onCheckedChange={setUseAnalyticsSort}
              label={getMessage(locale, "useAnalyticsSort")}
              compact
              className="rounded border border-zinc-700 px-2 py-1"
            />
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-zinc-400">{getMessage(locale, "rankingMode")}:</span>
              <select
                value={rankingFocus}
                onChange={(event) => setRankingFocus(event.target.value as RankingFocus)}
                className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
              >
                <option value="balanced">{getMessage(locale, "rankingBalanced")}</option>
                <option value="costBenefit">{getMessage(locale, "rankingCostBenefit")}</option>
                <option value="speed">{getMessage(locale, "rankingSpeed")}</option>
              </select>
            </div>
          </div>
          {error && <p className="mt-3 rounded-lg bg-red-950/60 p-3 text-sm text-red-300">{error}</p>}
        </section>
      </div>

      <div className="cmp-section relative min-h-[70vh]">
        <section
          className={`min-w-0 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 shadow-sm backdrop-blur transition-all ${
            isHistoryOpen ? "pr-[22.5rem] 2xl:pr-[26.5rem]" : "pr-6"
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-100">Resultados</h2>
            <button type="button" onClick={clearResults} className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-200 transition hover:border-zinc-500">Limpar resultados</button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {displayedResults.map((result, index) => (
              <div key={`${result.provider}-${result.model}-${result.requestedModel ?? "direct"}-${index}`} className="result-item">
                <ResultCard
                  result={result}
                  accent={modelPalette(result.model)}
                  highlightBest={result.model === displayedResults[0]?.model}
                  highlightBestOverall={result.model === analytics.models[0]?.model}
                  onDelete={() => removeResult(`${result.provider}:${result.model}:${result.requestedModel ?? "direct"}`)}
                />
              </div>
            ))}
          </div>
          {loading && (
            <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/70 p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-zinc-200">{getMessage(locale, "running")}</p>
                <span className="text-xs text-zinc-400">
                  {runProgressCompleted}/{Math.max(runProgressTotal, 1)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${Math.max(2, runProgressPct)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-zinc-400">
                {getMessage(locale, "liveProgressLabel")}: {runProgressPct}%
              </p>
              <button
                type="button"
                className="mt-2 text-xs text-emerald-300 underline underline-offset-2 transition hover:text-emerald-200"
                onClick={() => setShowLiveLogs((value) => !value)}
              >
                {showLiveLogs ? getMessage(locale, "hideApiLogs") : getMessage(locale, "showApiLogs")}
              </button>
              {activeRunId && (
                <div className="mt-1">
                  <a
                    href={`/api/compare/status?runId=${activeRunId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-zinc-400 underline underline-offset-2 transition hover:text-zinc-300"
                  >
                    endpoint: /api/compare/status?runId={activeRunId}
                  </a>
                </div>
              )}
              {showLiveLogs && (
                <div className="mt-2 max-h-48 overflow-auto rounded-md border border-zinc-800 bg-zinc-950 p-2 font-mono text-[11px] text-zinc-300">
                  {runLogs.length === 0 && <p className="text-zinc-500">{getMessage(locale, "waitingEvents")}</p>}
                  {runLogs.map((log) => (
                    <p key={log.id} className={log.level === "error" ? "text-rose-300" : log.level === "success" ? "text-emerald-300" : "text-zinc-300"}>
                      [{new Date(log.timestamp).toLocaleTimeString()}] {log.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
          {!loading && results.length === 0 && <p className="text-sm text-zinc-400">{getMessage(locale, "noResults")}</p>}
          {diffLines.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-semibold text-zinc-100">{getMessage(locale, "diffTop2")}</h3>
              <div className="mb-2 flex flex-wrap gap-2 text-[11px]">
                <span className="rounded px-2 py-0.5" style={{ backgroundColor: firstModelPalette.diff }}>
                  - {displayedResults[0]?.model}
                </span>
                <span className="rounded px-2 py-0.5" style={{ backgroundColor: secondModelPalette.diff }}>
                  + {displayedResults[1]?.model}
                </span>
              </div>
              <div className="max-h-72 overflow-auto rounded-md bg-zinc-950 p-3 font-mono text-xs text-zinc-300">
                {diffLines.map((line, index) => {
                  const isMinus = line.startsWith("- ");
                  const isPlus = line.startsWith("+ ");
                  const backgroundColor = isMinus
                    ? firstModelPalette.diff
                    : isPlus
                      ? secondModelPalette.diff
                      : "transparent";
                  return (
                    <div key={`${index}-${line}`} style={{ backgroundColor }} className="rounded px-1 py-0.5">
                      {line}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <AnalyticsPanel analytics={analytics} />
        </section>
        <aside
          className={`fixed right-0 top-0 rounded-xl border border-zinc-800 bg-zinc-950/85 shadow-sm transition-all ${
            isHistoryOpen
              ? "z-30 h-screen w-[22rem] overflow-visible rounded-none border-r-0 p-0 2xl:w-[26rem]"
              : "z-30 h-screen w-5 overflow-visible rounded-none border-r-0 border-y-0 border-l-0 bg-transparent p-0 shadow-none"
          }`}
        >
          <button
            type="button"
            onClick={() => setIsHistoryOpen((value) => !value)}
            className={`absolute z-50 inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-300 shadow-sm transition hover:border-emerald-400/70 hover:text-emerald-300 ${
              isHistoryOpen ? "-left-6 top-6" : "-left-10 top-6"
            }`}
          >
            {isHistoryOpen ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
            <Clock3 className="h-3.5 w-3.5" />
          </button>
          <div className={`${isHistoryOpen ? "h-screen overflow-y-auto opacity-100" : "pointer-events-none opacity-0"} transition`}>
            <HistoryPanel />
          </div>
        </aside>
      </div>
    </div>
  );
}
