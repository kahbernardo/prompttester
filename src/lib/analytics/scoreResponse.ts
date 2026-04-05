import { classifyResponse } from "@/lib/analytics/classifyResponse";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function triangularScore(value: number, min: number, idealLow: number, idealHigh: number, max: number): number {
  if (value < min || value > max) return 0;
  if (value >= idealLow && value <= idealHigh) return 1;
  if (value < idealLow) return (value - min) / (idealLow - min);
  return (max - value) / (max - idealHigh);
}

export function scoreResponse(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;

  const charCount = trimmed.length;
  const words = trimmed.split(/\s+/).filter(Boolean).length;
  const baseLength = triangularScore(charCount, 40, 220, 2600, 7000);

  const headingCount = (trimmed.match(/^#{1,4}\s+/gm) ?? []).length;
  const sectionCount = (trimmed.match(/^[A-Z][\w\s]{2,}:\s*$/gm) ?? []).length;
  const bulletCount = (trimmed.match(/^\s*([-*]|\d+\.)\s+/gm) ?? []).length;
  const codeBlocks = (trimmed.match(/```[\s\S]*?```/g) ?? []).length;

  const responseType = classifyResponse(trimmed);
  const structureRaw =
    headingCount * 0.14 +
    sectionCount * 0.12 +
    bulletCount * 0.08 +
    codeBlocks * 0.2 +
    (responseType === "explanation" ? 0.18 : responseType === "list" ? 0.2 : responseType === "code" ? 0.24 : 0.1);
  const structureScore = clamp(structureRaw, 0, 1);

  const sanityPatterns = [
    /as an ai language model/i,
    /i cannot browse/i,
    /i can'?t access real[- ]time/i,
    /i do not have internet access/i,
    /hallucinat/i,
    /lorem ipsum/i
  ];
  const sanityHits = sanityPatterns.reduce((acc, pattern) => acc + (pattern.test(trimmed) ? 1 : 0), 0);
  const repetitionPenalty = words > 40 ? clamp((words - new Set(trimmed.toLowerCase().split(/\W+/).filter(Boolean)).size) / words, 0, 0.25) : 0;
  const sanityScore = clamp(1 - sanityHits * 0.18 - repetitionPenalty, 0, 1);

  const finalScore = 10 * (baseLength * 0.38 + structureScore * 0.38 + sanityScore * 0.24);
  return Number(clamp(finalScore, 0, 10).toFixed(2));
}
