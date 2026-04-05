import { ResponseClassification } from "@/lib/analytics/types";

export function classifyResponse(text: string): ResponseClassification {
  const trimmed = text.trim();
  if (!trimmed) return "short answer";

  const words = trimmed.split(/\s+/).filter(Boolean).length;
  const hasCodeFence = /```[\s\S]*?```/.test(trimmed);
  const hasInlineCode = /`[^`]+`/.test(trimmed);
  if (hasCodeFence || hasInlineCode) return "code";

  const bulletCount = (trimmed.match(/^\s*([-*]|\d+\.)\s+/gm) ?? []).length;
  if (bulletCount >= 2) return "list";

  if (words <= 24) return "short answer";
  return "explanation";
}
