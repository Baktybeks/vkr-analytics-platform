import type { TopicSimilarityMatch, VkrTopicDoc } from "@/types";

export function enrichMatchesFromTopics(
  matches: TopicSimilarityMatch[],
  topics: VkrTopicDoc[]
): TopicSimilarityMatch[] {
  const byId = new Map(topics.map((t) => [t.$id, t]));
  return matches.map((m) => {
    const topic = byId.get(m.topicId);
    if (!topic) return m;
    return {
      ...m,
      title: topic.title,
      studentName: topic.studentName,
      studentGroup: topic.studentGroup,
      supervisorName: topic.supervisorName,
      year: topic.year,
    };
  });
}

export function parseStoredSimilarityMatches(
  json?: string | null
): TopicSimilarityMatch[] {
  if (!json?.trim()) return [];
  try {
    const parsed = JSON.parse(json) as TopicSimilarityMatch[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m) =>
        m &&
        typeof m.topicId === "string" &&
        typeof m.title === "string" &&
        typeof m.similarityPercent === "number"
    );
  } catch {
    return [];
  }
}

export function serializeSimilarityForTopic(matches: TopicSimilarityMatch[]): {
  similarityMaxPercent?: number;
  similarityMatchesJson?: string;
} {
  if (!matches.length) {
    return {};
  }
  const max = Math.max(...matches.map((m) => m.similarityPercent), 0);
  return {
    similarityMaxPercent: max,
    similarityMatchesJson: JSON.stringify(matches),
  };
}
