import { LlmProvider, ProviderRunOutput } from "@/features/comparator/providers/llmProvider";
import { fallbackTokenUsage, getOpenAiResponsesText, getOpenAiResponsesUsage } from "@/features/comparator/providers/providerUtils";

function isTruthyFlag(value: string | undefined): boolean {
  return /^(1|true|yes|on)$/i.test(String(value ?? ""));
}

function isDeepResearchModel(model: string): boolean {
  return /deep-?research/i.test(model);
}

async function runCodex(prompt: string, model: string): Promise<ProviderRunOutput> {
  const apiKey = process.env.CODEX_API_KEY;
  if (!apiKey) {
    throw new Error("CODEX_API_KEY não configurada para modelos Codex");
  }

  const isDeepResearch = isDeepResearchModel(model);
  const webSearchEnabled = isTruthyFlag(process.env.COMPARE_ENABLE_WEB_SEARCH);
  if (isDeepResearch && !webSearchEnabled) {
    throw new Error("Modelo deep-research requer COMPARE_ENABLE_WEB_SEARCH=true para execução direta");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      input: prompt,
      ...(isDeepResearch && webSearchEnabled ? { tools: [{ type: "web_search_preview" }] } : {})
    })
  });

  if (!response.ok) {
    throw new Error(`Codex/OpenAI falhou: ${await response.text()}`);
  }

  const data = await response.json();
  const content = getOpenAiResponsesText(data);
  const usage = getOpenAiResponsesUsage(data);
  const fallback = fallbackTokenUsage(prompt, content);

  return {
    responseText: content,
    inputTokens: usage.inputTokens ?? fallback.inputTokens,
    outputTokens: usage.outputTokens ?? fallback.outputTokens
  };
}

export const codexProvider: LlmProvider = {
  name: "codex",
  models: ["o3-mini", "o4-mini", "codex-mini-latest", "codex-preview", "gpt-4.1-nano"],
  run: runCodex
};
