import {
  appendRunLog,
  createCompareRun,
  failCompareRun,
  finalizeCompareRun,
  markRunItemFinished,
  markRunItemStarted
} from "@/features/comparator/domain/compareRunTracker";
import { buildExecutionRuntimeCapabilitiesFromEnv, buildModelExecutionPlan } from "@/features/comparator/domain/modelExecutionService";
import { getPricingSnapshot } from "@/features/comparator/domain/pricingService";
import { getProviderByModel } from "@/features/comparator/providers/llmProvider";
import { runProvidersInParallel } from "@/features/comparator/providers/providerRegistry";
import { compareSchema } from "@/shared/validation/compareSchema";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = compareSchema.parse(body);
    const pricingSnapshot = await getPricingSnapshot(false);
    const runtimeCapabilities = buildExecutionRuntimeCapabilitiesFromEnv(process.env);
    const plan = buildModelExecutionPlan(parsed.selectedModels, runtimeCapabilities, {
      allowFallback: parsed.allowFallback ?? false
    }).filter((item): item is typeof item & { executionModel: string } => Boolean(item.executionModel));

    const runId = createCompareRun(
      plan.map((item) => ({
        requestedModel: item.requestedModel,
        executionModel: item.executionModel,
        provider: getProviderByModel(item.executionModel)
      }))
    );

    void (async () => {
      try {
        const results = await runProvidersInParallel(
          parsed.prompt,
          parsed.selectedModels,
          parsed.mockMode,
          pricingSnapshot.pricing,
          runtimeCapabilities,
          { allowFallback: parsed.allowFallback ?? false },
          {
            onModelStarted: ({ executionModel }) => {
              markRunItemStarted(runId, executionModel);
            },
            onModelFinished: ({ executionModel, error }) => {
              markRunItemFinished(runId, executionModel, error);
            },
            onLog: (message, level = "info") => {
              appendRunLog(runId, level, message);
            }
          }
        );
        finalizeCompareRun(runId, results, {
          source: pricingSnapshot.source,
          updatedAt: pricingSnapshot.updatedAt
        });
      } catch (error) {
        failCompareRun(runId, error instanceof Error ? error.message : "Erro inesperado na execução");
      }
    })();

    appendRunLog(runId, "info", "Pipeline de execução inicializado.");
    return NextResponse.json({ runId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao iniciar comparação" },
      { status: 400 }
    );
  }
}
