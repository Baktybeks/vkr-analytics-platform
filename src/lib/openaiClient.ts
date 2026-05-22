import OpenAI from "openai";

let client: OpenAI | null = null;

/** Читает ключ OpenAI (только сервер). Убирает кавычки — частая ошибка в Vercel UI. */
export function readOpenAIApiKey(): string | undefined {
  const raw = process.env.OPENAI_API_KEY?.trim();
  if (!raw) return undefined;

  let key = raw;
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  return key.length > 0 ? key : undefined;
}

export function isOpenAIConfigured(): boolean {
  return !!readOpenAIApiKey();
}

export function getOpenAIClient(): OpenAI | null {
  const key = readOpenAIApiKey();
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

export const OPENAI_SETUP_HINT =
  "Добавьте OPENAI_API_KEY в переменные окружения (локально: .env.local; на Vercel: Project → Settings → Environment Variables → Production → Redeploy).";
