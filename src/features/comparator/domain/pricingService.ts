import { pricingConfig } from "@/features/comparator/domain/pricingConfig";
import { PricingMap, PricingSource } from "@/shared/types";

type PricingSnapshot = {
  pricing: PricingMap;
  source: PricingSource;
  updatedAt: string;
};

let pricingCache: PricingSnapshot | null = null;
let expiresAt = 0;

function getTtlMs(): number {
  const envValue = Number(process.env.PRICING_CACHE_TTL_MS ?? "900000");
  return Number.isFinite(envValue) && envValue > 0 ? envValue : 900000;
}

type LlmPricesItem = {
  id: string;
  input: number;
  output: number;
  vendor?: string;
};

function parseLlmPricesCatalog(payload: unknown): PricingSnapshot | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const rawPrices = (payload as { prices?: unknown; models?: unknown }).prices ?? (payload as { models?: unknown }).models;
  if (!Array.isArray(rawPrices)) {
    return null;
  }
  const nextPricing: PricingMap = {};
  rawPrices.forEach((entry) => {
    const item = entry as LlmPricesItem;
    if (!item?.id || typeof item.input !== "number" || typeof item.output !== "number") {
      return;
    }
    nextPricing[item.id] = { input: item.input / 1000, output: item.output / 1000 };
  });
  if (Object.keys(nextPricing).length === 0) {
    return null;
  }
  return {
    pricing: nextPricing,
    source: "live",
    updatedAt: new Date().toISOString()
  };
}

async function fetchRemotePricing(): Promise<PricingSnapshot | null> {
  const url = process.env.PRICING_CATALOG_URL ?? "https://www.llm-prices.com/current-v1.json";
  if (!url) {
    return null;
  }
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    return null;
  }
  const json = await response.json();
  return parseLlmPricesCatalog(json);
}

export async function getPricingSnapshot(forceRefresh = false): Promise<PricingSnapshot> {
  const now = Date.now();
  if (!forceRefresh && pricingCache && now < expiresAt) {
    return pricingCache;
  }

  try {
    const remote = await fetchRemotePricing();
    if (remote) {
      pricingCache = remote;
      expiresAt = now + getTtlMs();
      return remote;
    }
  } catch {}

  const fallback: PricingSnapshot = {
    pricing: pricingConfig,
    source: "fallback",
    updatedAt: new Date().toISOString()
  };
  pricingCache = fallback;
  expiresAt = now + getTtlMs();
  return fallback;
}
