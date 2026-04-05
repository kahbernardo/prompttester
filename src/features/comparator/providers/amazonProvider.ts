import { LlmProvider, ProviderRunOutput } from "@/features/comparator/providers/llmProvider";
import { fallbackTokenUsage, getChatCompletionsText, getChatCompletionsUsage } from "@/features/comparator/providers/providerUtils";

async function runAmazon(prompt: string, model: string): Promise<ProviderRunOutput> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY não configurada para modelos Amazon");
  }
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0.4 })
  });
  if (!response.ok) {
    throw new Error(`Amazon via OpenRouter falhou: ${await response.text()}`);
  }
  const data = await response.json();
  const content = getChatCompletionsText(data);
  const usage = getChatCompletionsUsage(data);
  const fallback = fallbackTokenUsage(prompt, content);
  return {
    responseText: content,
    inputTokens: usage.inputTokens ?? fallback.inputTokens,
    outputTokens: usage.outputTokens ?? fallback.outputTokens
  };
}

export const amazonProvider: LlmProvider = {
  name: "amazon",
  models: ["amazon-nova-micro", "amazon-nova-lite", "amazon-nova-pro", "amazon-nova-premier"],
  run: runAmazon
};
