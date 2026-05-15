import type { ReactNode } from "react";

type TechHeroAsideProps = {
  kicker: string;
  title: ReactNode;
  description: string;
};

export function TechHeroAside({
  kicker,
  title,
  description,
}: TechHeroAsideProps) {
  return (
    <div className="relative hidden h-full min-h-[280px] overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-slate-900/60 to-blue-900/40 p-8 shadow-2xl backdrop-blur-md lg:block">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      <div className="relative z-10 flex h-full flex-col justify-center">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#7ecbff]">
          {kicker}
        </p>
        <h2 className="mt-3 text-3xl font-bold leading-tight text-white md:text-4xl">
          {title}
        </h2>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/80">
          {description}
        </p>
        <div className="mt-8 flex gap-3">
          <span className="h-2 w-2 rounded-full bg-[#0d6efd] shadow-[0_0_12px_#0d6efd]" />
          <span className="h-2 w-2 rounded-full bg-white/40" />
          <span className="h-2 w-2 rounded-full bg-white/40" />
        </div>
      </div>
    </div>
  );
}
