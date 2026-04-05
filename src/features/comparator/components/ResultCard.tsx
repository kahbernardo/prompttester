import { copyToClipboard } from "@/shared/lib/clipboardUtils";
import { getMessage } from "@/shared/i18n/messages";
import { useUiPreferencesStore } from "@/shared/store/uiPreferencesStore";
import { LlmResult } from "@/shared/types";
import { Copy } from "lucide-react";
import { useState } from "react";

type Props = {
  result: LlmResult;
  highlightBest: boolean;
  highlightBestOverall: boolean;
  onDelete: () => void;
  accent: {
    border: string;
    background: string;
    badge: string;
  };
};

export function ResultCard({ result, highlightBest, highlightBestOverall, onDelete, accent }: Props) {
  const locale = useUiPreferencesStore((state) => state.locale);
  const [copySuccess, setCopySuccess] = useState(false);
  const showExecutionRedirect = Boolean(result.requestedModel && result.requestedModel !== result.model);

  async function handleCopy(): Promise<void> {
    try {
      await copyToClipboard(result.responseText ?? "");
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 1200);
    } catch {
      setCopySuccess(false);
    }
  }

  return (
    <article
      className={`rounded-lg border p-3 shadow-sm transition hover:-translate-y-0.5 ${highlightBestOverall ? "ring-2 ring-emerald-500/70" : ""}`}
      style={{
        borderColor: accent.border,
        backgroundColor: highlightBest ? accent.background : `${accent.background}99`
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-100">{result.model}</h3>
        <div className="flex items-center gap-1.5">
          {highlightBestOverall && (
            <span className="rounded-full border border-emerald-500/50 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
              {getMessage(locale, "bestOverall")}
            </span>
          )}
          <span className="rounded px-1.5 py-0.5 text-xs text-zinc-200 dark:text-zinc-100" style={{ backgroundColor: accent.badge }}>
            {result.provider}
          </span>
        </div>
      </div>
      {showExecutionRedirect && (
        <p className="mb-2 text-[11px] text-emerald-300">
          {getMessage(locale, "executionRedirect")}: {result.requestedModel} {"->"} {result.model}
        </p>
      )}
      <p className="mb-2 text-xs text-zinc-300">lat: {result.latencyMs}ms • $ {result.costUsd.toFixed(6)}</p>
      {result.error ? (
        <p className="rounded bg-red-950/40 p-2 text-xs text-red-300">{result.error}</p>
      ) : (
        <pre className="max-h-40 overflow-auto rounded bg-zinc-950 p-2 text-xs text-zinc-300">
          {result.responseText}
        </pre>
      )}
      <div className="mt-2 flex gap-2">
        <div className="group relative">
          <button
            type="button"
            aria-label={getMessage(locale, "copy")}
            title={getMessage(locale, "copy")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-700 text-zinc-200 transition hover:border-emerald-500/70 hover:text-emerald-300 focus-visible:border-emerald-500/70 focus-visible:text-emerald-300"
            onClick={handleCopy}
          >
            <Copy className="h-4 w-4" />
          </button>
          <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] font-medium text-zinc-200 opacity-0 shadow-sm transition group-hover:opacity-100 group-focus-within:opacity-100">
            {copySuccess ? `${getMessage(locale, "copy")} ✓` : getMessage(locale, "copy")}
          </span>
        </div>
        <button type="button" className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-200 transition hover:border-rose-500/70 hover:text-rose-300" onClick={onDelete}>
          {getMessage(locale, "delete")}
        </button>
      </div>
    </article>
  );
}
