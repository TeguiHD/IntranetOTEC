"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

const SCROLL_TARGET_ID = "academico-main";

export function CursoListClient({ cursos, selectedId, query }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const lastNavigatedRef = useRef<string>(selectedId);

  // Cuando cambia cursoId vía URL, hacer scroll al main (solo mobile/tablet)
  useEffect(() => {
    const current = searchParams.get("cursoId") ?? "";
    if (current && current !== lastNavigatedRef.current) {
      lastNavigatedRef.current = current;
      if (window.innerWidth < 1024) {
        const el = document.getElementById(SCROLL_TARGET_ID);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [searchParams]);

  if (cursos.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200/80 bg-white p-6 text-center text-sm text-text-secondary shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
        {query ? `Sin cursos para "${query}"` : "Sin cursos disponibles"}
      </div>
    );
  }

  const navigateTo = (cursoId: string) => {
    if (cursoId === selectedId) {
      // Re-click al mismo curso = scroll a main
      const el = document.getElementById(SCROLL_TARGET_ID);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const params = new URLSearchParams();
    params.set("cursoId", cursoId);
    if (query) params.set("q", query);
    startTransition(() => {
      router.push(`/admin/academico?${params.toString()}`);
    });
  };

  return (
    <ul
      className="grid max-h-[55vh] grid-cols-1 gap-1.5 overflow-y-auto rounded-2xl border border-gray-200/80 bg-white p-2 shadow-sm lg:max-h-[70vh] dark:border-gray-800 dark:bg-gray-900"
      aria-busy={pending}
      role="listbox"
    >
      {cursos.map((c) => {
        const isActive = c.id === selectedId;
        return (
          <li key={c.id} className="min-w-0">
            <button
              type="button"
              onClick={() => navigateTo(c.id)}
              disabled={pending && isActive}
              role="option"
              aria-selected={isActive}
              className={`group flex w-full min-w-0 items-center gap-2.5 rounded-xl px-3 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                isActive
                  ? "border border-primary/30 bg-primary/10 text-primary dark:border-primary/40 dark:bg-primary/20"
                  : "border border-transparent hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <span
                className={`inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${
                  isActive ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"
                }`}
                aria-hidden
              />
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
                  {c.codigo ?? "Sin código"}
                </p>
              </div>
              <span
                className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  isActive
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-600 group-hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                }`}
                title={`${c.totalSecciones} sección${c.totalSecciones === 1 ? "" : "es"}`}
              >
                {c.totalSecciones}
              </span>
              {pending && isActive ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
              ) : (
                <ChevronRight
                  className={`h-4 w-4 shrink-0 transition-transform lg:hidden ${
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
