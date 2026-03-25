import Link from "next/link";

import { and, count, eq, gte, isNull, lte, sql } from "drizzle-orm";

import { auth } from "@/auth";
import { getDb } from "@/db";
import { asignaturas, clases, matriculas } from "@/db/schema";

export const metadata = {
  title: "Dashboard",
};

function formatFecha(value: string | Date | null): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value + "T12:00:00") : value;
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export default async function DocenteDashboardPage() {
  const session = await auth();
  const docenteId = session?.user?.id;

  if (!docenteId) {
    return (
      <section className="space-y-5">
        <div className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark p-5 shadow-lg shadow-primary/15 sm:p-6">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-intranet.webp" alt="OTEC" className="h-10 w-10 rounded-xl object-contain bg-white/10 p-1" />
            <h1 className="text-xl font-bold uppercase text-white sm:text-2xl">Panel Docente</h1>
          </div>
        </div>
      </section>
    );
  }

  const db = getDb();

  // Total alumnos activos across all my asignaturas
  const [alumnosResult] = await db
    .select({ total: count() })
    .from(matriculas)
    .innerJoin(asignaturas, eq(matriculas.asignaturaId, asignaturas.id))
    .where(
      and(
        eq(asignaturas.docenteId, docenteId),
        eq(matriculas.activa, true),
        isNull(matriculas.eliminadoAt),
      ),
    );

  // Total clases dadas (not deleted)
  const [clasesResult] = await db
    .select({ total: count() })
    .from(clases)
    .innerJoin(asignaturas, eq(clases.asignaturaId, asignaturas.id))
    .where(
      and(
        eq(asignaturas.docenteId, docenteId),
        isNull(clases.eliminadoAt),
      ),
    );

  // Upcoming clases in the next 7 days
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in7DaysStr = in7Days.toISOString().slice(0, 10);

  const proximasClases = await db
    .select({
      id: clases.id,
      titulo: clases.titulo,
      fecha: clases.fecha,
      horaInicio: clases.horaInicio,
      numeroSesion: clases.numeroSesion,
      asignaturaNombre: asignaturas.nombre,
    })
    .from(clases)
    .innerJoin(asignaturas, eq(clases.asignaturaId, asignaturas.id))
    .where(
      and(
        eq(asignaturas.docenteId, docenteId),
        isNull(clases.eliminadoAt),
        gte(clases.fecha, todayStr),
        lte(clases.fecha, in7DaysStr),
      ),
    )
    .orderBy(clases.fecha, clases.horaInicio)
    .limit(10);

  // Total asignaturas activas
  const [asignaturasResult] = await db
    .select({ total: sql<number>`count(*)` })
    .from(asignaturas)
    .where(
      and(
        eq(asignaturas.docenteId, docenteId),
        eq(asignaturas.estado, "activo"),
      ),
    );

  const totalAlumnos = Number(alumnosResult?.total ?? 0);
  const totalClases = Number(clasesResult?.total ?? 0);
  const totalAsignaturas = Number(asignaturasResult?.total ?? 0);

  return (
    <section className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark p-5 shadow-lg shadow-primary/15 sm:p-6">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-intranet.webp" alt="OTEC" className="h-10 w-10 rounded-xl object-contain bg-white/10 p-1" />
          <div>
            <h1 className="text-xl font-bold uppercase text-white sm:text-2xl">Panel Docente</h1>
            <p className="mt-0.5 text-sm text-white/80">
              Resumen de tu actividad docente y accesos rápidos.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-100 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-2xl font-bold text-primary">{totalAsignaturas}</p>
          <p className="text-xs text-text-secondary dark:text-gray-400">Asignaturas Activas</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-2xl font-bold text-success">{totalAlumnos}</p>
          <p className="text-xs text-text-secondary dark:text-gray-400">Alumnos Totales</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-2xl font-bold text-secondary">{totalClases}</p>
          <p className="text-xs text-text-secondary dark:text-gray-400">Clases Dadas</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Link
          href="/docente/asignaturas"
          className="group flex flex-col items-center gap-3 rounded-2xl border border-gray-200/80 bg-white p-5 text-center shadow-sm transition-all hover:shadow-lg hover:shadow-primary/10 active:scale-[0.98] dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary/40 sm:p-6"
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" className="h-12 w-12 transition-transform duration-200 group-hover:scale-110 sm:h-14 sm:w-14">
            <path strokeLinecap="round" strokeLinejoin="round" stroke="url(#grad-blue)" d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          <div>
            <h2 className="text-sm font-bold text-text-primary dark:text-white sm:text-base">Mis Asignaturas</h2>
            <p className="mt-1 hidden text-xs text-text-secondary dark:text-gray-400 sm:block">Gestiona tus cursos, clases y materiales.</p>
          </div>
        </Link>
        <Link
          href="/docente/asignaturas#asistencia"
          className="group flex flex-col items-center gap-3 rounded-2xl border border-gray-200/80 bg-white p-5 text-center shadow-sm transition-all hover:shadow-lg hover:shadow-primary/10 active:scale-[0.98] dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary/40 sm:p-6"
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" className="h-12 w-12 transition-transform duration-200 group-hover:scale-110 sm:h-14 sm:w-14">
            <path strokeLinecap="round" strokeLinejoin="round" stroke="url(#grad-emerald)" d="M8 7V3m8 4V3m-9 8h10m-11 9h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2Z" />
          </svg>
          <div>
            <h2 className="text-sm font-bold text-text-primary dark:text-white sm:text-base">Crear Asistencia</h2>
            <p className="mt-1 hidden text-xs text-text-secondary dark:text-gray-400 sm:block">Registra asistencia y carga notas por archivo.</p>
          </div>
        </Link>
      </div>

      {/* Upcoming classes */}
      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
          Próximas Clases (7 días)
        </h2>
        {proximasClases.length === 0 ? (
          <p className="mt-4 text-sm text-text-secondary dark:text-gray-400">
            No tienes clases programadas en los próximos 7 días.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {proximasClases.map((clase) => (
              <div
                key={clase.id}
                className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-gray-800/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-text-primary dark:text-white">
                    {clase.titulo}
                  </p>
                  <p className="text-xs text-text-secondary dark:text-gray-400">
                    {clase.asignaturaNombre} · Sesión {clase.numeroSesion}
                  </p>
                </div>
                <div className="ml-3 text-right">
                  <p className="text-sm font-semibold text-primary dark:text-primary-light">
                    {formatFecha(clase.fecha)}
                  </p>
                  {clase.horaInicio && (
                    <p className="text-xs text-text-secondary dark:text-gray-400">
                      {String(clase.horaInicio).slice(0, 5)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
