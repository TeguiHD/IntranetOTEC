"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Circle,
  CreditCard,
  User,
  X,
} from "lucide-react";

const DISMISS_KEY = "otec.onboarding.dismissed";
const STEPS_KEY = "otec.onboarding.steps";

type Step = {
  key: string;
  icon: React.ElementType;
  color: string;
  titulo: string;
  descripcion: string;
  href: string;
  matchPath: string;
};

const STEPS: Step[] = [
  {
    key: "perfil",
    icon: User,
    color: "#8B3A9E",
    titulo: "Revisa tu perfil",
    descripcion: "Verifica tu nombre y RUT.",
    href: "/alumno/perfil",
    matchPath: "/alumno/perfil",
  },
  {
    key: "cursos",
    icon: BookOpen,
    color: "#3B82F6",
    titulo: "Explora tus cursos",
    descripcion: "Ve tus asignaturas y materiales.",
    href: "/alumno/asignaturas",
    matchPath: "/alumno/asignaturas",
  },
  {
    key: "credencial",
    icon: CreditCard,
    color: "#EC4899",
    titulo: "Descarga tu credencial",
    descripcion: "Tu identificación institucional.",
    href: "/alumno/solicitudes/credencial",
    matchPath: "/alumno/solicitudes/credencial",
  },
];

export function OnboardingPanel() {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(true); // start hidden until hydrated
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    const isDismissed = !!localStorage.getItem(DISMISS_KEY);
    const storedSteps = localStorage.getItem(STEPS_KEY);
    const parsedSteps = storedSteps ? (JSON.parse(storedSteps) as Record<string, boolean>) : {};
    setDismissed(isDismissed);
    setCompleted(parsedSteps);
    setHydrated(true);
  }, []);

  // Auto-mark step as completed when visiting its page
  useEffect(() => {
    if (!hydrated) return;
    const matchingStep = STEPS.find((s) => pathname.startsWith(s.matchPath));
    if (matchingStep && !completed[matchingStep.key]) {
      const updated = { ...completed, [matchingStep.key]: true };
      setCompleted(updated);
      localStorage.setItem(STEPS_KEY, JSON.stringify(updated));
    }
  }, [pathname, hydrated, completed]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const markDone = (key: string) => {
    const updated = { ...completed, [key]: true };
    setCompleted(updated);
    localStorage.setItem(STEPS_KEY, JSON.stringify(updated));
  };

  const totalCompleted = STEPS.filter((s) => completed[s.key]).length;
  const allDone = totalCompleted === STEPS.length;

  // Auto-dismiss when all done (after brief delay) — must be before any early return
  useEffect(() => {
    if (allDone && hydrated && !dismissed) {
      const t = setTimeout(dismiss, 2000);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone, hydrated, dismissed]);

  if (!hydrated || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 w-72 rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text-primary dark:text-white">
            {allDone ? "¡Todo listo!" : "Primeros pasos"}
          </span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
            {totalCompleted}/{STEPS.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="rounded-lg p-1 text-text-muted hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-gray-800"
            aria-label={collapsed ? "Expandir" : "Colapsar"}
          >
            {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            onClick={dismiss}
            className="rounded-lg p-1 text-text-muted hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-gray-800"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mx-4 mb-1 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${(totalCompleted / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Steps */}
      {!collapsed && (
        <div className="space-y-1 px-3 pb-3 pt-2">
          {STEPS.map((step) => {
            const StepIcon = step.icon;
            const done = !!completed[step.key];
            return (
              <div
                key={step.key}
                className={`flex items-center gap-3 rounded-xl p-2.5 transition-colors ${
                  done
                    ? "bg-gray-50 dark:bg-gray-800/40"
                    : "bg-white hover:bg-gray-50 dark:bg-transparent dark:hover:bg-gray-800/40"
                }`}
              >
                {/* Status icon */}
                <span className="shrink-0">
                  {done ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <StepIcon className="h-5 w-5" style={{ color: step.color }} />
                  )}
                </span>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-xs font-semibold leading-tight ${
                      done ? "text-text-muted line-through dark:text-gray-500" : "text-text-primary dark:text-white"
                    }`}
                  >
                    {step.titulo}
                  </p>
                  {!done && (
                    <p className="mt-0.5 text-[11px] text-text-secondary dark:text-gray-400">
                      {step.descripcion}
                    </p>
                  )}
                </div>

                {/* Action */}
                {!done && (
                  <Link
                    href={step.href}
                    onClick={() => markDone(step.key)}
                    className="shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white"
                    style={{ backgroundColor: step.color }}
                  >
                    Ir
                  </Link>
                )}
              </div>
            );
          })}

          {allDone && (
            <p className="pt-1 text-center text-xs text-green-600 dark:text-green-400">
              ¡Completaste todos los pasos!
            </p>
          )}
        </div>
      )}
    </div>
  );
}
