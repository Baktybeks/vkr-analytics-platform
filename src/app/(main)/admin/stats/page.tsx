"use client";

import { useMemo } from "react";
import { appwriteApiFetch } from "@/lib/appwriteApiFetch";
import { useQuery } from "@tanstack/react-query";
import { useDepartments } from "@/services/departmentsService";
import type { VkrTopicDoc } from "@/types";
import type { ProfileDoc } from "@/types";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await appwriteApiFetch(url, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Ошибка загрузки данных");
  return res.json();
}

export default function StatsPage() {
  const { data: departments = [] } = useDepartments();

  const { data: topicsRes } = useQuery({
    queryKey: ["stats", "topics"],
    queryFn: () =>
      fetchJson<{ documents: VkrTopicDoc[]; total: number }>("/api/topics"),
  });

  const { data: operatorsRes } = useQuery({
    queryKey: ["stats", "operators"],
    queryFn: () =>
      fetchJson<{ documents: ProfileDoc[] }>("/api/admin/operators"),
  });

  const topics = useMemo(
    () => topicsRes?.documents ?? [],
    [topicsRes?.documents]
  );
  const operators = useMemo(
    () => operatorsRes?.documents ?? [],
    [operatorsRes?.documents]
  );

  const byDept = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of topics) {
      map.set(t.departmentId, (map.get(t.departmentId) || 0) + 1);
    }
    return map;
  }, [topics]);

  const byMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of topics) {
      const d = new Date(t.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [topics]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm">
          Статистика
        </h1>
        <p className="mt-2 text-sm text-white/85">
          Сводные показатели по темам ВКР и операторам.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/50 bg-white/90 p-5 shadow-2xl shadow-slate-900/15 backdrop-blur-md">
          <p className="text-sm text-slate-500">Всего тем</p>
          <p className="text-2xl font-semibold text-slate-900">
            {topicsRes?.total ?? topics.length}
          </p>
        </div>
        <div className="rounded-2xl border border-white/50 bg-white/90 p-5 shadow-2xl shadow-slate-900/15 backdrop-blur-md">
          <p className="text-sm text-slate-500">Кафедр в справочнике</p>
          <p className="text-2xl font-semibold text-slate-900">
            {departments.length}
          </p>
        </div>
        <div className="rounded-2xl border border-white/50 bg-white/90 p-5 shadow-2xl shadow-slate-900/15 backdrop-blur-md">
          <p className="text-sm text-slate-500">Операторов</p>
          <p className="text-2xl font-semibold text-slate-900">
            {operators.length}
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-white/50 bg-white/90 p-5 shadow-2xl shadow-slate-900/15 backdrop-blur-md">
        <h2 className="text-lg font-semibold text-slate-900">Темы по кафедрам</h2>
        <ul className="mt-3 space-y-2">
          {departments.map((d) => (
            <li
              key={d.$id}
              className="flex justify-between border-b border-neutral-100 py-1 text-sm"
            >
              <span>{d.name}</span>
              <span className="font-medium">{byDept.get(d.$id) ?? 0}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-white/50 bg-white/90 p-5 shadow-2xl shadow-slate-900/15 backdrop-blur-md">
        <h2 className="text-lg font-semibold text-slate-900">Новые темы по месяцам</h2>
        <ul className="mt-3 space-y-2">
          {byMonth.map(([m, c]) => (
            <li
              key={m}
              className="flex justify-between border-b border-neutral-100 py-1 text-sm"
            >
              <span>{m}</span>
              <span className="font-medium">{c}</span>
            </li>
          ))}
          {byMonth.length === 0 && (
            <p className="text-sm text-slate-500">Нет данных.</p>
          )}
        </ul>
      </section>
    </div>
  );
}
