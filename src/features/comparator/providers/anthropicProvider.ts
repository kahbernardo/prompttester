import { LlmProvider, ProviderRunOutput } from "@/features/comparator/providers/llmProvider";
import { fallbackTokenUsage, getAnthropicMessageText, getAnthropicUsage } from "@/features/comparator/providers/providerUtils";

async function runAnthropic(prompt: string, model: string): Promise<ProviderRunOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY não configurada");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({ model, max_tokens: 1200, messages: [{ role: "user", content: prompt }] })
  });

  if (!response.ok) {
    throw new Error(`Anthropic falhou: ${await response.text()}`);
  }

  const data = await response.json();
  const content = getAnthropicMessageText(data);
  const usage = getAnthropicUsage(data);
  const fallback = fallbackTokenUsage(prompt, content);

  return {
    responseText: content,
    inputTokens: usage.inputTokens ?? fallback.inputTokens,
    outputTokens: usage.outputTokens ?? fallback.outputTokens
  };
}

export const anthropicProvider: LlmProvider = {
  name: "anthropic",
  models: ["claude-3-7-sonnet-latest", "claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-opus-latest", "claude-3-haiku-20240307"],
  run: runAnthropic
};
