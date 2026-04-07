"use client";

import { AnalyticsBundle, ModelAnalytics } from "@/lib/analytics";
import { getMessage } from "@/shared/i18n/messages";
import { useUiPreferencesStore } from "@/shared/store/uiPreferencesStore";
import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type AnalyticsPanelProps = {
  analytics: AnalyticsBundle;
};

type StableChartProps = {
  className: string;
  children: (size: { width: number; height: number }) => React.ReactNode;
};

function StableChart({ className, children }: StableChartProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      const nextWidth = Math.max(0, Math.floor(element.clientWidth));
      const nextHeight = Math.max(0, Math.floor(element.clientHeight));
      setSize((current) => {
        if (current.width === nextWidth && current.height === nextHeight) return current;
        return { width: nextWidth, height: nextHeight };
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {size.width > 0 && size.height > 0 ? children(size) : null}
    </div>
  );
}

function metricTone(value: number, thresholds: [number, number], inverse = false): string {
  if (inverse) {
    if (value <= thresholds[0]) return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300";
    if (value <= thresholds[1]) return "bg-amber-500/20 text-amber-700 dark:text-amber-300";
    return "bg-rose-500/20 text-rose-700 dark:text-rose-300";
  }
  if (value >= thresholds[1]) return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300";
  if (value >= thresholds[0]) return "bg-amber-500/20 text-amber-700 dark:text-amber-300";
  return "bg-rose-500/20 text-rose-700 dark:text-rose-300";
}

function scoreColor(model: ModelAnalytics): string {
  if (model.rankingScore >= 7) return "#16a34a";
  if (model.rankingScore >= 4.8) return "#eab308";
  return "#ef4444";
}

export function AnalyticsPanel({ analytics }: AnalyticsPanelProps) {
  const locale = useUiPreferencesStore((state) => state.locale);
  const currency = useUiPreferencesStore((state) => state.currency);
  const exchangeRateUsdToBrl = useUiPreferencesStore((state) => state.exchangeRateUsdToBrl);
  const [activeChartModel, setActiveChartModel] = useState<string | null>(null);
  if (analytics.models.length === 0) return null;

  const currencyMultiplier = currency === "BRL" ? exchangeRateUsdToBrl : 1;
  const currencySymbol = currency === "BRL" ? "R$" : "$";
  const currencyFormatter = new Intl.NumberFormat(locale === "pt-BR" ? "pt-BR" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  });
  const formatCurrencySmart = (value: number): string => {
    if (value === 0) return currencyFormatter.format(0);
    if (Math.abs(value) < 0.01) return `${currencySymbol}${value.toExponential(2)}`;
    return currencyFormatter.format(value);
  };
  const costLabel = locale === "pt-BR" ? "Custo" : "Cost";

  const chartPalette = ["#14b8a6", "#3b82f6", "#a855f7", "#f97316", "#22c55e", "#ef4444", "#eab308", "#06b6d4"];
  const modelColorMap = new Map(analytics.models.map((model, index) => [model.model, chartPalette[index % chartPalette.length]]));

  const costLatencyData = analytics.models.map((model) => ({
    model: model.model,
    cost: Number((model.raw.costUsd * currencyMultiplier).toFixed(8)),
    latency: model.totalLatencyMs,
    color: modelColorMap.get(model.model) ?? "#64748b"
  }));
  const costPerQualityData = analytics.models.map((model) => ({
    model: model.model,
    costPerQuality: Number.isFinite(model.costPerQuality) ? model.costPerQuality * currencyMultiplier : 0,
    color: modelColorMap.get(model.model) ?? "#64748b"
  }));
  const latencyData = analytics.models.map((model) => ({ model: model.model, latency: model.totalLatencyMs, ttft: model.ttftMs }));
  const trendData = analytics.trends.slice(0, 12);
  const radarData = analytics.models.map((model) => ({
    model: model.model,
    quality: model.qualityScore,
    efficiency: Number((10 / Math.max(model.costPerQuality * 1000, 1)).toFixed(2)),
    speed: Number((10 / Math.max(model.totalLatencyMs / 800, 1)).toFixed(2))
  }));
  const bestOverall = analytics.models[0];
  const bestCostBenefit =
    analytics.models.find((model) => model.badges.includes("Best cost-benefit")) ??
    [...analytics.models].sort((a, b) => a.costPerQuality - b.costPerQuality)[0];
  const fastestModel = [...analytics.models].sort((a, b) => a.totalLatencyMs - b.totalLatencyMs)[0];
  const mostConsistentModel = analytics.models
    .filter((model) => model.consistencyScore !== null)
    .sort((a, b) => (b.consistencyScore ?? 0) - (a.consistencyScore ?? 0))[0];
  const suggestedFallback = analytics.fallbacks.find((item) => item.model === bestOverall.model) ?? analytics.fallbacks[0];
  const highDivergences = analytics.similarities.filter((edge) => edge.divergent).length;
  const avgSimilarity = analytics.similarities.length
    ? Number(
        (
          analytics.similarities.reduce((acc, edge) => acc + edge.similarityPct, 0) /
          Math.max(analytics.similarities.length, 1)
        ).toFixed(1)
      )
    : 0;

  const badgeLabel = (badge: string): string => {
    if (badge === "Best cost-benefit") return getMessage(locale, "bestCostBenefit");
    if (badge === "Fastest") return getMessage(locale, "fastestBadge");
    if (badge === "Most consistent") return getMessage(locale, "mostConsistent");
    return badge;
  };

  const isModelActive = (model: string): boolean => activeChartModel === null || activeChartModel === model;
  const getModelFill = (model: string, fallback: string): string => {
    if (isModelActive(model)) return fallback;
    return "rgba(100,116,139,0.32)";
  };
  const toggleActiveModel = (model: string): void => {
    setActiveChartModel((prev) => (prev === model ? null : model));
  };

  return (
    <section className="mt-6 space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-zinc-100">{getMessage(locale, "analyticsPanelTitle")}</h3>
        <p className="text-sm text-zinc-400">{getMessage(locale, "analyticsPanelSubtitle")}</p>
      </div>

      <section className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-base font-semibold text-zinc-100">{getMessage(locale, "analyticsSummaryTitle")}</h4>
          <span className="text-sm text-zinc-400">{getMessage(locale, "analyticsSummaryHint")}</span>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-2 text-sm">
          <div className="rounded bg-zinc-500/10 px-2 py-1.5 text-zinc-300">
            {getMessage(locale, "analyticsSummaryBestModel")}: <strong>{bestOverall.model}</strong>
          </div>
          <div className="rounded bg-zinc-500/10 px-2 py-1.5 text-zinc-300">
            {getMessage(locale, "analyticsSummaryBestCostBenefit")}: <strong>{bestCostBenefit?.model ?? "-"}</strong>
          </div>
          <div className="rounded bg-zinc-500/10 px-2 py-1.5 text-zinc-300">
            {getMessage(locale, "analyticsSummaryFastest")}: <strong>{fastestModel.model}</strong>
          </div>
          <div className="rounded bg-zinc-500/10 px-2 py-1.5 text-zinc-300">
            {getMessage(locale, "analyticsSummaryMostConsistent")}: <strong>{mostConsistentModel?.model ?? "-"}</strong>
          </div>
          <div className="rounded bg-zinc-500/10 px-2 py-1.5 text-zinc-300">
            {getMessage(locale, "analyticsSummaryTopFallback")}: <strong>{suggestedFallback ? `${suggestedFallback.model} -> ${suggestedFallback.fallbackModel}` : "-"}</strong>
          </div>
          <div className="rounded bg-zinc-500/10 px-2 py-1.5 text-zinc-300">
            {getMessage(locale, "analyticsSummaryDivergence")}: <strong>{highDivergences}</strong> • {getMessage(locale, "analyticsSummaryAvgSimilarity")}: <strong>{avgSimilarity}%</strong>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] gap-4">
        {analytics.models.map((model, index) => (
          <article key={`${model.provider}-${model.model}-${index}`} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p className="text-base font-semibold text-zinc-100">
                  #{index + 1} {model.model}
                </p>
                <p className="text-sm uppercase tracking-wide text-zinc-500">{model.provider}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="rounded-full px-2 py-1 text-xs font-semibold" style={{ backgroundColor: `${scoreColor(model)}22`, color: scoreColor(model) }}>
                  {getMessage(locale, "ranking")} {model.rankingScore}
                </span>
                {index === 0 && (
                  <span className="rounded-full border border-emerald-500/50 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    {getMessage(locale, "bestOverall")}
                  </span>
                )}
              </div>
            </div>
            {(() => {
              const baseCostPer1000RunsUsd = model.raw.costUsd * 1000;
              const costPer1000Runs = currency === "BRL" ? baseCostPer1000RunsUsd * exchangeRateUsdToBrl : baseCostPer1000RunsUsd;
              const formattedCostPer1000Runs = new Intl.NumberFormat(locale === "pt-BR" ? "pt-BR" : "en-US", {
                style: "currency",
                currency,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              }).format(costPer1000Runs);
              return (
                <div className="mb-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-emerald-300">{getMessage(locale, "costPer1000Runs")}</p>
                  <p className="text-lg font-semibold text-emerald-200">{formattedCostPer1000Runs}</p>
                </div>
              );
            })()}

            <div className="mb-3 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
              <p className="text-sm text-zinc-400">{getMessage(locale, "analyticsSummaryBestModel")}</p>
              <p className="text-lg font-semibold text-zinc-100">
                {model.qualityScore}/10
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <div className={`rounded-md px-2 py-1.5 ${metricTone(model.qualityScore, [4, 7])}`}>{getMessage(locale, "quality")}: {model.qualityScore}</div>
              <div className={`rounded-md px-2 py-1.5 ${metricTone(model.costPerQuality, [0.0003, 0.0014], true)}`}>
                {getMessage(locale, "costPerQuality")}:{" "}
                {Number.isFinite(model.costPerQuality)
                  ? `${formatCurrencySmart(model.costPerQuality * currencyMultiplier)} / ponto`
                  : "inf"}
              </div>
              <div className={`rounded-md px-2 py-1.5 ${metricTone(model.totalLatencyMs, [1200, 2600], true)}`}>
                {getMessage(locale, "latency")}: {model.totalLatencyMs}ms • {getMessage(locale, "ttft")}: {model.ttftMs}ms
              </div>
              <div className="rounded-md bg-zinc-500/15 px-2 py-1.5 text-zinc-300">
                {getMessage(locale, "type")}: {model.classification}
              </div>
              <div className={`rounded-md px-2 py-1.5 ${metricTone(model.verbosityScore, [3.2, 6.8])}`}>
                {getMessage(locale, "usefulVerbosity")}: {model.verbosityScore}
              </div>
              <div className={`rounded-md px-2 py-1.5 ${metricTone(model.costPerToken, [0.000001, 0.000004], true)}`}>
                {getMessage(locale, "costPerToken")}:{" "}
                {new Intl.NumberFormat(locale === "pt-BR" ? "pt-BR" : "en-US", {
                  style: "currency",
                  currency,
                  minimumFractionDigits: 4,
                  maximumFractionDigits: 6
                }).format((currency === "BRL" ? model.costPerToken * exchangeRateUsdToBrl : model.costPerToken) * 1000)}{" "}
                {getMessage(locale, "perThousandTokens")}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5 border-t border-zinc-800 pt-3">
              {model.badges.map((badge) => (
                <span key={badge} className="rounded-full border border-emerald-500/50 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {badgeLabel(badge)}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="h-80 min-w-0 rounded-lg border border-zinc-800 px-3 pb-6 pt-3">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">{getMessage(locale, "costVsLatency")}</p>
          <StableChart className="h-56 min-w-0">
            {({ width, height }) => (
            <ScatterChart width={width} height={height} margin={{ top: 10, right: 14, left: 0, bottom: 28 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="latency" name={`${getMessage(locale, "latency")} (ms)`} />
              <YAxis dataKey="cost" name={`${costLabel} (${currency})`} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                formatter={(value) => [formatCurrencySmart(Number(value ?? 0)), `${costLabel} (${currency})`]}
                labelFormatter={(label) => `${getMessage(locale, "latency")}: ${label}ms`}
              />
              <Scatter data={costLatencyData} dataKey="cost" name={getMessage(locale, "legendCostLatencyPoints")}>
                {costLatencyData.map((entry, index) => (
                  <Cell key={`scatter-${entry.model}-${index}`} fill={getModelFill(entry.model, entry.color)} />
                ))}
              </Scatter>
            </ScatterChart>
            )}
          </StableChart>
          <div className="mt-1 flex flex-wrap gap-2 text-xs">
            {costLatencyData.map((entry, index) => (
              <button
                key={`scatter-legend-${entry.model}-${index}`}
                type="button"
                onClick={() => toggleActiveModel(entry.model)}
                className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 transition ${
                  isModelActive(entry.model)
                    ? "border-emerald-400/80 bg-emerald-500/10"
                    : "border-zinc-300/70 opacity-60 dark:border-zinc-700"
                }`}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getModelFill(entry.model, entry.color) }} />
                <span className="text-zinc-700 dark:text-zinc-300">{entry.model}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="h-80 min-w-0 rounded-lg border border-zinc-800 px-3 pb-6 pt-3">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">{getMessage(locale, "costPerQuality")}</p>
          <StableChart className="h-56 min-w-0">
            {({ width, height }) => (
            <BarChart width={width} height={height} data={costPerQualityData} margin={{ top: 8, right: 12, left: 0, bottom: 34 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="model" interval={0} angle={-18} height={70} textAnchor="end" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(value) => formatCurrencySmart(Number(value))} />
              <Tooltip formatter={(value) => [`${formatCurrencySmart(Number(value ?? 0))} / ponto`, getMessage(locale, "costPerQuality")]} />
              <Bar dataKey="costPerQuality" name={getMessage(locale, "legendCostPerQualityBars")}>
                {costPerQualityData.map((entry, index) => {
                  return <Cell key={`${entry.model}-${index}`} fill={getModelFill(entry.model, entry.color)} />;
                })}
              </Bar>
            </BarChart>
            )}
          </StableChart>
          <div className="mt-1 flex flex-wrap gap-2 text-xs">
            {costPerQualityData.map((entry, index) => (
              <button
                key={`cpq-legend-${entry.model}-${index}`}
                type="button"
                onClick={() => toggleActiveModel(entry.model)}
                className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 transition ${
                  isModelActive(entry.model)
                    ? "border-emerald-400/80 bg-emerald-500/10"
                    : "border-zinc-300/70 opacity-60 dark:border-zinc-700"
                }`}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getModelFill(entry.model, entry.color) }} />
                <span className="text-zinc-700 dark:text-zinc-300">{entry.model}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="h-80 min-w-0 rounded-lg border border-zinc-800 px-3 pb-6 pt-3">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">{getMessage(locale, "latencyBreakdown")}</p>
          <StableChart className="h-full min-w-0">
            {({ width, height }) => (
            <BarChart width={width} height={height} data={latencyData} margin={{ top: 8, right: 12, left: 0, bottom: 38 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="model" interval={0} angle={-18} height={70} textAnchor="end" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
              <Bar dataKey="ttft" fill="#0ea5e9" name="TTFT (ms)" />
              <Bar dataKey="latency" fill="#6366f1" name="Total (ms)" />
            </BarChart>
            )}
          </StableChart>
        </div>

        <div className="h-80 min-w-0 rounded-lg border border-zinc-800 px-3 pb-6 pt-3">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">{getMessage(locale, "historicalTrends")}</p>
          <StableChart className="h-full min-w-0">
            {({ width, height }) => (
            <LineChart width={width} height={height} data={trendData} margin={{ top: 8, right: 12, left: 0, bottom: 38 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="model" interval={0} angle={-18} height={70} textAnchor="end" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
              <Line yAxisId="left" type="monotone" dataKey="avgLatencyMs" stroke="#f97316" name="Latencia media (ms)" />
              <Line yAxisId="right" type="monotone" dataKey="avgCostUsd" stroke="#22c55e" name="Custo medio (USD)" />
            </LineChart>
            )}
          </StableChart>
        </div>
      </div>

      {analytics.models.length >= 3 && (
        <div className="h-[22rem] min-w-0 rounded-lg border border-zinc-800 px-3 pb-6 pt-3">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">{getMessage(locale, "profileRadar")}</p>
          <StableChart className="h-full min-w-0">
            {({ width, height }) => (
            <RadarChart width={width} height={height} data={radarData} margin={{ top: 8, right: 12, left: 12, bottom: 24 }}>
              <PolarGrid />
              <PolarAngleAxis dataKey="model" />
              <PolarRadiusAxis domain={[0, 10]} />
              <Radar name="Qualidade" dataKey="quality" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
              <Radar name="Eficiencia" dataKey="efficiency" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
              <Radar name="Velocidade" dataKey="speed" stroke="#a855f7" fill="#a855f7" fillOpacity={0.2} />
              <Legend verticalAlign="bottom" height={36} />
              <Tooltip />
            </RadarChart>
            )}
          </StableChart>
        </div>
      )}

      <div className="rounded-lg border border-zinc-800 p-3">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">{getMessage(locale, "modelSimilarity")}</p>
        <div className="max-h-40 space-y-1 overflow-y-auto text-sm">
          {analytics.similarities.map((edge) => (
            <div key={`${edge.from}-${edge.to}`} className={`rounded px-2 py-1 ${edge.divergent ? "bg-rose-500/10 text-rose-700 dark:text-rose-300" : "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300"}`}>
              {edge.from} vs {edge.to}: {edge.similarityPct}% {edge.divergent ? `• ${getMessage(locale, "divergenceHigh")}` : ""}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
