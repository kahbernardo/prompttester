import { buildExecutionRuntimeCapabilitiesFromEnv } from "@/features/comparator/domain/modelExecutionService";
import { ProviderAvailability, ProviderDiagnostics, ProviderHealthStatus, ProviderName, RuntimeCapabilities } from "@/shared/types";

export function getProviderAvailabilityFromEnv(): ProviderAvailability {
  return {
    openai: Boolean(process.env.OPENAI_API_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    google: Boolean(process.env.GOOGLE_API_KEY),
    mistral: Boolean(process.env.MISTRAL_API_KEY),
    deepseek: Boolean(process.env.DEEPSEEK_API_KEY),
    xai: Boolean(process.env.XAI_API_KEY),
    meta: Boolean(process.env.OPENROUTER_API_KEY),
    codex: Boolean(process.env.CODEX_API_KEY),
    amazon: Boolean(process.env.OPENROUTER_API_KEY),
    minimax: Boolean(process.env.OPENROUTER_API_KEY),
    moonshot: Boolean(process.env.OPENROUTER_API_KEY),
    qwen: Boolean(process.env.OPENROUTER_API_KEY)
  };
}

let cachedAvailability: ProviderAvailability | null = null;
let cachedDiagnostics: ProviderDiagnostics | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60_000;
const PROBE_TIMEOUT_MS = 2500;

async function probe(url: string, init: RequestInit): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function getProviderAvailabilityWithHealth(forceRefresh = false): Promise<ProviderAvailability> {
  const result = await getProviderAvailabilitySnapshot(forceRefresh);
  return result.availability;
}

function nowIso(): string {
  return new Date().toISOString();
}

function makeDiagnosticsByAvailability(availability: ProviderAvailability): ProviderDiagnostics {
  const checkedAt = nowIso();
  return (Object.keys(availability) as ProviderName[]).reduce((acc, provider) => {
    const status: ProviderHealthStatus = availability[provider] ? "ok" : "missingKey";
    acc[provider] = { status, checkedAt };
    return acc;
  }, {} as ProviderDiagnostics);
}

function setProviderStatus(
  diagnostics: ProviderDiagnostics,
  provider: ProviderName,
  status: ProviderHealthStatus
): void {
  diagnostics[provider] = {
    status,
    checkedAt: nowIso()
  };
}

export async function getProviderAvailabilitySnapshot(
  forceRefresh = false
): Promise<{ availability: ProviderAvailability; diagnostics: ProviderDiagnostics; runtimeCapabilities: RuntimeCapabilities }> {
  const runtimeCapabilities = buildExecutionRuntimeCapabilitiesFromEnv(process.env);
  if (!forceRefresh && cachedAvailability && cachedDiagnostics && Date.now() - cachedAt < CACHE_TTL_MS) {
    return { availability: cachedAvailability, diagnostics: cachedDiagnostics, runtimeCapabilities };
  }

  const availability = getProviderAvailabilityFromEnv();
  const next: ProviderAvailability = { ...availability };
  const diagnostics = makeDiagnosticsByAvailability(availability);

  if (availability.openai) {
    next.openai = await probe("https://api.openai.com/v1/models", {
      method: "GET",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
    });
    setProviderStatus(diagnostics, "openai", next.openai ? "ok" : "unreachable");
  }

  if (availability.codex) {
    next.codex = await probe("https://api.openai.com/v1/models", {
      method: "GET",
      headers: { Authorization: `Bearer ${process.env.CODEX_API_KEY}` }
    });
    setProviderStatus(diagnostics, "codex", next.codex ? "ok" : "unreachable");
  }

  if (availability.google) {
    next.google = await probe(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_API_KEY}`, {
      method: "GET"
    });
    setProviderStatus(diagnostics, "google", next.google ? "ok" : "unreachable");
  }

  if (availability.mistral) {
    next.mistral = await probe("https://api.mistral.ai/v1/models", {
      method: "GET",
      headers: { Authorization: `Bearer ${process.env.MISTRAL_API_KEY}` }
    });
    setProviderStatus(diagnostics, "mistral", next.mistral ? "ok" : "unreachable");
  }

  if (availability.deepseek) {
    next.deepseek = await probe("https://api.deepseek.com/models", {
      method: "GET",
      headers: { Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` }
    });
    setProviderStatus(diagnostics, "deepseek", next.deepseek ? "ok" : "unreachable");
  }

  if (availability.xai) {
    next.xai = await probe("https://api.x.ai/v1/models", {
      method: "GET",
      headers: { Authorization: `Bearer ${process.env.XAI_API_KEY}` }
    });
    setProviderStatus(diagnostics, "xai", next.xai ? "ok" : "unreachable");
  }

  const openRouterDependentEnabled =
    availability.meta || availability.amazon || availability.minimax || availability.moonshot || availability.qwen;
  if (openRouterDependentEnabled) {
    const openRouterHealthy = await probe("https://openrouter.ai/api/v1/models", {
      method: "GET",
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` }
    });
    next.meta = availability.meta && openRouterHealthy;
    next.amazon = availability.amazon && openRouterHealthy;
    next.minimax = availability.minimax && openRouterHealthy;
    next.moonshot = availability.moonshot && openRouterHealthy;
    next.qwen = availability.qwen && openRouterHealthy;
    if (availability.meta) setProviderStatus(diagnostics, "meta", next.meta ? "ok" : "unreachable");
    if (availability.amazon) setProviderStatus(diagnostics, "amazon", next.amazon ? "ok" : "unreachable");
    if (availability.minimax) setProviderStatus(diagnostics, "minimax", next.minimax ? "ok" : "unreachable");
    if (availability.moonshot) setProviderStatus(diagnostics, "moonshot", next.moonshot ? "ok" : "unreachable");
    if (availability.qwen) setProviderStatus(diagnostics, "qwen", next.qwen ? "ok" : "unreachable");
  }

  cachedAvailability = next;
  cachedDiagnostics = diagnostics;
  cachedAt = Date.now();
  return { availability: next, diagnostics, runtimeCapabilities };
}
