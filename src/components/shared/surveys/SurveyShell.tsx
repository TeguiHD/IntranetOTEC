import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type SurveyTone = "primary" | "emerald" | "amber" | "slate" | "rose";

type SurveyHeroStat = {
  label: string;
  value: string | number;
  tone?: SurveyTone;
};

type SurveyShellProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: ReactNode;
  stats?: SurveyHeroStat[];
  children: ReactNode;
};

type SurveyCardProps = {
  children: ReactNode;
  className?: string;
};

const STAT_TONE_CLASS: Record<SurveyTone, string> = {
  primary:
    "border-primary/20 bg-primary/[0.06] text-primary dark:border-primary/30 dark:bg-primary/15 dark:text-primary-light",
  emerald:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/25 dark:text-emerald-300",
  amber:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/25 dark:text-amber-300",
  slate:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300",
  rose: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/25 dark:text-rose-300",
};

export function SurveyShell({
  icon: Icon,
  title,
  description,
  badge,
  stats,
  children,
}: SurveyShellProps) {
  return (
    <section className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-indigo-200/70 bg-gradient-to-br from-white via-indigo-50/70 to-cyan-50/60 p-5 shadow-sm dark:border-indigo-900/50 dark:from-gray-900 dark:via-indigo-950/40 dark:to-slate-950 sm:p-6">
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-indigo-300/25 blur-3xl dark:bg-indigo-600/20" />
          <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-700/20" />
        </div>

        <div className="relative z-10">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/50 bg-white/80 text-indigo-700 shadow-sm backdrop-blur dark:border-indigo-800/60 dark:bg-indigo-950/70 dark:text-indigo-300">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-black uppercase tracking-wide text-text-primary dark:text-white sm:text-2xl">
                {title}
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-text-secondary dark:text-gray-300">
                {description}
              </p>
            </div>
            {badge ? <div className="shrink-0">{badge}</div> : null}
          </div>

          {stats && stats.length > 0 ? (
            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => {
                const tone = stat.tone ?? "primary";
                return (
                  <div
                    key={`${stat.label}-${stat.value}`}
                    className={`rounded-xl border px-3 py-2.5 ${STAT_TONE_CLASS[tone]}`}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide opacity-90">
                      {stat.label}
                    </p>
                    <p className="mt-1 text-lg font-bold leading-none">{stat.value}</p>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </header>

      {children}
    </section>
  );
}

export function SurveyCard({ children, className = "" }: SurveyCardProps) {
  const merged = `rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 ${className}`.trim();
  return <article className={merged}>{children}</article>;
}
