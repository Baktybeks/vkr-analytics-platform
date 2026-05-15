"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLogin } from "@/services/authService";
import { toast } from "react-toastify";

import { TechHeroAside } from "@/components/marketing/TechHeroAside";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registerOpen, setRegisterOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/bootstrap/has-admin", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const body = (await res.json()) as { hasAdmin?: boolean };
        if (!cancelled) setRegisterOpen(body.hasAdmin !== true);
      } catch {
        if (!cancelled) setRegisterOpen(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate(
      { email, password },
      {
        onSuccess: () => {
          toast.success("Вход выполнен");
          const r = search.get("redirect") || "/";
          router.push(r);
        },
        onError: (err: Error) => toast.error(err.message || "Ошибка входа"),
      }
    );
  };

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-slate-200/90 bg-white/95 px-4 py-2.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0d6efd] focus:ring-2 focus:ring-[#0d6efd]/25";

  return (
    <div className="relative z-10 flex min-h-screen flex-col px-4 py-10 lg:py-16">
      <div className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-10 lg:grid-cols-2 lg:gap-14">
        <TechHeroAside
          kicker="IT-решение"
          title={
            <>
              Контроль
              <br />
              <span className="text-[#7ecbff]">уникальности тем</span>
            </>
          }
          description="Учёт выпускных квалификационных работ по кафедрам и выявление повторов формулировок."
        />
        <div className="w-full max-w-md justify-self-center lg:justify-self-end">
          <div className="rounded-3xl border border-white/45 bg-white/92 p-8 shadow-2xl shadow-slate-900/20 backdrop-blur-xl sm:p-10">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Вход
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Учёт тем ВКР и контроль повторяемости
            </p>
            <form className="mt-8 space-y-5" onSubmit={onSubmit}>
              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  required
                  className={inputClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Пароль
                </label>
                <input
                  type="password"
                  required
                  className={inputClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={login.isPending}
                className="w-full rounded-full bg-[#0d6efd] py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-[#0b5ed7] disabled:opacity-60"
              >
                {login.isPending ? "Вход…" : "Войти"}
              </button>
            </form>
            {registerOpen && (
              <p className="mt-6 text-center text-sm text-slate-600">
                Первый администратор?{" "}
                <Link
                  href="/register"
                  className="font-semibold text-[#0d6efd] hover:underline"
                >
                  Регистрация
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
