import { LlmResult, ProviderName } from "@/shared/types";

export type ProviderRunOutput = {
  responseText: string;
  inputTokens?: number;
  outputTokens?: number;
};

export type LlmProvider = {
  name: ProviderName;
  models: string[];
  run: (prompt: string, model: string) => Promise<ProviderRunOutput>;
};

export const providerModels: Record<ProviderName, string[]> = {
  openai: [
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-4.1-nano",
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4.5",
    "chatgpt-4o-latest",
    "o1-preview",
    "o1-pro",
    "o1-mini",
    "o3-mini",
    "o4-mini",
    "text-davinci-003"
  ],
  anthropic: [
    "claude-3-7-sonnet-latest",
    "claude-3-5-sonnet-latest",
    "claude-3-5-haiku-latest",
    "claude-3-opus-latest",
    "claude-3-haiku-20240307",
    "claude-3.7-sonnet",
    "claude-3.5-sonnet",
    "claude-3-opus",
    "claude-3-haiku",
    "claude-3.5-haiku",
    "claude-sonnet-4.5",
    "claude-opus-4"
  ],
  google: [
    "gemini-2.5-pro-preview-03-25",
    "gemini-2.5-pro-preview-03-25-200k",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-128k",
    "gemini-1.5-flash-8b",
    "gemini-1.5-flash-8b-128k",
    "gemini-1.5-pro",
    "gemini-1.0-pro",
    "gemini-pro"
  ],
  mistral: [
    "mistral-large-latest",
    "mistral-small-latest",
    "mistral-medium-2505",
    "mistral-nemo",
    "open-mistral-7b",
    "open-mixtral-8x7b",
    "open-mixtral-8x22b",
    "ministral-8b-latest",
    "codestral-latest",
    "pixtral-large-latest",
    "pixtral-12b"
  ],
  deepseek: ["deepseek-chat", "deepseek-reasoner", "deepseek-coder", "deepseek-v2.5", "deepseek-r1"],
  xai: [
    "grok-3",
    "grok-3-mini",
    "grok-4-fast",
    "grok-4",
    "grok-4-128k",
    "grok-4-fast-128k",
    "grok-4-fast-reasoning",
    "grok-2-1212",
    "grok-2-vision-1212",
    "grok-mini-beta"
  ],
  meta: ["meta-llama/llama-3.3-70b-instruct", "meta-llama/llama-3.1-405b-instruct", "meta-llama/llama-3.1-70b-instruct", "meta-llama/llama-3.1-8b-instruct", "meta-llama/llama-3.2-90b-vision-instruct"],
  codex: ["o3-mini", "o4-mini", "codex-mini-latest", "codex-preview", "gpt-4.1-nano"],
  amazon: ["amazon-nova-micro", "amazon-nova-lite", "amazon-nova-pro", "amazon-nova-premier"],
  minimax: ["minimax-m2"],
  moonshot: ["kimi-k2-0905-preview", "kimi-k2-0711-preview", "kimi-k2-turbo-preview", "kimi-k2-thinking", "kimi-k2-thinking-turbo"],
  qwen: ["qwen3.6-plus", "qwen3.6-plus-256k"]
};

export function inferProviderByModel(model: string): ProviderName | undefined {
  const value = model.toLowerCase();
  if (value.includes("codex")) return "codex";
  if (value.startsWith("meta-llama/") || value.startsWith("llama-")) return "meta";
  if (value.startsWith("grok")) return "xai";
  if (value.startsWith("amazon-")) return "amazon";
  if (value.startsWith("minimax-")) return "minimax";
  if (value.startsWith("qwen")) return "qwen";
  if (value.startsWith("kimi-")) return "moonshot";
  if (value.startsWith("deepseek-")) return "deepseek";
  if (value.startsWith("claude-")) return "anthropic";
  if (value.startsWith("gemini-")) return "google";
  if (value.includes("mistral") || value.includes("mixtral") || value.includes("ministral") || value.includes("pixtral") || value.includes("codestral")) return "mistral";
  if (value.startsWith("gpt-") || value.startsWith("o1") || value.startsWith("o3") || value.startsWith("o4") || value.startsWith("chatgpt-") || value.startsWith("text-davinci")) return "openai";
  return undefined;
}

export function getProviderByModel(model: string): ProviderName {
  return inferProviderByModel(model) ?? "openai";
}

export function mapRunOutputToResult(value: LlmResult): LlmResult {
  return value;
}
