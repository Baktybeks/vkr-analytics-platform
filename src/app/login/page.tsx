import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="relative z-10 flex min-h-screen items-center justify-center text-lg text-white/80">
          Загрузка…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
