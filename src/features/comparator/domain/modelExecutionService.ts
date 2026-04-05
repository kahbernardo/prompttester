import { getProviderFallbackModel, resolveCompatibleModel } from "@/features/comparator/providers/modelCompatibility";
import { getProviderByModel } from "@/features/comparator/providers/llmProvider";

export type ToolCapability = "webSearch" | "fileSearch" | "mcp";
export type ModelExecutionConstraint = "requiresExternalTools";

export type ExecutionRuntimeCapabilities = {
  webSearch: boolean;
  fileSearch: boolean;
  mcp: boolean;
};

export type ModelExecutionPlanItem = {
  requestedModel: string;
  executionModel: string | null;
  constraint: ModelExecutionConstraint | null;
  requiredCapabilities: ToolCapability[];
  usesFallback: boolean;
  reason:
    | "directExecution"
    | "toolRuntimeAvailable"
    | "fallbackApplied"
    | "missingToolRuntimeAndFallback";
};

export type ExecutionPlanOptions = {
  allowFallback?: boolean;
};

type ExecutionRule = {
  matcher: RegExp;
  constraint: ModelExecutionConstraint;
  requiredCapabilities: ToolCapability[];
};

const executionRules: ExecutionRule[] = [
  {
    matcher: /deep-?research/i,
    constraint: "requiresExternalTools",
    requiredCapabilities: ["webSearch", "fileSearch", "mcp"]
  }
];

export function getDefaultExecutionRuntimeCapabilities(): ExecutionRuntimeCapabilities {
  return {
    webSearch: false,
    fileSearch: false,
    mcp: false
  };
}

function isTruthyFlag(value: string | undefined): boolean {
  return /^(1|true|yes|on)$/i.test(String(value ?? ""));
}

export function buildExecutionRuntimeCapabilitiesFromEnv(env: Record<string, string | undefined>): ExecutionRuntimeCapabilities {
  return {
    webSearch: isTruthyFlag(env.COMPARE_ENABLE_WEB_SEARCH),
    fileSearch: isTruthyFlag(env.COMPARE_ENABLE_FILE_SEARCH),
    mcp: isTruthyFlag(env.COMPARE_ENABLE_MCP)
  };
}

function resolveExecutionRule(model: string): ExecutionRule | null {
  return executionRules.find((rule) => rule.matcher.test(model)) ?? null;
}

function hasAnyRequiredCapability(
  requiredCapabilities: ToolCapability[],
  runtimeCapabilities: ExecutionRuntimeCapabilities
): boolean {
  if (requiredCapabilities.length === 0) return true;
  return requiredCapabilities.some((capability) => runtimeCapabilities[capability]);
}

export function getModelExecutionConstraint(model: string): ModelExecutionConstraint | null {
  return resolveExecutionRule(model)?.constraint ?? null;
}

export function getModelRequiredCapabilities(model: string): ToolCapability[] {
  return resolveExecutionRule(model)?.requiredCapabilities ?? [];
}

export function isModelSupportedForDirectExecution(model: string): boolean {
  return getModelExecutionConstraint(model) === null;
}

export function filterDirectExecutionModels(models: string[]): string[] {
  return models.filter((model) => isModelSupportedForDirectExecution(model));
}

function resolveFallbackModel(requestedModel: string): string | null {
  const provider = getProviderByModel(requestedModel);
  const providerFallback = getProviderFallbackModel(provider);
  if (!providerFallback) return null;
  const compatibleFallback = resolveCompatibleModel(provider, providerFallback);
  return isModelSupportedForDirectExecution(compatibleFallback) ? compatibleFallback : null;
}

export function buildModelExecutionPlan(
  requestedModels: string[],
  runtimeCapabilities: ExecutionRuntimeCapabilities,
  options: ExecutionPlanOptions = {}
): ModelExecutionPlanItem[] {
  const allowFallback = options.allowFallback ?? true;
  return requestedModels.map((requestedModel) => {
    const rule = resolveExecutionRule(requestedModel);
    if (!rule) {
      return {
        requestedModel,
        executionModel: requestedModel,
        constraint: null,
        requiredCapabilities: [],
        usesFallback: false,
        reason: "directExecution"
      };
    }

    if (hasAnyRequiredCapability(rule.requiredCapabilities, runtimeCapabilities)) {
      return {
        requestedModel,
        executionModel: requestedModel,
        constraint: rule.constraint,
        requiredCapabilities: rule.requiredCapabilities,
        usesFallback: false,
        reason: "toolRuntimeAvailable"
      };
    }

    const fallbackModel = allowFallback ? resolveFallbackModel(requestedModel) : null;
    if (fallbackModel) {
      return {
        requestedModel,
        executionModel: fallbackModel,
        constraint: rule.constraint,
        requiredCapabilities: rule.requiredCapabilities,
        usesFallback: true,
        reason: "fallbackApplied"
      };
    }

    return {
      requestedModel,
      executionModel: null,
      constraint: rule.constraint,
      requiredCapabilities: rule.requiredCapabilities,
      usesFallback: false,
      reason: "missingToolRuntimeAndFallback"
    };
  });
}
