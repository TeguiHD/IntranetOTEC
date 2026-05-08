import Link from "next/link";

import {
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FileText,
  IdCard,
  type LucideIcon,
  Send,
  Wallet,
} from "lucide-react";
import { and, eq, gte, isNull, sql } from "drizzle-orm";

import {
  listarPeriodosDashboard,
  obtenerMetricasGlobales,
} from "@/actions/admin-metricas";
import { listarNotificacionesAdmin } from "@/actions/notificaciones";
import { PeriodoCursoSeccionPicker } from "@/components/shared/PeriodoCursoSeccionPicker";
import { getDb } from "@/db";
import {
  asignaturas,
  certificados,
  clases,
  matriculas,
  notificaciones,
} from "@/db/schema";

type KpiTile = {
  label: string;
  value: number;
  href: string;
  hint?: string;
  Icon: LucideIcon;
  tone: "neutral" | "amber" | "emerald" | "primary" | "danger";
};

const TILE_TONE: Record<KpiTile["tone"], string> = {
  neutral: "border-gray-200/80 bg-white text-text-primary dark:border-gray-800 dark:bg-gray-900 dark:text-white",
  amber: "border-amber-200/80 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100",
  emerald: "border-emerald-200/80 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100",
  primary: "border-primary/30 bg-primary/5 text-primary dark:border-primary/40 dark:bg-primary/10",
  danger: "border-red-200/80 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100",
};

type AdminDashboardPageProps = {
  searchParams?: Promise<{ periodoId?: string }>;
};

type KpisOperativos = {
  clasesHoy: number;
  matriculasMora: number;
  matriculasPendientes: number;
  certificadosUltimaSemana: number;
  notificacionesUltimaSemana: number;
};

const toIso = (d: Date) => d.toISOString().slice(0, 10);

async function obtenerKpisOperativosAdmin(periodoId: string | null): Promise<KpisOperativos> {
  const db = getDb();
  const today = new Date();
  const todayIso = toIso(today);
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const periodoFilter = periodoId
    ? eq(asignaturas.periodoId, periodoId)
    : undefined;

  const matriculasBaseFilters = and(
    eq(matriculas.activa, true),
    isNull(matriculas.eliminadoAt),
    isNull(asignaturas.eliminadoAt),
    periodoFilter,
  );

  const [clasesHoyRow, matMoraRow, matPendRow, certRow, notifRow] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(clases)
      .innerJoin(asignaturas, eq(clases.asignaturaId, asignaturas.id))
      .where(
        and(
          eq(clases.fecha, todayIso),
          isNull(clases.eliminadoAt),
          isNull(asignaturas.eliminadoAt),
          periodoFilter,
        ),
      ),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(matriculas)
      .innerJoin(asignaturas, eq(matriculas.asignaturaId, asignaturas.id))
      .where(and(matriculasBaseFilters, eq(matriculas.estadoPago, "mora"))),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(matriculas)
      .innerJoin(asignaturas, eq(matriculas.asignaturaId, asignaturas.id))
      .where(and(matriculasBaseFilters, eq(matriculas.estadoPago, "pendiente"))),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(certificados)
      .where(gte(certificados.fechaEmision, sevenDaysAgo)),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(notificaciones)
      .where(gte(notificaciones.createdAt, sevenDaysAgo)),
  ]);

  return {
    clasesHoy: Number(clasesHoyRow[0]?.total ?? 0),
    matriculasMora: Number(matMoraRow[0]?.total ?? 0),
    matriculasPendientes: Number(matPendRow[0]?.total ?? 0),
    certificadosUltimaSemana: Number(certRow[0]?.total ?? 0),
    notificacionesUltimaSemana: Number(notifRow[0]?.total ?? 0),
  };
}

const ESTADO_PERIODO_LABELS: Record<"planificado" | "activo" | "cerrado", string> = {
  planificado: "Planificado",
  activo: "Activo",
  cerrado: "Cerrado",
};

const formatIsoDate = (value: string): string => {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsed);
};

export const metadata = {
  title: "Dashboard",
};

