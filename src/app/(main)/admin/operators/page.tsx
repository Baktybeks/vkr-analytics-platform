"use client";

import { useState } from "react";
import { appwriteApiFetch } from "@/lib/appwriteApiFetch";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDepartments } from "@/services/departmentsService";
import type { ProfileDoc } from "@/types";
import { toast } from "react-toastify";

type OperatorRow = ProfileDoc;

async function fetchOperators(): Promise<{ documents: OperatorRow[] }> {
  const res = await appwriteApiFetch("/api/admin/operators", {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(b.error || "Ошибка загрузки");
  }
  return res.json();
}

export default function OperatorsPage() {
  const qc = useQueryClient();
  const { data: departments = [] } = useDepartments();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "operators"],
    queryFn: fetchOperators,
  });

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  const deptName = (id: string) =>
    departments.find((d) => d.$id === id)?.name || id;

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await appwriteApiFetch("/api/admin/operators", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          departmentId,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { error?: string }).error || "Ошибка");
      toast.success("Оператор создан");
      setFullName("");
      setEmail("");
      setPassword("");
      setDepartmentId("");
      qc.invalidateQueries({ queryKey: ["admin", "operators"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка");
    }
  };

  const rows = data?.documents ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm">
          Операторы
        </h1>
        <p className="mt-2 text-sm text-white/85">
          Создание учётной записи оператора с привязкой к кафедре.
        </p>
      </div>

      <form
        onSubmit={create}
        className="rounded-2xl border border-white/50 bg-white/90 p-5 shadow-2xl shadow-slate-900/15 backdrop-blur-md"
      >
        <h2 className="text-lg font-semibold text-slate-900">Новый оператор</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-sm font-semibold text-slate-700">ФИО</label>
            <input
              required
              className="mt-1 w-full rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2.5 text-slate-900 outline-none focus:border-[#0d6efd] focus:ring-2 focus:ring-[#0d6efd]/20"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Email</label>
            <input
              type="email"
              required
              className="mt-1 w-full rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2.5 text-slate-900 outline-none focus:border-[#0d6efd] focus:ring-2 focus:ring-[#0d6efd]/20"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">
              Пароль (≥ 8 символов)
            </label>
            <input
              type="password"
              required
              minLength={8}
              className="mt-1 w-full rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2.5 text-slate-900 outline-none focus:border-[#0d6efd] focus:ring-2 focus:ring-[#0d6efd]/20"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-semibold text-slate-700">
              Кафедра
            </label>
            <select
              required
              className="mt-1 block w-full max-w-md rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2.5 text-slate-900 outline-none focus:border-[#0d6efd] focus:ring-2 focus:ring-[#0d6efd]/20"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">Выберите кафедру</option>
              {departments.map((d) => (
                <option key={d.$id} value={d.$id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="submit"
          className="mt-4 rounded-full bg-[#0d6efd] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-[#0b5ed7]"
        >
          Создать оператора
        </button>
      </form>

      <section>
        <h2 className="text-lg font-semibold text-white drop-shadow-sm">
          Список операторов
        </h2>
        {isLoading && (
          <p className="mt-2 text-sm text-slate-500">Загрузка…</p>
        )}
        {error && (
          <p className="mt-2 text-sm text-red-600">
            {(error as Error).message}
          </p>
        )}
        <ul className="mt-3 divide-y divide-slate-200/80 rounded-2xl border border-white/50 bg-white/90 shadow-xl backdrop-blur-md">
          {rows.map((p) => (
            <li key={p.$id} className="px-4 py-3">
              <p className="font-medium text-slate-900">{p.fullName}</p>
              <p className="text-xs text-slate-500">
                userId: {p.userId} · {deptName(p.departmentId || "")}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
