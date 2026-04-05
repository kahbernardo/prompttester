import { estimateTokens } from "@/features/comparator/domain/tokenUtils";

export function toSafeString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  return "";
}

export function fallbackTokenUsage(prompt: string, responseText: string): { inputTokens: number; outputTokens: number } {
  return {
    inputTokens: estimateTokens(prompt),
    outputTokens: estimateTokens(responseText)
  };
}

function getObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as Record<string, unknown>;
}

function normalizeText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean).join("\n");
  }
  const obj = getObject(value);
  if (!obj) {
    return "";
  }
  return toSafeString(obj.text) || toSafeString(obj.content) || toSafeString(obj.output_text) || "";
}

export function getChatCompletionsText(data: unknown): string {
  const root = getObject(data);
  const choices = Array.isArray(root?.choices) ? root.choices : [];
  const first = getObject(choices[0]);
  const message = getObject(first?.message);
  const direct = normalizeText(message?.content);
  if (direct) {
    return direct;
  }
  const delta = getObject(first?.delta);
  return normalizeText(delta?.content);
}

export function getChatCompletionsUsage(data: unknown): { inputTokens?: number; outputTokens?: number } {
  const usage = getObject(getObject(data)?.usage);
  const prompt = usage?.prompt_tokens;
  const completion = usage?.completion_tokens;
  const input = usage?.input_tokens;
  const output = usage?.output_tokens;
  return {
    inputTokens: typeof prompt === "number" ? prompt : typeof input === "number" ? input : undefined,
    outputTokens: typeof completion === "number" ? completion : typeof output === "number" ? output : undefined
  };
}

export function getAnthropicMessageText(data: unknown): string {
  const content = Array.isArray(getObject(data)?.content) ? (getObject(data)?.content as unknown[]) : [];
  return content.map((item) => toSafeString(getObject(item)?.text)).filter(Boolean).join("\n");
}

export function getAnthropicUsage(data: unknown): { inputTokens?: number; outputTokens?: number } {
  const usage = getObject(getObject(data)?.usage);
  return {
    inputTokens: typeof usage?.input_tokens === "number" ? usage.input_tokens : undefined,
    outputTokens: typeof usage?.output_tokens === "number" ? usage.output_tokens : undefined
  };
}

export function getGoogleGenerateContentText(data: unknown): string {
  const candidate = getObject((Array.isArray(getObject(data)?.candidates) ? (getObject(data)?.candidates as unknown[]) : [])[0]);
  const content = getObject(candidate?.content);
  const parts = Array.isArray(content?.parts) ? content.parts : [];
  return parts.map((part) => normalizeText(part)).filter(Boolean).join("\n");
}

export function getGoogleGenerateContentUsage(data: unknown): { inputTokens?: number; outputTokens?: number } {
  const usage = getObject(getObject(data)?.usageMetadata);
  return {
    inputTokens: typeof usage?.promptTokenCount === "number" ? usage.promptTokenCount : undefined,
    outputTokens: typeof usage?.candidatesTokenCount === "number" ? usage.candidatesTokenCount : undefined
  };
}

type OpenAiUsageLike = { input_tokens?: number; output_tokens?: number };

export function getOpenAiResponsesText(data: unknown): string {
  const root = getObject(data);
  const direct = toSafeString(root?.output_text);
  if (direct) {
    return direct;
  }
  const output = Array.isArray(root?.output) ? root.output : [];
  for (const item of output) {
    const content = Array.isArray(getObject(item)?.content) ? (getObject(item)?.content as unknown[]) : [];
    const text = content.map((part) => toSafeString(getObject(part)?.text)).filter(Boolean).join("\n");
    if (text) {
      return text;
    }
  }
  return "";
}

export function getOpenAiResponsesUsage(data: unknown): { inputTokens?: number; outputTokens?: number } {
  const usage = getObject(getObject(data)?.usage) as OpenAiUsageLike | null;
  return {
    inputTokens: usage?.input_tokens,
    outputTokens: usage?.output_tokens
  };
}
