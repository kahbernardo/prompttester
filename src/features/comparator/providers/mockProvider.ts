import { calculateCostUsdFromMap } from "@/features/comparator/domain/pricingConfig";
import { estimateTokens } from "@/features/comparator/domain/tokenUtils";
import { getProviderByModel } from "@/features/comparator/providers/llmProvider";
import { LlmResult, PricingMap } from "@/shared/types";

type MockProfile = {
  latencyBaseMs: number;
  outputMultiplier: number;
  responseBuilder: (model: string) => string;
};

const mockProfiles: MockProfile[] = [
  {
    latencyBaseMs: 380,
    outputMultiplier: 0.55,
    responseBuilder: (model) =>
      `[MOCK:${model}] Resposta curta e objetiva.\n- Item 1\n- Item 2\n- Item 3`
  },
  {
    latencyBaseMs: 1800,
    outputMultiplier: 1.7,
    responseBuilder: (model) =>
      `[MOCK:${model}] Analise longa com alto detalhamento.\n\nSecao A:\nTexto extenso com varias explicacoes tecnicas.\n\nSecao B:\nMais contexto para simular maior custo e latencia.`
  },
  {
    latencyBaseMs: 980,
    outputMultiplier: 1.1,
    responseBuilder: (model) =>
      `[MOCK:${model}] Resposta estruturada de alta qualidade.\n\n## Passos\n1. Contexto\n2. Solucao\n3. Trade-offs\n\n\`\`\`ts\nexport function decideModel() {\n  return "balanced";\n}\n\`\`\``
  }
];

export async function runMockComparison(prompt: string, selectedModels: string[], pricingMap: PricingMap): Promise<LlmResult[]> {
  return selectedModels.map((model, index) => {
    const profile = mockProfiles[index % mockProfiles.length];
    const provider = getProviderByModel(model);
    const inputTokens = estimateTokens(prompt);
    const outputTokens = Math.max(36, Math.floor(inputTokens * profile.outputMultiplier));
    const latencyMs = profile.latencyBaseMs + index * 90;
    const costUsd = calculateCostUsdFromMap(model, inputTokens, outputTokens, pricingMap);
    return {
      model,
      provider,
      responseText: profile.responseBuilder(model),
      inputTokens,
      outputTokens,
      latencyMs,
      costUsd
    };
  });
}