export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
  const params = await (searchParams ?? Promise.resolve({} as { periodoId?: string }));
  const periodoIdRaw = typeof params.periodoId === "string" ? params.periodoId.trim() : "";
  const periodoSeleccionadoId =
    periodoIdRaw && periodoIdRaw.toLowerCase() !== "all" ? periodoIdRaw : null;

  const [periodos, metricas, notificacionesRecientes, kpisOperativos] = await Promise.all([
    listarPeriodosDashboard(),
    obtenerMetricasGlobales({ periodoId: periodoSeleccionadoId }),
    listarNotificacionesAdmin(),
    obtenerKpisOperativosAdmin(periodoSeleccionadoId),
  ]);

  const periodoSeleccionado =
    periodoSeleccionadoId !== null
      ? periodos.find((periodo) => periodo.id === periodoSeleccionadoId) ?? null
      : null;
  const periodoQuery = periodoSeleccionadoId
    ? `?periodoId=${encodeURIComponent(periodoSeleccionadoId)}`
    : "";
  const kpiTiles: KpiTile[] = [
    {
      label: "Solicitudes pendientes",
      value: metricas?.solicitudesPendientes ?? 0,
      href: "/admin/solicitudes",
      hint: "Bandeja administrativa por resolver",
      Icon: FileText,
      tone: (metricas?.solicitudesPendientes ?? 0) > 0 ? "danger" : "emerald",
    },
    {
      label: "Clases hoy",
      value: kpisOperativos.clasesHoy,
      href: `/admin/agenda${periodoQuery}`,
      hint: "Sesiones programadas para la fecha actual",
      Icon: CalendarDays,
      tone: "primary",
    },
    {
      label: "Matrículas en mora",
      value: kpisOperativos.matriculasMora,
      href: "/admin/matriculas",
      hint: "Requieren revisión financiera antes de operar",
      Icon: Wallet,
      tone: kpisOperativos.matriculasMora > 0 ? "danger" : "emerald",
    },
    {
      label: "Pagos pendientes",
      value: kpisOperativos.matriculasPendientes,
      href: "/admin/matriculas",
      hint: "Matrículas activas sin pago confirmado",
      Icon: IdCard,
      tone: kpisOperativos.matriculasPendientes > 0 ? "amber" : "emerald",
    },
    {
      label: "Secciones activas",
      value: metricas?.asignaturasActivas ?? 0,
      href: `/admin/academico${periodoQuery}`,
      hint: "Oferta vigente del periodo seleccionado",
      Icon: BookOpen,
      tone: "neutral",
    },
    {
      label: "Certificados 7 días",
      value: kpisOperativos.certificadosUltimaSemana,
      href: "/admin/certificados",
      hint: "Documentos emitidos recientemente",
      Icon: CheckCircle2,
      tone: "emerald",
    },
    {
      label: "Envíos 7 días",
      value: kpisOperativos.notificacionesUltimaSemana,
      href: "/admin/notificaciones",
      hint: "Comunicaciones creadas esta semana",
      Icon: Send,
      tone: "amber",
    },
  ];

  return (
    <section className="space-y-5">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark p-5 shadow-lg shadow-primary/15 sm:p-6">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-intranet.webp" alt="OTEC" className="h-10 w-10 rounded-xl object-contain bg-white/10 p-1" />
          <div>
            <h1 className="text-xl font-bold uppercase text-white sm:text-2xl">Panel Admin</h1>
            <p className="mt-0.5 text-sm text-white/80">
              Centro operativo para administración académica y control de usuarios.
            </p>
          </div>
        </div>
      </div>

      <article className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
        <form action="/admin" method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-md">
            <PeriodoCursoSeccionPicker
              asForm={false}
              autoSubmit={false}
              layout="stack"
              periodos={periodos.map((periodo) => ({
                id: periodo.id,
                label: `${periodo.codigo} · ${periodo.nombre}`,
                description: ESTADO_PERIODO_LABELS[periodo.estado],
                badge: periodo.estado,
              }))}
              selected={{ periodoId: periodoSeleccionadoId ?? undefined }}
              labels={{ periodo: "Vista por periodo academico" }}
              emptyLabels={{ periodo: "Todos los periodos" }}
              allowClear={{ periodo: true }}
            />
            {periodoSeleccionado && (
              <p className="mt-2 text-xs text-text-secondary dark:text-gray-400">
                Ventana: {formatIsoDate(periodoSeleccionado.fechaInicio)} - {formatIsoDate(periodoSeleccionado.fechaFin)}
              </p>
            )}
          </div>
          <button
            type="submit"
            className="h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            Aplicar periodo
          </button>
        </form>
      </article>

      {/* Global metrics */}
      {metricas && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {[
            { label: "Docentes", value: metricas.totalDocentes, color: "text-primary" },
            { label: "Alumnos", value: metricas.totalAlumnos, color: "text-primary" },
            { label: "Secciones", value: metricas.totalAsignaturas, color: "text-primary" },
            { label: "Activas", value: metricas.asignaturasActivas, color: "text-success" },
            { label: "Finalizadas", value: metricas.asignaturasPorFinalizar, color: "text-amber-600 dark:text-amber-400" },
            { label: "Clases", value: metricas.totalClases, color: "text-secondary" },
            { label: "Solicitudes", value: metricas.solicitudesPendientes, color: metricas.solicitudesPendientes > 0 ? "text-danger" : "text-success" },
          ].map((m) => (
            <div key={m.label} className="rounded-xl border border-gray-100 bg-white p-3 text-center dark:border-gray-800 dark:bg-gray-900">
              <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
              <p className="text-xs text-text-secondary dark:text-gray-400">{m.label}</p>
            </div>
          ))}
        </div>
      )}

      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
              Operación del periodo
            </h2>
            <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
              Prioridades accionables para administración académica, pagos y documentos.
            </p>
          </div>
          <Link
            href={`/admin/reportes${periodoQuery}`}
            className="mt-2 inline-flex h-10 items-center justify-center rounded-xl border border-primary/25 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 dark:border-primary/40 dark:text-primary-light sm:mt-0"
          >
            Ver analítica
          </Link>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kpiTiles.map((tile) => (
            <Link
              key={tile.label}
              href={tile.href}
              className={`group rounded-xl border p-4 shadow-sm transition-[background-color,border-color,color,box-shadow,transform] hover:-translate-y-0.5 hover:shadow-md ${TILE_TONE[tile.tone]}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-75">{tile.label}</p>
                  <p className="mt-2 text-3xl font-bold leading-none">{tile.value}</p>
                </div>
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/70 shadow-sm transition-transform group-hover:scale-105 dark:bg-gray-950/40">
                  <tile.Icon className="h-5 w-5" />
                </span>
              </div>
              {tile.hint ? (
                <p className="mt-3 line-clamp-2 text-xs leading-relaxed opacity-75">
                  {tile.hint}
                </p>
              ) : null}
            </Link>
          ))}
        </div>
      </article>

      {/* Notificaciones recientes */}
      {notificacionesRecientes.length > 0 && (
        <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary dark:text-white sm:text-lg">
              <Bell className="h-5 w-5 text-amber-500" />
              Notificaciones Enviadas
            </h2>
            <Link
              href="/admin/notificaciones"
              className="text-xs font-medium text-primary hover:underline dark:text-primary-light"
            >
              Gestionar →
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {notificacionesRecientes.slice(0, 5).map((n) => (
              <div
                key={n.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-gray-800/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary dark:text-white">{n.titulo}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-text-secondary dark:text-gray-400">{n.contenido}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                    n.tipo === "general"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      : n.tipo === "curso"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                      : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                  }`}>
                    {n.tipo}
                  </span>
                  {n.createdAt && (
                    <p className="mt-0.5 text-[10px] text-text-muted dark:text-gray-500">
                      {new Date(n.createdAt).toLocaleDateString("es-CL", { day: "2-digit", month: "short" })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </article>
      )}

    </section>
  );
}
