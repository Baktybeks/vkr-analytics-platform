"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useCurrentUser, useLogout } from "@/services/authService";
import { canAccessAdmin, canManageTopics } from "@/lib/permissions";

const mainLinks = [{ href: "/", label: "Главная" }];

const navPill = (active: boolean) =>
  `rounded-full px-4 py-2 text-sm font-medium transition ${
    active
      ? "bg-[#0d6efd] text-white shadow-lg shadow-blue-600/35"
      : "text-white/90 hover:bg-white/10"
  }`;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const storeUser = useAuthStore((s) => s.user);
  const { data: sessionUser, isLoading } = useCurrentUser();
  const user = storeUser ?? sessionUser ?? null;
  const logout = useLogout();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading && !user) {
    return (
      <div className="relative z-10 flex min-h-screen items-center justify-center">
        <p className="text-lg text-white/80">Загрузка…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative z-10 flex min-h-screen items-center justify-center">
        <p className="text-lg text-white/80">Переход на страницу входа…</p>
      </div>
    );
  }

  const showTopics = canManageTopics(user.role);
  const showAdmin = canAccessAdmin(user.role);

  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-white/15 bg-slate-950/30 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0d6efd] text-xs font-black tracking-tight text-white shadow-lg shadow-blue-500/40"
              aria-hidden
            >
              ВК
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">
                Платформа
              </p>
              <p className="text-sm font-bold leading-tight text-white">
                Учёт тем ВКР
              </p>
            </div>
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            {mainLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={navPill(pathname === l.href)}
              >
                {l.label}
              </Link>
            ))}
            {showTopics && (
              <Link href="/topics" className={navPill(pathname === "/topics")}>
                Темы ВКР
              </Link>
            )}
            {showAdmin && (
              <>
                <Link
                  href="/admin/departments"
                  className={navPill(
                    pathname.startsWith("/admin/departments")
                  )}
                >
                  Кафедры
                </Link>
                <Link
                  href="/admin/operators"
                  className={navPill(
                    pathname.startsWith("/admin/operators")
                  )}
                >
                  Операторы
                </Link>
                <Link
                  href="/admin/stats"
                  className={navPill(pathname.startsWith("/admin/stats"))}
                >
                  Статистика
                </Link>
              </>
            )}
          </nav>
          <div className="flex items-center gap-3">
            <span className="max-w-[10rem] truncate text-sm text-white/90">
              {user.name}
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/95">
              {user.role}
            </span>
            <button
              type="button"
              className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
              onClick={() => logout.mutate()}
            >
              Выход
            </button>
          </div>
        </div>
      </header>
      <main className="relative mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
