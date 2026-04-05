import { LlmProvider, ProviderRunOutput } from "@/features/comparator/providers/llmProvider";
import { fallbackTokenUsage, getGoogleGenerateContentText, getGoogleGenerateContentUsage } from "@/features/comparator/providers/providerUtils";

async function runGoogle(prompt: string, model: string): Promise<ProviderRunOutput> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY não configurada");
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });

  if (!response.ok) {
    throw new Error(`Google falhou: ${await response.text()}`);
  }

  const data = await response.json();
  const content = getGoogleGenerateContentText(data);
  const usage = getGoogleGenerateContentUsage(data);
  const fallback = fallbackTokenUsage(prompt, content);

  return {
    responseText: content,
    inputTokens: usage.inputTokens ?? fallback.inputTokens,
    outputTokens: usage.outputTokens ?? fallback.outputTokens
  };
}

export const googleProvider: LlmProvider = {
  name: "google",
  models: ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro", "gemini-pro"],
  run: runGoogle
};
