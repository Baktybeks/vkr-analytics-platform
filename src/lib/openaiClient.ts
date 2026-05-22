import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  if (!client) {
    client = new OpenAI({ apiKey: key });
  }
  return client;
}

export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";
}

export function getSimilarityThreshold(): number {
  const n = Number(process.env.OPENAI_SIMILARITY_THRESHOLD ?? 40);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 40;
}
