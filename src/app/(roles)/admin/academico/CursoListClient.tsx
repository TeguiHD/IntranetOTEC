"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2 } from "lucide-react";

type Curso = {
  id: string;
  nombre: string;
  codigo: string | null;
  totalSecciones: number;
};

type Props = {
  cursos: Curso[];
  selectedId: string;
  query: string;
};

export function CursoListClient({ cursos, selectedId, query }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (cursos.length === 0) {
    return (
      <ul className="space-y-1.5 rounded-2xl border border-gray-200/80 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <li className="px-3 py-6 text-center text-xs text-text-secondary dark:text-gray-400">
          {query ? `Sin cursos para "${query}"` : "Sin cursos disponibles"}
        </li>
      </ul>
    );
  }

  const navigateTo = (cursoId: string) => {
    const params = new URLSearchParams();
    params.set("cursoId", cursoId);
    if (query) params.set("q", query);
    startTransition(() => {
      router.push(`/admin/academico?${params.toString()}`);
    });
  };

  return (
    <ul
      className="space-y-1.5 rounded-2xl border border-gray-200/80 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-gray-900"
      aria-busy={pending}
    >
      {cursos.map((c) => {
        const isActive = c.id === selectedId;
        return (
          <li key={c.id} className="min-w-0">
            <button
              type="button"
              onClick={() => navigateTo(c.id)}
              disabled={pending && isActive}
              aria-current={isActive ? "true" : undefined}
              className={`flex w-full min-w-0 items-start justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                isActive
                  ? "bg-primary/10 text-primary dark:bg-primary/20"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800"
              } ${pending && isActive ? "opacity-70" : ""}`}
            >
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-sm font-semibold ${
                    isActive
                      ? "text-primary dark:text-primary-light"
                      : "text-text-primary dark:text-gray-100"
                  }`}
                >
                  {c.nombre}
                </p>
                <p className="truncate text-[11px] text-text-secondary dark:text-gray-400">
                  {c.codigo ?? "Sin código"} · {c.totalSecciones} sección
                  {c.totalSecciones === 1 ? "" : "es"}
                </p>
              </div>
              {pending && isActive ? (
                <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" />
              ) : (
                <ChevronRight
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    isActive ? "text-primary" : "text-gray-300 dark:text-gray-600"
                  }`}
                />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
