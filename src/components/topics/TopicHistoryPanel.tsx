"use client";

import { useQuery } from "@tanstack/react-query";
import { appwriteApiFetch } from "@/lib/appwriteApiFetch";
import type { TopicAuditDoc } from "@/types";

const ACTION_LABEL: Record<string, string> = {
  create: "Создание",
  update: "Изменение",
  delete: "Удаление",
};

function formatChanges(changes?: string): string {
  if (!changes) return "—";
  try {
    const parsed = JSON.parse(changes) as
      | { field: string; from?: string | null; to?: string | null }[]
      | { snapshot?: Record<string, unknown> };
    if (Array.isArray(parsed)) {
      return parsed
        .map(
          (c) =>
            `${c.field}: ${c.from ?? "—"} → ${c.to ?? "—"}`
        )
        .join("; ");
    }
    if (parsed.snapshot?.title) {
      return `Тема: «${String(parsed.snapshot.title)}»`;
    }
    return changes;
  } catch {
    return changes;
  }
}

export function TopicHistoryPanel({ topicId }: { topicId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["topic-history", topicId],
    queryFn: async () => {
      const res = await appwriteApiFetch(`/api/topics/${topicId}/history`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error || "Ошибка загрузки истории");
      }
      const data = (await res.json()) as { documents: TopicAuditDoc[] };
      return data;
    },
  });

  const rows = data?.documents ?? [];

  if (isLoading) {
    return <p className="mt-2 text-base text-slate-500">Загрузка истории…</p>;
  }
  if (error) {
    return (
      <p className="mt-2 text-base text-red-600">
        {(error as Error).message}
      </p>
    );
  }
  if (rows.length === 0) {
    return <p className="mt-2 text-base text-slate-500">Записей пока нет.</p>;
  }

  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200/80 bg-slate-50/80 p-3">
      <table className="w-full min-w-[32rem] text-left text-base">
        <thead>
          <tr className="text-slate-600">
            <th className="pb-2 pr-3 font-semibold">Дата</th>
            <th className="pb-2 pr-3 font-semibold">Пользователь</th>
            <th className="pb-2 pr-3 font-semibold">Действие</th>
            <th className="pb-2 font-semibold">Изменения</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.$id} className="border-t border-slate-200/60 text-slate-800">
              <td className="py-2 pr-3 whitespace-nowrap">
                {new Date(r.createdAt).toLocaleString("ru-RU")}
              </td>
              <td className="py-2 pr-3">{r.userName}</td>
              <td className="py-2 pr-3">
                {ACTION_LABEL[r.action] ?? r.action}
              </td>
              <td className="py-2">{formatChanges(r.changes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
