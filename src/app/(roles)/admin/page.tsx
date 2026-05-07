import Link from "next/link";

import {
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
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
  obtenerMetricasPorAsignatura,
} from "@/actions/admin-metricas";
import { obtenerResumenDatosDocentes } from "@/actions/admin-resumen";
import { listarNotificacionesAdmin } from "@/actions/notificaciones";
import { buscarPersonaPorRutAdmin } from "@/actions/usuarios";
import { AccordionItem } from "@/components/shared/Accordion";
import { MessageToast } from "@/components/shared/MessageToast";
import { PeriodoCursoSeccionPicker } from "@/components/shared/PeriodoCursoSeccionPicker";
import { getDb } from "@/db";
import {
  asignaturas,
  certificados,
  clases,
  matriculas,
  notificaciones,
} from "@/db/schema";
import { formatearRut } from "@/lib/rut";
import { RutBuscador } from "./RutBuscador";

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
  searchParams?: Promise<{ rut?: string; periodoId?: string }>;
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

const formatDate = (value: Date | null): string => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-CL", { year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
};

const formatRutValue = (value: string | null): string => {
  if (!value) return "-";
  return value.startsWith("EXT-") ? `Ext: ${value.replace(/^EXT-/, "")}` : formatearRut(value);
};

const ESTADO_COLORS: Record<string, string> = {
  activo: "text-success",
  finalizado: "text-amber-600 dark:text-amber-400",
  borrador: "text-text-secondary dark:text-gray-400",
  archivado: "text-text-muted dark:text-gray-500",
};

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
  const params = await (searchParams ?? Promise.resolve({} as { rut?: string; periodoId?: string }));
  const rutConsulta = typeof params.rut === "string" ? params.rut.trim() : "";
  const periodoIdRaw = typeof params.periodoId === "string" ? params.periodoId.trim() : "";
  const periodoSeleccionadoId =
    periodoIdRaw && periodoIdRaw.toLowerCase() !== "all" ? periodoIdRaw : null;

  const [periodos, resultadoBusqueda, resumenDocentes, metricas, asigMetricas, notificacionesRecientes, kpisOperativos] = await Promise.all([
    listarPeriodosDashboard(),
    rutConsulta ? buscarPersonaPorRutAdmin({ rut: rutConsulta }) : null,
    obtenerResumenDatosDocentes({ periodoId: periodoSeleccionadoId }),
    obtenerMetricasGlobales({ periodoId: periodoSeleccionadoId }),
    obtenerMetricasPorAsignatura({ periodoId: periodoSeleccionadoId }),
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
          <input type="hidden" name="rut" value={rutConsulta} />
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

      {/* Asignatura metrics */}
      {asigMetricas.length > 0 && (
        <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
            Métricas por Asignatura
          </h2>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Alumnos inscritos, clases dictadas y asistencia promedio por asignatura.
          </p>

          {/* Mobile: cards */}
          <div className="mt-4 space-y-3 sm:hidden">
            {asigMetricas.map((a) => (
              <div key={a.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-text-primary dark:text-white">{a.nombre}</p>
                    <p className="text-xs text-text-secondary dark:text-gray-400">
                      {a.docenteNombre ?? "Sin docente"} · <span className={ESTADO_COLORS[a.estado ?? ""] ?? ""}>{a.estado ?? "-"}</span>
                    </p>
                  </div>
                  {a.asistenciaPromedio !== null && (
                    <span className={`text-sm font-bold ${a.asistenciaPromedio >= 75 ? "text-success" : a.asistenciaPromedio >= 50 ? "text-amber-600 dark:text-amber-400" : "text-danger"}`}>
                      {a.asistenciaPromedio}%
                    </span>
                  )}
                </div>
                <div className="mt-2 flex gap-4 text-xs text-text-secondary dark:text-gray-400">
                  <span><strong className="text-text-primary dark:text-white">{a.totalAlumnos}</strong> alumnos</span>
                  <span><strong className="text-text-primary dark:text-white">{a.totalClases}</strong> clases</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="mt-4 hidden overflow-x-auto sm:block">
            <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                  <th className="px-3 py-2.5">Asignatura</th>
                  <th className="px-3 py-2.5">Docente</th>
                  <th className="px-3 py-2.5">Estado</th>
                  <th className="px-3 py-2.5 text-right">Alumnos</th>
                  <th className="px-3 py-2.5 text-right">Clases</th>
                  <th className="px-3 py-2.5 text-right">Asistencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {asigMetricas.map((a) => (
                  <tr key={a.id} className="transition-colors hover:bg-primary/[0.03] dark:hover:bg-primary/5">
                    <td className="px-3 py-3 font-medium text-text-primary dark:text-gray-100">{a.nombre}</td>
                    <td className="px-3 py-3 text-text-secondary dark:text-gray-400">{a.docenteNombre ?? "—"}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-semibold ${ESTADO_COLORS[a.estado ?? ""] ?? "text-text-secondary dark:text-gray-400"}`}>
                        {a.estado ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-text-primary dark:text-white">{a.totalAlumnos}</td>
                    <td className="px-3 py-3 text-right font-semibold text-text-primary dark:text-white">{a.totalClases}</td>
                    <td className="px-3 py-3 text-right">
                      {a.asistenciaPromedio !== null ? (
                        <span className={`font-bold ${a.asistenciaPromedio >= 75 ? "text-success" : a.asistenciaPromedio >= 50 ? "text-amber-600 dark:text-amber-400" : "text-danger"}`}>
                          {a.asistenciaPromedio}%
                        </span>
                      ) : (
                        <span className="text-text-muted dark:text-gray-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {/* RUT search */}
      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
          Búsqueda por RUT
        </h2>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
          Consulta histórico de estudiante o docente con métricas operativas.
        </p>

        <RutBuscador defaultValue={rutConsulta} periodoId={periodoSeleccionadoId} />

        {resultadoBusqueda && !resultadoBusqueda.ok && (
          <MessageToast message={resultadoBusqueda.message} tone="error" />
        )}

        {resultadoBusqueda?.ok && (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm dark:border-primary/30 dark:bg-primary/10">
              <p className="font-semibold text-text-primary dark:text-white">
                {resultadoBusqueda.persona.nombre} {resultadoBusqueda.persona.apellido}
              </p>
              <p className="mt-1 text-text-secondary dark:text-gray-400">
                RUT: {formatRutValue(resultadoBusqueda.persona.rut)} · Rol: {resultadoBusqueda.persona.rol}
              </p>
            </div>

            {resultadoBusqueda.role === "alumno" ? (
              <>
                <div className="grid gap-3 grid-cols-2">
                  <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                    <p className="text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">Asignaturas históricas</p>
                    <p className="mt-1 text-2xl font-bold text-primary">{resultadoBusqueda.metrics.asignaturasHistoricas}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                    <p className="text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">Asignaturas activas</p>
                    <p className="mt-1 text-2xl font-bold text-success">{resultadoBusqueda.metrics.asignaturasActivas}</p>
                  </div>
                </div>

                {/* Mobile cards */}
                <div className="space-y-2 sm:hidden">
                  {resultadoBusqueda.historial.length > 0 ? (
                    resultadoBusqueda.historial.map((row) => (
                      <div key={row.matriculaId} className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
                        <p className="font-medium text-text-primary dark:text-white">{row.asignaturaNombre}</p>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-text-secondary dark:text-gray-400">
                          <span>Estado: {row.estadoAsignatura ?? "-"}</span>
                          <span>Pago: {row.estadoPago ?? "-"}</span>
                          <span>{row.activa ? "Activa" : "Inactiva"}</span>
                          <span>{formatDate(row.fechaMatricula)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-text-secondary dark:text-gray-400">Sin historial.</p>
                  )}
                </div>
                {/* Desktop table */}
                <div className="hidden overflow-x-auto sm:block">
                  <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                        <th className="px-3 py-2.5">Asignatura</th>
                        <th className="px-3 py-2.5">Estado</th>
                        <th className="px-3 py-2.5">Pago</th>
                        <th className="px-3 py-2.5">Matrícula</th>
                        <th className="px-3 py-2.5">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                      {resultadoBusqueda.historial.length > 0 ? (
                        resultadoBusqueda.historial.map((row) => (
                          <tr key={row.matriculaId}>
                            <td className="px-3 py-2.5 text-text-primary dark:text-gray-100">{row.asignaturaNombre}</td>
                            <td className="px-3 py-2.5 text-text-secondary dark:text-gray-400">{row.estadoAsignatura ?? "-"}</td>
                            <td className="px-3 py-2.5 text-text-secondary dark:text-gray-400">{row.estadoPago ?? "-"}</td>
                            <td className="px-3 py-2.5 text-text-secondary dark:text-gray-400">{row.activa ? "Activa" : "Inactiva"}</td>
                            <td className="px-3 py-2.5 text-text-secondary dark:text-gray-400">{formatDate(row.fechaMatricula)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={5} className="px-3 py-4 text-center text-text-secondary dark:text-gray-400">Sin historial.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-3 grid-cols-2">
                  <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                    <p className="text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">Cursos impartidos</p>
                    <p className="mt-1 text-2xl font-bold text-primary">{resultadoBusqueda.metrics.cursosHistoricos}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                    <p className="text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">Material cargado</p>
                    <p className="mt-1 text-2xl font-bold text-secondary">{resultadoBusqueda.metrics.materialCargado}</p>
                  </div>
                </div>

                <div className="hidden overflow-x-auto sm:block">
                  <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                        <th className="px-3 py-2.5">Asignatura</th>
                        <th className="px-3 py-2.5">Estado</th>
                        <th className="px-3 py-2.5 text-right">Estudiantes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                      {resultadoBusqueda.asignaturas.length > 0 ? (
                        resultadoBusqueda.asignaturas.map((row) => (
                          <tr key={row.asignaturaId}>
                            <td className="px-3 py-2.5 text-text-primary dark:text-gray-100">{row.asignaturaNombre}</td>
                            <td className="px-3 py-2.5 text-text-secondary dark:text-gray-400">{row.estadoAsignatura ?? "-"}</td>
                            <td className="px-3 py-2.5 text-right text-text-primary dark:text-gray-100">{row.totalEstudiantes}</td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={3} className="px-3 py-4 text-center text-text-secondary dark:text-gray-400">Sin asignaturas.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-2 sm:hidden">
                  {resultadoBusqueda.asignaturas.length > 0 ? (
                    resultadoBusqueda.asignaturas.map((row) => (
                      <div key={row.asignaturaId} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
                        <div>
                          <p className="font-medium text-text-primary dark:text-white">{row.asignaturaNombre}</p>
                          <p className="text-xs text-text-secondary dark:text-gray-400">{row.estadoAsignatura ?? "-"}</p>
                        </div>
                        <span className="text-lg font-bold text-primary">{row.totalEstudiantes}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-text-secondary dark:text-gray-400">Sin asignaturas.</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </article>

      {/* Docente summaries */}
      {resumenDocentes.length > 0 && (
        <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
            Datos Subidos por Docentes
          </h2>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Resumen de clases, asistencias, notas y observaciones por docente.
          </p>
          <div className="mt-4 space-y-3">
            {resumenDocentes.map((docente) => {
              const totalActividad = docente.asignaturas.reduce(
                (sum, a) => sum + a.totalClases + a.totalAsistencias + a.totalNotas + a.totalObservaciones,
                0,
              );
              return (
                <AccordionItem key={docente.docenteId} title={`${docente.docenteNombre} ${docente.docenteApellido}`} badge={`${totalActividad} registros`}>
                  <div className="space-y-3">
                    {docente.asignaturas.map((asig) => (
                      <div key={asig.asignaturaId} className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
                        <p className="text-sm font-medium text-text-primary dark:text-gray-100">{asig.asignaturaNombre}</p>
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {[
                            { value: asig.totalClases, label: "Clases", color: "text-primary" },
                            { value: asig.totalAsistencias, label: "Asistencias", color: "text-success" },
                            { value: asig.totalNotas, label: "Notas", color: "text-secondary" },
                            { value: asig.totalObservaciones, label: "Observaciones", color: "text-warning" },
                          ].map((m) => (
                            <div key={m.label} className="rounded-lg bg-white p-2 text-center dark:bg-gray-900">
                              <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
                              <p className="text-xs text-text-secondary dark:text-gray-400">{m.label}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionItem>
              );
            })}
          </div>
        </article>
      )}
    </section>
  );
}
