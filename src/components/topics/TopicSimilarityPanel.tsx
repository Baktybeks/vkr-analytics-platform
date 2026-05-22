"use client";

import {
  enrichMatchesFromTopics,
  parseStoredSimilarityMatches,
} from "@/lib/topicSimilarityStorage";
import type { TopicSimilarityMatch, VkrTopicDoc } from "@/types";

function badgeClass(percent: number): string {
  if (percent >= 80) return "bg-red-100 text-red-800 border-red-200";
  if (percent >= 60) return "bg-amber-100 text-amber-900 border-amber-200";
  return "bg-sky-100 text-sky-900 border-sky-200";
}

function formatMatchMeta(m: TopicSimilarityMatch): string | null {
  const parts: string[] = [];
  if (m.studentName?.trim()) parts.push(m.studentName.trim());
  if (m.studentGroup?.trim()) parts.push(`гр. ${m.studentGroup.trim()}`);
  if (m.year?.trim()) parts.push(`выпуск ${m.year.trim()}`);
  if (m.supervisorName?.trim()) parts.push(`рук. ${m.supervisorName.trim()}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function SimilarityMatchCard({ match }: { match: TopicSimilarityMatch }) {
  const meta = formatMatchMeta(match);
  return (
    <li
      className={`rounded-lg border px-3 py-2 text-base ${badgeClass(match.similarityPercent)}`}
    >
      <span className="font-bold">{match.similarityPercent}%</span> — «{match.title}»
      {meta && (
        <p className="mt-1.5 text-sm font-medium opacity-95">{meta}</p>
      )}
      <p className="mt-1 text-sm opacity-90">{match.reason}</p>
    </li>
  );
}

export function TopicSimilarityBadge({ topic }: { topic: VkrTopicDoc }) {
  const max = topic.similarityMaxPercent;
  if (max === undefined || max === null || max <= 0) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-semibold ${badgeClass(max)}`}
      title="Максимальная схожесть с другими темами при добавлении"
    >
      Схожесть: {max}%
    </span>
  );
}

export function TopicSimilarityPanel({
  topic,
  allTopics,
}: {
  topic: VkrTopicDoc;
  allTopics?: VkrTopicDoc[];
}) {
  let matches = parseStoredSimilarityMatches(topic.similarityMatchesJson);
  if (allTopics?.length) {
    matches = enrichMatchesFromTopics(matches, allTopics);
  }

  if (!matches.length) {
    return (
      <p className="mt-2 text-base text-slate-500">
        Похожих тем при сохранении не зафиксировано (или проверка ИИ не выполнялась).
      </p>
    );
  }

  return (
    <ul className="mt-3 space-y-2">
      {matches.map((m) => (
        <SimilarityMatchCard key={m.topicId} match={m} />
      ))}
    </ul>
  );
}
