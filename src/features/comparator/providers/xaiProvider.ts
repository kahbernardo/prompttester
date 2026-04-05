import { LlmProvider, ProviderRunOutput } from "@/features/comparator/providers/llmProvider";
import { fallbackTokenUsage, getChatCompletionsText, getChatCompletionsUsage } from "@/features/comparator/providers/providerUtils";

async function runXai(prompt: string, model: string): Promise<ProviderRunOutput> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error("XAI_API_KEY não configurada");
  }
  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0.4 })
  });
  if (!response.ok) {
    throw new Error(`xAI falhou: ${await response.text()}`);
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

export const xaiProvider: LlmProvider = {
  name: "xai",
  models: ["grok-2-1212", "grok-2-vision-1212", "grok-beta", "grok-vision-beta", "grok-mini-beta"],
  run: runXai
};
