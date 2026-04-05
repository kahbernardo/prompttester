import { LlmProvider, ProviderRunOutput } from "@/features/comparator/providers/llmProvider";
import { fallbackTokenUsage, getChatCompletionsText, getChatCompletionsUsage } from "@/features/comparator/providers/providerUtils";

async function runDeepseek(prompt: string, model: string): Promise<ProviderRunOutput> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY não configurada");
  }
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0.4 })
  });
  if (!response.ok) {
    throw new Error(`DeepSeek falhou: ${await response.text()}`);
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

export const deepseekProvider: LlmProvider = {
  name: "deepseek",
  models: ["deepseek-chat", "deepseek-reasoner", "deepseek-coder", "deepseek-v2.5", "deepseek-r1"],
  run: runDeepseek
};
