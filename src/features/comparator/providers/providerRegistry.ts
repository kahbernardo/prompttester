import { calculateCostUsdFromMap } from "@/features/comparator/domain/pricingConfig";
import {
  buildModelExecutionPlan,
  ExecutionPlanOptions,
  ExecutionRuntimeCapabilities,
  getDefaultExecutionRuntimeCapabilities,
  ModelExecutionPlanItem
} from "@/features/comparator/domain/modelExecutionService";
import { estimateTokens } from "@/features/comparator/domain/tokenUtils";
import { amazonProvider } from "@/features/comparator/providers/amazonProvider";
import { anthropicProvider } from "@/features/comparator/providers/anthropicProvider";
import { codexProvider } from "@/features/comparator/providers/codexProvider";
import { deepseekProvider } from "@/features/comparator/providers/deepseekProvider";
import { getProviderByModel, mapRunOutputToResult, providerModels } from "@/features/comparator/providers/llmProvider";
import { googleProvider } from "@/features/comparator/providers/googleProvider";
import { metaProvider } from "@/features/comparator/providers/metaProvider";
import {
  getProviderFallbackModel,
  isModelSelectionError,
  resolveCompatibleModel
} from "@/features/comparator/providers/modelCompatibility";
import { runMockComparison } from "@/features/comparator/providers/mockProvider";
import { minimaxProvider } from "@/features/comparator/providers/minimaxProvider";
import { mistralProvider } from "@/features/comparator/providers/mistralProvider";
import { moonshotProvider } from "@/features/comparator/providers/moonshotProvider";
import { openaiProvider } from "@/features/comparator/providers/openaiProvider";
import { qwenProvider } from "@/features/comparator/providers/qwenProvider";
import { xaiProvider } from "@/features/comparator/providers/xaiProvider";
import { LlmResult, PricingMap } from "@/shared/types";

const providerMap = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
  google: googleProvider,
  mistral: mistralProvider,
  deepseek: deepseekProvider,
  xai: xaiProvider,
  meta: metaProvider,
  codex: codexProvider,
  amazon: amazonProvider,
  minimax: minimaxProvider,
  moonshot: moonshotProvider,
  qwen: qwenProvider
} as const;

export const allSupportedModels = Object.values(providerModels).flat();

export type ProviderRunProgressHooks = {
  onModelStarted?: (params: { requestedModel: string; executionModel: string; provider: string }) => void;
  onModelFinished?: (params: {
    requestedModel: string;
    executionModel: string;
    provider: string;
    error?: string;
    finalModel?: string;
  }) => void;
  onLog?: (message: string, level?: "info" | "success" | "error") => void;
};

export async function runProvidersInParallel(
  prompt: string,
  selectedModels: string[],
  mockMode: boolean,
  pricingMap: PricingMap,
  runtimeCapabilities: ExecutionRuntimeCapabilities = getDefaultExecutionRuntimeCapabilities(),
  planOptions: ExecutionPlanOptions = {},
  hooks: ProviderRunProgressHooks = {}
): Promise<LlmResult[]> {
  const allowFallback = planOptions.allowFallback ?? true;
  const executablePlanItems = buildModelExecutionPlan(selectedModels, runtimeCapabilities, planOptions).filter(
    (item): item is ModelExecutionPlanItem & { executionModel: string } => Boolean(item.executionModel)
  );

  if (mockMode) {
    const mockResults = await runMockComparison(
      prompt,
      executablePlanItems.map((item) => item.executionModel),
      pricingMap
    );
    return mockResults.map((result, index) => {
      const requestedModel = executablePlanItems[index]?.requestedModel;
      return mapRunOutputToResult({
        ...result,
        requestedModel
      });
    });
  }

  const tasks = executablePlanItems.map(async ({ requestedModel, executionModel: model }) => {
    const providerName = getProviderByModel(model);
    const provider = providerMap[providerName as keyof typeof providerMap];
    const startedAt = performance.now();
    hooks.onModelStarted?.({ requestedModel, executionModel: model, provider: providerName });
    hooks.onLog?.(`Iniciando ${providerName}/${model}.`, "info");

    try {
      if (!provider) {
        throw new Error(`Provider ${providerName} ainda não está implementado para execução real`);
      }
      const preferredModel = resolveCompatibleModel(providerName, model);
      const fallbackModel = allowFallback ? getProviderFallbackModel(providerName) : undefined;
      const candidates = Array.from(new Set([preferredModel, fallbackModel].filter(Boolean))) as string[];
      let finalResult: Awaited<ReturnType<typeof provider.run>> | null = null;
      let executedModel = model;
      let lastError: unknown = null;

      for (const candidateModel of candidates) {
        try {
          finalResult = await provider.run(prompt, candidateModel);
          executedModel = candidateModel;
          break;
        } catch (attemptError) {
          lastError = attemptError;
          if (!isModelSelectionError(attemptError)) {
            throw attemptError;
          }
        }
      }

      if (!finalResult) {
        throw (lastError instanceof Error ? lastError : new Error("Falha ao resolver modelo compatível"));
      }

      const latencyMs = Math.round(performance.now() - startedAt);
      const inputTokens = finalResult.inputTokens ?? estimateTokens(prompt);
      const outputTokens = finalResult.outputTokens ?? estimateTokens(finalResult.responseText);
      const costUsd = calculateCostUsdFromMap(executedModel, inputTokens, outputTokens, pricingMap);
      hooks.onLog?.(`Concluído ${providerName}/${executedModel} em ${latencyMs}ms.`, "success");
      hooks.onModelFinished?.({
        requestedModel,
        executionModel: model,
        provider: providerName,
        finalModel: executedModel
      });

      return mapRunOutputToResult({
        model: executedModel,
        requestedModel,
        provider: providerName,
        responseText: finalResult.responseText,
        inputTokens,
        outputTokens,
        latencyMs,
        costUsd
      });
    } catch (error) {
      const latencyMs = Math.round(performance.now() - startedAt);
      const errorMessage = error instanceof Error ? error.message : "Falha desconhecida";
      hooks.onLog?.(`Erro em ${providerName}/${model}: ${errorMessage}`, "error");
      hooks.onModelFinished?.({ requestedModel, executionModel: model, provider: providerName, error: errorMessage });
      return mapRunOutputToResult({
        model,
        requestedModel,
        provider: providerName,
        responseText: "",
        inputTokens: 0,
        outputTokens: 0,
        latencyMs,
        costUsd: 0,
        error: errorMessage
      });
    }
  });

  const settled = await Promise.allSettled(tasks);
  return settled.map((entry, index) => {
    if (entry.status === "fulfilled") {
      return entry.value;
    }
    const planItem = executablePlanItems[index];
    const model = planItem.executionModel;
    return {
      model,
      requestedModel: planItem.requestedModel,
      provider: getProviderByModel(model),
      responseText: "",
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: 0,
      costUsd: 0,
      error: entry.reason instanceof Error ? entry.reason.message : "Falha no processamento"
    };
  });
}
