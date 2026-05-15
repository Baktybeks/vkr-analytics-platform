"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useCurrentUser } from "@/services/authService";
import { canAccessAdmin } from "@/lib/permissions";

const cardClass =
  "group rounded-2xl border border-white/50 bg-white/90 p-6 shadow-2xl shadow-slate-900/15 backdrop-blur-md transition hover:border-[#0d6efd]/50 hover:shadow-blue-500/20";

export default function HomePage() {
  const storeUser = useAuthStore((s) => s.user);
  const { data: sessionUser } = useCurrentUser();
  const user = storeUser ?? sessionUser;

  return (
    <div className="space-y-10">
      <div className="rounded-3xl border border-white/40 bg-white/10 px-6 py-8 shadow-2xl backdrop-blur-md sm:px-10 sm:py-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#bae6fd]">
          Платформа ВКР
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Добро пожаловать
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/85">
          Система учёта тем выпускных квалификационных работ и выявления
          повторяющихся формулировок в пределах кафедры.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/topics"
            className="rounded-full bg-[#0d6efd] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/35 transition hover:bg-[#0b5ed7]"
          >
            К темам ВКР
          </Link>
          {user && canAccessAdmin(user.role) && (
            <Link
              href="/admin/stats"
              className="rounded-full border-2 border-white/70 bg-transparent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Статистика
            </Link>
          )}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/topics" className={cardClass}>
          <h2 className="text-lg font-bold text-slate-900">Темы ВКР</h2>
          <p className="mt-2 text-sm text-slate-600">
            Просмотр и ввод тем, проверка на дубликаты по кафедре.
          </p>
          <span className="mt-4 inline-block text-sm font-semibold text-[#0d6efd] group-hover:underline">
            Перейти →
          </span>
        </Link>
        {user && canAccessAdmin(user.role) && (
          <Link href="/admin/stats" className={cardClass}>
            <h2 className="text-lg font-bold text-slate-900">Статистика</h2>
            <p className="mt-2 text-sm text-slate-600">
              Сводка по кафедрам и темам.
            </p>
            <span className="mt-4 inline-block text-sm font-semibold text-[#0d6efd] group-hover:underline">
              Открыть →
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
