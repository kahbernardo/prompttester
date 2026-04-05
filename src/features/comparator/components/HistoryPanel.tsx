import { getProviderByModel, providerModels } from "@/features/comparator/providers/llmProvider";
import { useComparatorStore } from "@/features/comparator/store/comparatorStore";
import { getMessage } from "@/shared/i18n/messages";
import { useUiPreferencesStore } from "@/shared/store/uiPreferencesStore";
import { RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";

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

export function HistoryPanel() {
  const locale = useUiPreferencesStore((state) => state.locale);
  const [providerIconLoaded, setProviderIconLoaded] = useState<Partial<Record<keyof typeof providerModels, boolean>>>({});
  const history = useComparatorStore((state) => state.history);
  const rerunFromHistory = useComparatorStore((state) => state.rerunFromHistory);
  const deleteHistoryItem = useComparatorStore((state) => state.deleteHistoryItem);
  const clearHistory = useComparatorStore((state) => state.clearHistory);

  return (
    <section className="flex h-full flex-col rounded-xl border border-zinc-800 bg-zinc-950/85 p-4 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-100">{getMessage(locale, "history")}</h2>
        <button type="button" className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-200 transition hover:border-zinc-500" onClick={clearHistory}>
          {getMessage(locale, "clearAll")}
        </button>
      </div>
      <div className="space-y-2 overflow-y-auto pr-1">
        {history.map((item) => (
          <article key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-xs transition hover:border-emerald-400/60 hover:bg-zinc-900/70">
            <div className="mb-1">
              <p className="line-clamp-2 text-zinc-200">{item.prompt}</p>
            </div>
            {item.results
              .filter((result) => result.requestedModel && result.requestedModel !== result.model)
              .slice(0, 2)
              .map((result, index) => (
                <p key={`${item.id}-${result.provider}-${result.requestedModel ?? "direct"}-${result.model}-redirect-${index}`} className="mt-1 text-[10px] text-emerald-300">
                  {getMessage(locale, "executionRedirect")}: {result.requestedModel} {"->"} {result.model}
                </p>
              ))}
            <p className="text-zinc-400">{new Date(item.timestamp).toLocaleString()}</p>
            <div className="mt-3 flex items-end justify-between gap-2">
              <div className="flex gap-2">
                <div className="group relative">
                  <button
                    type="button"
                    aria-label={getMessage(locale, "rerun")}
                    title={getMessage(locale, "rerun")}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-emerald-300/80 bg-emerald-500/10 text-emerald-600 transition hover:border-emerald-500 hover:bg-emerald-500/20 focus-visible:border-emerald-500 focus-visible:bg-emerald-500/20 dark:border-emerald-500/40 dark:text-emerald-300 dark:hover:bg-emerald-500/25 dark:focus-visible:bg-emerald-500/25"
                    onClick={() => rerunFromHistory(item)}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] font-medium text-zinc-200 opacity-0 shadow-sm transition group-hover:opacity-100 group-focus-within:opacity-100">
                    {getMessage(locale, "rerun")}
                  </span>
                </div>
                <div className="group relative">
                  <button
                    type="button"
                    aria-label={getMessage(locale, "delete")}
                    title={getMessage(locale, "delete")}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-300/80 bg-rose-500/10 text-rose-600 transition hover:border-rose-500 hover:bg-rose-500/20 focus-visible:border-rose-500 focus-visible:bg-rose-500/20 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/25 dark:focus-visible:bg-rose-500/25"
                    onClick={() => deleteHistoryItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] font-medium text-zinc-200 opacity-0 shadow-sm transition group-hover:opacity-100 group-focus-within:opacity-100">
                    {getMessage(locale, "delete")}
                  </span>
                </div>
              </div>
              <div className="shrink-0">
                <div className="flex items-center gap-1">
                  {item.models.slice(0, 3).map((model, index) => {
                    const provider = getProviderByModel(model);
                    return (
                      <div key={`${item.id}-${model}`} className="flex items-center gap-1">
                        <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-md bg-zinc-800/10 dark:bg-zinc-100/10">
                          {!providerIconLoaded[provider] && (
                            <span className="text-[9px] font-semibold text-zinc-700 dark:text-zinc-200">{providerMonogram(provider)}</span>
                          )}
                          <img
                            src={
                              providerIconDomain[provider]
                                ? `https://icon.horse/icon/${providerIconDomain[provider]}`
                                : `https://cdn.simpleicons.org/${providerIconSlug[provider]}/9ca3af`
                            }
                            alt={`${provider} logo`}
                            className="absolute inset-0 h-7 w-7 rounded-md p-1"
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
                        {index < Math.min(item.models.length, 3) - 1 && <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">vs</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
