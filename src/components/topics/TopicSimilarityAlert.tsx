"use client";

import { SimilarityMatchCard } from "@/components/topics/TopicSimilarityPanel";
import type { TopicSimilarityMatch } from "@/types";

export function TopicSimilarityAlert({
  summary,
  matches,
  title = "Похожие темы на кафедре",
}: {
  summary: string | null;
  matches: TopicSimilarityMatch[];
  title?: string;
}) {
  if (!summary && matches.length === 0) return null;

  const isHighRisk = matches.some((m) => m.similarityPercent >= 80);

  return (
    <div
      className={`rounded-xl border p-4 ${
        isHighRisk
          ? "border-amber-400/80 bg-amber-50"
          : "border-sky-200 bg-sky-50/80"
      }`}
    >
      <h3
        className={`text-base font-semibold ${
          isHighRisk ? "text-amber-950" : "text-slate-900"
        }`}
      >
        {title}
      </h3>
      {summary && (
        <p
          className={`mt-2 text-base font-medium ${
            isHighRisk ? "text-amber-900" : "text-slate-800"
          }`}
        >
          {summary}
        </p>
      )}
      {matches.length > 0 && (
        <ul className="mt-3 space-y-2">
          {matches.map((m) => (
            <SimilarityMatchCard key={m.topicId} match={m} />
          ))}
        </ul>
      )}
    </div>
  );
}
