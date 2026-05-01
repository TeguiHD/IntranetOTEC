import Link from "next/link";

import { and, count, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { Bell, BookOpen, CalendarDays, CalendarRange, ClipboardCheck, MessageSquare, User, type LucideIcon } from "lucide-react";

import { QrAsistenciaButton } from "@/components/docente/QrAsistenciaButton";

import { auth } from "@/auth";
import { getDb } from "@/db";
import { asignaturas, clases, matriculas } from "@/db/schema";

const GRADIENT_COLORS: Record<string, string> = {
  "grad-blue":    "#3B82F6",
  "grad-indigo":  "#6366F1",
  "grad-emerald": "#10B981",
  "grad-teal":    "#14B8A6",
  "grad-cyan":    "#06B6D4",
  "grad-amber":   "#F5A623",
};

type NavItem = { href: string; title: string; gradient: string; Icon: LucideIcon };

const DOCENTE_NAV_ACADEMICO: NavItem[] = [
  { href: "/docente/asignaturas",  title: "Mis Asignaturas", gradient: "grad-blue",    Icon: BookOpen },
  { href: "/docente/asistencia",   title: "Asistencia",      gradient: "grad-emerald", Icon: ClipboardCheck },
  { href: "/docente/horario",      title: "Mi Horario",      gradient: "grad-teal",    Icon: CalendarRange },
  { href: "/docente/calendario",   title: "Calendario",      gradient: "grad-cyan",    Icon: CalendarDays },
];

const DOCENTE_NAV_EXTRA: NavItem[] = [
  { href: "/encuestas",            title: "Mis Encuestas",   gradient: "grad-indigo",  Icon: MessageSquare },
  { href: "/docente/notificaciones", title: "Notificaciones", gradient: "grad-amber",  Icon: Bell },
  { href: "/docente/perfil",       title: "Mi Perfil",       gradient: "grad-blue",    Icon: User },
];

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

      {/* Navigation — Académico */}
      <div className="grid grid-cols-4 gap-3">
        {DOCENTE_NAV_ACADEMICO.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex flex-col items-center gap-2 rounded-2xl border border-gray-200/80 bg-white p-4 text-center shadow-sm transition-all hover:shadow-lg hover:shadow-primary/10 active:scale-[0.98] dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary/40"
          >
            <item.Icon
              className="h-9 w-9 transition-transform duration-200 group-hover:scale-110"
              strokeWidth={1.5}
              style={{ color: GRADIENT_COLORS[item.gradient] ?? "#6B7280" }}
            />
            <p className="text-xs font-semibold leading-tight text-text-primary dark:text-white">{item.title}</p>
          </Link>
        ))}
      </div>

      {/* Navigation — Extra */}
      <div className="grid grid-cols-3 gap-3">
        {DOCENTE_NAV_EXTRA.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex flex-col items-center gap-2 rounded-2xl border border-gray-200/80 bg-white p-4 text-center shadow-sm transition-all hover:shadow-lg hover:shadow-primary/10 active:scale-[0.98] dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary/40"
          >
            <item.Icon
              className="h-9 w-9 transition-transform duration-200 group-hover:scale-110"
              strokeWidth={1.5}
              style={{ color: GRADIENT_COLORS[item.gradient] ?? "#6B7280" }}
            />
            <p className="text-xs font-semibold leading-tight text-text-primary dark:text-white">{item.title}</p>
          </Link>
        ))}
      </div>

      {/* Clases de hoy */}
      {(() => {
        const clasesHoy = proximasClases.filter((c) => c.fecha === todayStr);
        if (clasesHoy.length === 0) return null;
        return (
          <article className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-sm dark:border-primary/30 dark:bg-primary/10 sm:p-6">
            <div className="mb-3 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
                Clases de Hoy
              </h2>
              <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white">
                {clasesHoy.length}
              </span>
            </div>
            <div className="space-y-3">
              {clasesHoy.map((clase) => (
                <div
                  key={clase.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/10 bg-white px-4 py-3 dark:border-primary/20 dark:bg-gray-900"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-text-primary dark:text-white">
                      {clase.titulo}
                    </p>
                    <p className="text-xs text-text-secondary dark:text-gray-400">
                      {clase.asignaturaNombre}
                      {clase.numeroSesion ? ` · Sesión ${clase.numeroSesion}` : ""}
                      {clase.horaInicio ? ` · ${String(clase.horaInicio).slice(0, 5)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href="/docente/asistencia"
                      className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900"
                    >
                      <ClipboardCheck className="h-3.5 w-3.5" />
                      Asistencia
                    </Link>
                    <QrAsistenciaButton claseId={clase.id} claseNombre={clase.titulo} />
                  </div>
                </div>
              ))}
            </div>
          </article>
        );
      })()}

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
