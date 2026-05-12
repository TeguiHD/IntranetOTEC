import Link from "next/link";

import { CalendarDays, CalendarRange } from "lucide-react";

import { obtenerHorarioDocente } from "@/actions/horarios";
import { WeeklyScheduleGrid } from "@/components/shared/WeeklyScheduleGrid";

export const metadata = { title: "Mi Horario" };

export default async function DocenteHorarioPage() {
  const bloques = await obtenerHorarioDocente();

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
          Mi Horario
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
          Patrón semanal de clases de tus secciones activas.
        </p>
      </header>

      {bloques.length === 0 ? (
        <article className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-8">
          <CalendarRange className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
          <h2 className="mt-3 text-base font-semibold text-text-primary dark:text-white">
            No hay horario semanal configurado.
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-text-secondary dark:text-gray-400">
            Esta vista depende de bloques horarios creados por administracion. Para revisar sesiones con fecha especifica, usa Calendario o Clases.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href="/docente/calendario"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
            >
              <CalendarDays className="h-4 w-4" />
              Ver calendario
            </Link>
            <Link
              href="/docente/asignaturas#clases"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-primary/40 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10 dark:border-primary-light/40 dark:text-primary-light"
            >
              Ver clases
            </Link>
          </div>
        </article>
      ) : (
        <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <WeeklyScheduleGrid bloques={bloques} />
        </article>
      )}
    </section>
  );
}
