import { normalizeTopicTitle } from "@/lib/normalizeTopicTitle";
import {
  getOpenAIClient,
  getOpenAIModel,
  getSimilarityThreshold,
} from "@/lib/openaiClient";
import { enrichMatchesFromTopics } from "@/lib/topicSimilarityStorage";
import type { TopicSimilarityMatch, VkrTopicDoc } from "@/types";

function tokenize(text: string): Set<string> {
  const n = normalizeTopicTitle(text);
  return new Set(n.split(" ").filter((w) => w.length > 2));
}

function wordOverlapScore(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const w of ta) {
    if (tb.has(w)) inter++;
  }
  return inter / Math.max(ta.size, tb.size);
}

export function prefilterCandidates(
  newTitle: string,
  topics: VkrTopicDoc[],
  excludeTopicId: string | undefined,
  maxCandidates: number
): VkrTopicDoc[] {
  const pool = topics.filter((t) => t.$id !== excludeTopicId);
  if (pool.length <= maxCandidates) return pool;

  const scored = pool.map((t) => ({
    topic: t,
    score: wordOverlapScore(newTitle, t.title),
  }));
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, maxCandidates).map((s) => s.topic);
  if (top.length >= 5) return top;

  return pool.slice(0, maxCandidates);
}

const responseSchema = {
  type: "json_schema" as const,
  json_schema: {
    name: "topic_similarity",
    strict: true,
    schema: {
      type: "object",
      properties: {
        matches: {
          type: "array",
          items: {
            type: "object",
            properties: {
              topicId: { type: "string" },
              similarityPercent: { type: "number" },
              reason: { type: "string" },
            },
            required: ["topicId", "similarityPercent", "reason"],
            additionalProperties: false,
          },
        },
      },
      required: ["matches"],
      additionalProperties: false,
    },
  },
};

export async function checkTopicSimilarityWithAi(params: {
  newTitle: string;
  candidates: VkrTopicDoc[];
  threshold?: number;
}): Promise<{
  matches: TopicSimilarityMatch[];
  summaryMessage: string;
}> {
  const openai = getOpenAIClient();
  if (!openai) {
    throw new Error("OPENAI_API_KEY не настроен на сервере");
  }

  const threshold = params.threshold ?? getSimilarityThreshold();
  const title = params.newTitle.trim();
  if (!title) {
    return {
      matches: [],
      summaryMessage: "Укажите название темы для проверки.",
    };
  }

  if (params.candidates.length === 0) {
    return {
      matches: [],
      summaryMessage:
        "На кафедре пока нет других тем для сравнения — дубликатов не найдено.",
    };
  }

  const candidateList = params.candidates
    .map(
      (t, i) =>
        `${i + 1}. id=${t.$id}\n   «${t.title}»`
    )
    .join("\n");

  const completion = await openai.chat.completions.create({
    model: getOpenAIModel(),
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "Ты помощник кафедры по контролю тем ВКР. Сравни новую формулировку темы с существующими на той же кафедре. Оценивай смысловую близость (синонимы, перефразирование, общая предметная область), не только буквальное совпадение. similarityPercent — целое число 0–100. Включай в ответ только темы с similarityPercent >= порога. reason — одно короткое предложение на русском.",
      },
      {
        role: "user",
        content: `Порог схожести: ${threshold}%.\n\nНовая тема:\n«${title}»\n\nСуществующие темы кафедры:\n${candidateList}`,
      },
    ],
    response_format: responseSchema,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("Пустой ответ от модели");
  }

  const parsed = JSON.parse(raw) as {
    matches: { topicId: string; similarityPercent: number; reason: string }[];
  };

  const byId = new Map(params.candidates.map((t) => [t.$id, t]));
  const matches: TopicSimilarityMatch[] = [];

  for (const m of parsed.matches || []) {
    const topic = byId.get(m.topicId);
    if (!topic) continue;
    const pct = Math.round(Math.min(100, Math.max(0, m.similarityPercent)));
    if (pct < threshold) continue;
    matches.push({
      topicId: m.topicId,
      title: topic.title,
      similarityPercent: pct,
      reason: m.reason?.trim() || "Схожая формулировка",
      studentName: topic.studentName,
      studentGroup: topic.studentGroup,
      supervisorName: topic.supervisorName,
      year: topic.year,
    });
  }

  matches.sort((a, b) => b.similarityPercent - a.similarityPercent);
  const enriched = enrichMatchesFromTopics(matches, params.candidates);

  let summaryMessage: string;
  if (matches.length === 0) {
    summaryMessage =
      "ИИ не нашёл похожих тем на кафедре выше порога схожести. Рекомендуется всё равно проверить формулировку вручную.";
  } else if (matches.some((m) => m.similarityPercent >= 80)) {
    summaryMessage = `Внимание: найдено ${matches.length} похожих тем(ы), возможен дубликат (схожесть ≥ 80%).`;
  } else {
    summaryMessage = `Найдено ${matches.length} тем(ы) с заметной схожестью формулировки.`;
  }

  return { matches: enriched, summaryMessage };
}
