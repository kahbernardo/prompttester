import { ProviderName } from "@/shared/types";

const aliasByProvider: Partial<Record<ProviderName, Record<string, string>>> = {
  openai: {
    "chatgpt-4o-latest": "gpt-4o",
    "gpt-4.5": "gpt-4.1",
    "text-davinci-003": "gpt-4.1-mini",
    "o1-preview": "o3-mini",
    "o1-pro": "o4-mini",
    "o1-mini": "o3-mini"
  },
  codex: {
    "codex-preview": "o4-mini",
    "codex-mini-latest": "o3-mini"
  },
  anthropic: {
    "claude-3.7-sonnet": "claude-3-7-sonnet-latest",
    "claude-3.5-sonnet": "claude-3-5-sonnet-latest",
    "claude-3.5-haiku": "claude-3-5-haiku-latest",
    "claude-3-opus": "claude-3-opus-latest",
    "claude-3-haiku": "claude-3-haiku-20240307",
    "claude-sonnet-4.5": "claude-3-7-sonnet-latest",
    "claude-opus-4": "claude-3-opus-latest"
  },
  google: {
    "gemini-1.0-pro": "gemini-1.5-pro",
    "gemini-pro": "gemini-1.5-pro",
    "gemini-2.0-flash-lite": "gemini-2.0-flash",
    "gemini-1.5-flash-128k": "gemini-1.5-flash",
    "gemini-1.5-flash-8b": "gemini-1.5-flash",
    "gemini-1.5-flash-8b-128k": "gemini-1.5-flash"
  },
  mistral: {
    "open-mistral-7b": "mistral-small-latest",
    "open-mixtral-8x7b": "mistral-small-latest",
    "open-mixtral-8x22b": "mistral-large-latest",
    "pixtral-12b": "pixtral-large-latest"
  },
  deepseek: {
    "deepseek-v2.5": "deepseek-chat",
    "deepseek-r1": "deepseek-reasoner",
    "deepseek-coder": "deepseek-chat"
  },
  xai: {
    "grok-3": "grok-2-1212",
    "grok-3-mini": "grok-mini-beta",
    "grok-4": "grok-2-1212",
    "grok-4-fast": "grok-2-1212"
  },
  qwen: {
    "qwen3.6-plus-256k": "qwen3.6-plus"
  },
  moonshot: {
    "kimi-k2-0905-preview": "kimi-k2-turbo-preview",
    "kimi-k2-0711-preview": "kimi-k2-turbo-preview",
    "kimi-k2-thinking": "kimi-k2-turbo-preview",
    "kimi-k2-thinking-turbo": "kimi-k2-turbo-preview"
  },
  amazon: {
    "amazon-nova-premier": "amazon-nova-pro",
    "amazon-nova-pro": "amazon-nova-lite"
  }
};

const fallbackByProvider: Partial<Record<ProviderName, string>> = {
  openai: "gpt-4.1-mini",
  codex: "o3-mini",
  anthropic: "claude-3-5-sonnet-latest",
  google: "gemini-2.0-flash",
  mistral: "mistral-small-latest",
  deepseek: "deepseek-chat",
  xai: "grok-2-1212",
  meta: "meta-llama/llama-3.1-70b-instruct",
  amazon: "amazon-nova-lite",
  minimax: "minimax-m2",
  moonshot: "kimi-k2-turbo-preview",
  qwen: "qwen3.6-plus"
};

export function resolveCompatibleModel(provider: ProviderName, model: string): string {
  const mapping = aliasByProvider[provider];
  if (!mapping) {
    return model;
  }
  return mapping[model.toLowerCase()] ?? model;
}

export function getProviderFallbackModel(provider: ProviderName): string | undefined {
  return fallbackByProvider[provider];
}

export function isModelSelectionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /(model_not_found|does not exist|unknown model|invalid model|unsupported model|not supported in|not found)/i.test(
    message
  );
}
