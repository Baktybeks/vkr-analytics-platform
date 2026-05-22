"use client";

import { useQuery } from "@tanstack/react-query";
import { appwriteApiFetch } from "@/lib/appwriteApiFetch";
import { formatAuditChanges } from "@/lib/topicAuditFormat";
import type { TopicAuditDoc } from "@/types";

const ACTION_LABEL: Record<string, string> = {
  create: "Создал",
  update: "Изменил",
  delete: "Удалил",
};

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
    return (
      <p className="mt-2 text-base text-slate-500">
        История изменений пока пуста.
      </p>
    );
  }

  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200/80 bg-slate-50/80 p-3">
      <table className="w-full min-w-[36rem] text-left text-base">
        <thead>
          <tr className="text-slate-600">
            <th className="pb-2 pr-3 font-semibold">Когда</th>
            <th className="pb-2 pr-3 font-semibold">Кто</th>
            <th className="pb-2 pr-3 font-semibold">Действие</th>
            <th className="pb-2 font-semibold">Что изменилось</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.$id}
              className="border-t border-slate-200/60 text-slate-800"
            >
              <td className="py-2.5 pr-3 whitespace-nowrap align-top">
                {new Date(r.createdAt).toLocaleString("ru-RU", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td className="py-2.5 pr-3 align-top font-medium">
                {r.userName || "—"}
              </td>
              <td className="py-2.5 pr-3 align-top">
                <span
                  className={
                    r.action === "update"
                      ? "font-semibold text-[#0d6efd]"
                      : r.action === "create"
                        ? "font-semibold text-emerald-700"
                        : "font-semibold text-red-700"
                  }
                >
                  {ACTION_LABEL[r.action] ?? r.action}
                </span>
              </td>
              <td className="py-2.5 align-top text-slate-700">
                {formatAuditChanges(r.changes)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
