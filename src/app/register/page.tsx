"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRegister } from "@/services/authService";
import { toast } from "react-toastify";
import { TechHeroAside } from "@/components/marketing/TechHeroAside";

export default function RegisterPage() {
  const router = useRouter();
  const reg = useRegister();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [blocked, setBlocked] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/bootstrap/has-admin", {
          cache: "no-store",
        });
        const body = (await res.json()) as { hasAdmin?: boolean };
        if (!cancelled && body.hasAdmin === true) {
          setBlocked(true);
          router.replace("/login");
        } else if (!cancelled) {
          setBlocked(false);
        }
      } catch {
        if (!cancelled) setBlocked(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    reg.mutate(
      { fullName, email, password },
      {
        onSuccess: () => {
          toast.success("Создан аккаунт администратора");
          router.push("/");
        },
        onError: (err: Error) =>
          toast.error(err.message || "Ошибка регистрации"),
      }
    );
  };

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-slate-200/90 bg-white/95 px-4 py-2.5 text-slate-900 outline-none transition focus:border-[#0d6efd] focus:ring-2 focus:ring-[#0d6efd]/25";

  if (blocked === null) {
    return (
      <div className="relative z-10 flex min-h-screen items-center justify-center">
        <p className="text-lg text-white/80">Проверка…</p>
      </div>
    );
  }

  if (blocked) {
    return null;
  }

  return (
    <div className="relative z-10 flex min-h-screen flex-col px-4 py-10 lg:py-16">
      <div className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-10 lg:grid-cols-2 lg:gap-14">
        <TechHeroAside
          kicker="Старт платформы"
          title={
            <>
              Первый
              <br />
              <span className="text-[#7ecbff]">администратор</span>
            </>
          }
          description="Создайте учётную запись администратора. Дальнейшая регистрация будет отключена — операторов добавите из панели."
        />
        <div className="w-full max-w-md justify-self-center lg:justify-self-end">
          <div className="rounded-3xl border border-white/45 bg-white/92 p-8 shadow-2xl shadow-slate-900/20 backdrop-blur-xl sm:p-10">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Регистрация
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Первый пользователь получает роль администратора. Операторов
              затем создаёт только админ.
            </p>
            <form className="mt-8 space-y-5" onSubmit={onSubmit}>
              <div>
                <label className="text-sm font-semibold text-slate-700">
                  ФИО
                </label>
                <input
                  required
                  className={inputClass}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
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
                  Пароль (не менее 8 символов)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  className={inputClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={reg.isPending}
                className="w-full rounded-full bg-[#0d6efd] py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-[#0b5ed7] disabled:opacity-60"
              >
                {reg.isPending ? "Создание…" : "Создать аккаунт администратора"}
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-slate-600">
              Уже есть аккаунт?{" "}
              <Link
                href="/login"
                className="font-semibold text-[#0d6efd] hover:underline"
              >
                Войти
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
