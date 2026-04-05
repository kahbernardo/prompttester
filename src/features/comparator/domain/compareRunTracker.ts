import { LlmResult, PricingSource } from "@/shared/types";

export type CompareRunLogLevel = "info" | "success" | "error";

export type CompareRunLogEntry = {
  id: string;
  timestamp: string;
  level: CompareRunLogLevel;
  message: string;
};

export type CompareRunItemStatus = "queued" | "running" | "success" | "error";

export type CompareRunItem = {
  requestedModel: string;
  executionModel: string;
  provider: string;
  status: CompareRunItemStatus;
  error?: string;
};

export type CompareRunSnapshot = {
  runId: string;
  status: "running" | "completed" | "failed";
  startedAt: string;
  updatedAt: string;
  total: number;
  completed: number;
  progressPct: number;
  items: CompareRunItem[];
  logs: CompareRunLogEntry[];
  timestamp?: string;
  pricingMeta?: {
    source: PricingSource;
    updatedAt: string;
  };
  results?: LlmResult[];
  error?: string;
};

type CompareRunInternal = CompareRunSnapshot & {
  createdAtMs: number;
};

const runs = new Map<string, CompareRunInternal>();
const RETENTION_MS = 30 * 60 * 1000;
const MAX_LOGS = 400;

function nowIso(): string {
  return new Date().toISOString();
}

function cleanupOldRuns(): void {
  const now = Date.now();
  for (const [runId, run] of runs) {
    if (now - run.createdAtMs > RETENTION_MS) {
      runs.delete(runId);
    }
  }
}

function sanitizeMessage(message: string): string {
  return message
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
    .replace(/(sk-[A-Za-z0-9_-]{10,})/g, "[REDACTED_API_KEY]")
    .replace(/(api[_-]?key\s*[:=]\s*)([^\s,;]+)/gi, "$1[REDACTED]")
    .replace(/(authorization\s*[:=]\s*)([^\s,;]+)/gi, "$1[REDACTED]");
}

export function createCompareRun(items: Array<{ requestedModel: string; executionModel: string; provider: string }>): string {
  cleanupOldRuns();
  const runId = crypto.randomUUID();
  const startedAt = nowIso();
  runs.set(runId, {
    runId,
    status: "running",
    startedAt,
    updatedAt: startedAt,
    total: items.length,
    completed: 0,
    progressPct: 0,
    items: items.map((item) => ({ ...item, status: "queued" as const })),
    logs: [],
    createdAtMs: Date.now()
  });
  appendRunLog(runId, "info", `Execução iniciada com ${items.length} modelo(s).`);
  return runId;
}

export function appendRunLog(runId: string, level: CompareRunLogLevel, message: string): void {
  const run = runs.get(runId);
  if (!run) return;
  const log: CompareRunLogEntry = {
    id: crypto.randomUUID(),
    timestamp: nowIso(),
    level,
    message: sanitizeMessage(message)
  };
  run.logs.push(log);
  if (run.logs.length > MAX_LOGS) {
    run.logs.splice(0, run.logs.length - MAX_LOGS);
  }
  run.updatedAt = nowIso();
}

export function markRunItemStarted(runId: string, executionModel: string): void {
  const run = runs.get(runId);
  if (!run) return;
  const item = run.items.find((candidate) => candidate.executionModel === executionModel && candidate.status === "queued");
  if (!item) return;
  item.status = "running";
  run.updatedAt = nowIso();
  appendRunLog(runId, "info", `Request iniciado para ${item.provider}/${item.executionModel}.`);
}

export function markRunItemFinished(runId: string, executionModel: string, error?: string): void {
  const run = runs.get(runId);
  if (!run) return;
  const item = [...run.items]
    .reverse()
    .find((candidate) => candidate.executionModel === executionModel && (candidate.status === "running" || candidate.status === "queued"));
  if (!item) return;
  item.status = error ? "error" : "success";
  item.error = error;
  run.completed = Math.min(run.total, run.completed + 1);
  run.progressPct = run.total > 0 ? Math.round((run.completed / run.total) * 100) : 100;
  run.updatedAt = nowIso();
  if (error) {
    appendRunLog(runId, "error", `Falha em ${item.provider}/${item.executionModel}: ${error}`);
  } else {
    appendRunLog(runId, "success", `Request concluído para ${item.provider}/${item.executionModel}.`);
  }
}

export function finalizeCompareRun(
  runId: string,
  results: LlmResult[],
  pricingMeta: { source: PricingSource; updatedAt: string }
): void {
  const run = runs.get(runId);
  if (!run) return;
  run.status = "completed";
  run.progressPct = 100;
  run.completed = run.total;
  run.results = results;
  run.pricingMeta = pricingMeta;
  run.timestamp = nowIso();
  run.updatedAt = nowIso();
  appendRunLog(runId, "success", "Execução finalizada com sucesso.");
}

export function failCompareRun(runId: string, error: string): void {
  const run = runs.get(runId);
  if (!run) return;
  run.status = "failed";
  run.error = sanitizeMessage(error);
  run.updatedAt = nowIso();
  appendRunLog(runId, "error", `Execução falhou: ${error}`);
}

export function getCompareRunSnapshot(runId: string): CompareRunSnapshot | null {
  const run = runs.get(runId);
  if (!run) return null;
  const { createdAtMs, ...snapshot } = run;
  return snapshot;
}
