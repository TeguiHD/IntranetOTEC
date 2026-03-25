import { CheckCircle2, ClipboardList, Lock } from "lucide-react";
import Link from "next/link";

import { listarMisEncuestasPendientes } from "@/actions/encuestas-unificadas";

export const metadata = { title: "Mis Encuestas" };

export default async function MisEncuestasPage() {
  const encuestas = await listarMisEncuestasPendientes();

  return (
    <section className="space-y-6">
      <header className="flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
          <ClipboardList className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Mis Encuestas
          </h1>
          <p className="text-sm text-text-secondary dark:text-gray-400">
            Encuestas pendientes de respuesta asignadas a ti.
          </p>
        </div>
      </header>

      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        {encuestas.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 dark:text-emerald-500" strokeWidth={1.5} />
            <p className="text-base font-semibold text-text-primary dark:text-white">
              ¡Estás al día!
            </p>
            <p className="text-sm text-text-secondary dark:text-gray-400">
              No tienes encuestas pendientes por responder.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {encuestas.map((enc) => (
              <div
                key={enc.evaluacionId}
                className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-text-primary dark:text-gray-100">
                      {enc.titulo}
                    </p>
                    {enc.obligatoria && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        <Lock className="h-2.5 w-2.5" />
                        Obligatoria
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-text-secondary dark:text-gray-400">
                    {enc.asignaturaNombre}
                  </p>
                  {enc.instrucciones && (
                    <p className="mt-1 text-xs italic text-text-muted dark:text-gray-500 line-clamp-2">
                      {enc.instrucciones}
                    </p>
                  )}
                </div>
                <Link
                  href={`/encuestas/${enc.evaluacionId}`}
                  className="shrink-0 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 py-2.5 text-center text-sm font-semibold text-white shadow-sm shadow-primary/20 transition-all hover:shadow-md active:scale-[0.97]"
                >
                  Responder
                </Link>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
