import { buildExecutionRuntimeCapabilitiesFromEnv } from "@/features/comparator/domain/modelExecutionService";
import { getPricingSnapshot } from "@/features/comparator/domain/pricingService";
import { runProvidersInParallel } from "@/features/comparator/providers/providerRegistry";
import { compareSchema } from "@/shared/validation/compareSchema";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = compareSchema.parse(body);
    const pricingSnapshot = await getPricingSnapshot(false);
    const runtimeCapabilities = buildExecutionRuntimeCapabilitiesFromEnv(process.env);
    const results = await runProvidersInParallel(
      parsed.prompt,
      parsed.selectedModels,
      parsed.mockMode,
      pricingSnapshot.pricing,
      runtimeCapabilities,
      { allowFallback: parsed.allowFallback ?? false }
    );
    return NextResponse.json({
      results,
      timestamp: new Date().toISOString(),
      pricingMeta: { source: pricingSnapshot.source, updatedAt: pricingSnapshot.updatedAt }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao comparar modelos" },
      { status: 400 }
    );
  }
}
