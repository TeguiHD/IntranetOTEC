import { Bell } from "lucide-react";

import {
  listarMisNotificaciones,
  marcarMisNotificacionesLeidas,
} from "@/actions/notificaciones";
import { MarcarLeidasOnMount } from "@/components/shared/MarcarLeidasOnMount";

export const metadata = { title: "Notificaciones" };

const TIPO_BADGE: Record<string, string> = {
  general: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  curso: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  individual: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
};

export default async function DocenteNotificacionesPage() {
  const notificaciones = await listarMisNotificaciones();

  return (
    <section className="space-y-5">
      <MarcarLeidasOnMount action={marcarMisNotificacionesLeidas} />
      <header className="flex items-center gap-3">
        <span className="rounded-xl bg-primary/10 p-2 text-primary">
          <Bell className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Notificaciones
          </h1>
          <p className="text-sm text-text-secondary dark:text-gray-400">
            Mensajes de la administración.
          </p>
        </div>
      </header>

      {notificaciones.length === 0 ? (
        <article className="rounded-2xl border border-gray-200/80 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <Bell className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h2 className="mt-3 text-lg font-semibold text-text-primary dark:text-white">
            Sin notificaciones
          </h2>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Cuando el administrador envíe un mensaje, aparecerá aquí.
          </p>
        </article>
      ) : (
        <div className="space-y-3">
          {notificaciones.map((n) => (
            <article
              key={n.id}
              className={`rounded-2xl border bg-white p-5 shadow-sm transition-[background-color,border-color,color,box-shadow,opacity,transform] dark:bg-gray-900 ${
                n.leidoAt
                  ? "border-gray-200/80 dark:border-gray-800"
                  : "border-primary/30 bg-primary/[0.02] dark:border-primary/20 dark:bg-primary/5"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {!n.leidoAt && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-primary" title="No leída" />
                    )}
                    <h2 className="font-semibold text-text-primary dark:text-white">{n.titulo}</h2>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary dark:text-gray-400">
                    {n.contenido}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${TIPO_BADGE[n.tipo ?? "general"] ?? TIPO_BADGE.general}`}>
                  {n.tipo === "curso" ? "Curso" : n.tipo === "individual" ? "Personal" : "General"}
                </span>
              </div>
              {n.createdAt && (
                <p className="mt-3 text-xs text-text-muted dark:text-gray-500">
                  {new Date(n.createdAt).toLocaleDateString("es-CL", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
