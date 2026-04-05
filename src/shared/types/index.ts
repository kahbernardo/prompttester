export type ProviderName =
  | "openai"
  | "anthropic"
  | "google"
  | "mistral"
  | "deepseek"
  | "xai"
  | "meta"
  | "codex"
  | "amazon"
  | "minimax"
  | "moonshot"
  | "qwen";
export type SortBy = "fastest" | "cheapest";
export type PricingSource = "live" | "fallback";

export type PricingMap = Record<string, { input: number; output: number }>;
export type ProviderAvailability = Record<ProviderName, boolean>;
export type ProviderHealthStatus = "ok" | "missingKey" | "unreachable";
export type ProviderDiagnostics = Record<ProviderName, { status: ProviderHealthStatus; checkedAt: string }>;
export type RuntimeCapabilities = {
  webSearch: boolean;
  fileSearch: boolean;
  mcp: boolean;
};

export type LlmResult = {
  model: string;
  requestedModel?: string;
  provider: ProviderName;
  responseText: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  costUsd: number;
  error?: string;
};

export type CompareResponse = {
  results: LlmResult[];
  timestamp: string;
  pricingMeta?: {
    source: PricingSource;
    updatedAt: string;
  };
};

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
  provider: ProviderName | string;
  status: CompareRunItemStatus;
  error?: string;
};

export type CompareStartResponse = {
  runId: string;
};

export type CompareStatusResponse = {
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

export type HistoryItem = {
  id: string;
  prompt: string;
  models: string[];
  results: LlmResult[];
  timestamp: string;
};

export type PricingResponse = {
  pricing: PricingMap;
  source: PricingSource;
  updatedAt: string;
};

export type ProviderAvailabilityResponse = {
  availability: ProviderAvailability;
  diagnostics: ProviderDiagnostics;
  runtimeCapabilities: RuntimeCapabilities;
};

export type DependencyRiskLevel = "low" | "medium" | "high";

export type DependencyRisk = {
  name: string;
  version: string;
  riskLevel: DependencyRiskLevel;
  reasons: string[];
};
