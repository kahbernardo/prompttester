import { PricingMap } from "@/shared/types";

export const pricingConfig: PricingMap = {
  "gpt-4.1": { input: 0.002, output: 0.008 },
  "gpt-4.1-mini": { input: 0.0004, output: 0.0016 },
  "gpt-4.1-nano": { input: 0.0001, output: 0.0004 },
  "gpt-4o": { input: 0.005, output: 0.015 },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "claude-3-5-sonnet-latest": { input: 0.003, output: 0.015 },
  "gemini-2.0-flash": { input: 0.0001, output: 0.0004 }
};

export function calculateCostUsdFromMap(model: string, inputTokens: number, outputTokens: number, map: PricingMap): number {
  const price = map[model] ?? { input: 0.0002, output: 0.0008 };
  const inputCost = (inputTokens / 1000) * price.input;
  const outputCost = (outputTokens / 1000) * price.output;
  return Number((inputCost + outputCost).toFixed(8));
}

export function calculateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  return calculateCostUsdFromMap(model, inputTokens, outputTokens, pricingConfig);
}
