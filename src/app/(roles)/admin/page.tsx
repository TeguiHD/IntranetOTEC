import Link from "next/link";

import {
  Award,
  Bell,
  BookOpen,
  Brain,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileText,
  IdCard,
  type LucideIcon,
  MessageSquare,
  Shield,
  TrendingUp,
  Upload,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";

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
import { formatearRut } from "@/lib/rut";
import { RutBuscador } from "./RutBuscador";

const GRADIENT_COLORS: Record<string, string> = {
  "grad-purple": "#8B3A9E",
  "grad-blue": "#3B82F6",
  "grad-cyan": "#06B6D4",
  "grad-teal": "#14B8A6",
  "grad-amber": "#F5A623",
  "grad-emerald": "#10B981",
  "grad-pink": "#EC4899",
  "grad-violet": "#8B5CF6",
  "grad-gold": "#F5A623",
  "grad-slate": "#64748B",
  "grad-indigo": "#6366F1",
};

const MODULE_CARDS: { href: string; title: string; description: string; gradient: string; Icon: LucideIcon }[] = [
  { href: "/admin/agenda",            title: "Agenda",                description: "Calendario operativo por dia con foco academico.",    gradient: "grad-teal",    Icon: CalendarDays },
  { href: "/admin/asignaturas",       title: "Secciones",             description: "Gestion de secciones, fechas y responsables.",        gradient: "grad-blue",    Icon: BookOpen },
  { href: "/admin/clases",            title: "Clases",                description: "Programacion diaria de sesiones y material.",         gradient: "grad-cyan",    Icon: CalendarDays },
  { href: "/admin/evaluaciones",      title: "Evaluaciones",          description: "Control de instrumentos y entregas.",                 gradient: "grad-violet",  Icon: ClipboardList },
  { href: "/admin/notas",             title: "Notas",                 description: "Revision y ajuste de calificaciones.",                gradient: "grad-gold",    Icon: ClipboardList },
  { href: "/admin/asistencias",       title: "Asistencias",           description: "Seguimiento de presencia por clase.",                gradient: "grad-emerald", Icon: ClipboardCheck },
  { href: "/admin/docentes",          title: "Docentes",              description: "Administracion de docentes y activacion.",            gradient: "grad-amber",   Icon: UserCog },
  { href: "/admin/alumnos",           title: "Alumnos",               description: "Control de alumnos activos y estado.",               gradient: "grad-emerald", Icon: Users },
  { href: "/admin/matriculas",        title: "Matriculas",            description: "Relacion alumno-seccion y vigencia.",               gradient: "grad-pink",    Icon: Wallet },
  { href: "/admin/importar",          title: "Importar Alumnos",      description: "Carga Excel con consolidacion inteligente.",          gradient: "grad-emerald", Icon: Upload },
  { href: "/admin/notificaciones",    title: "Notificaciones",        description: "Comunicacion masiva y por curso.",                   gradient: "grad-amber",   Icon: Bell },
  { href: "/admin/solicitudes",       title: "Solicitudes",           description: "Bandeja de solicitudes administrativas.",             gradient: "grad-violet",  Icon: FileText },
  { href: "/admin/beneficios-credenciales", title: "Beneficios y Credenciales", description: "Habilita accesos por alumno o curso.",       gradient: "grad-pink",    Icon: IdCard },
  { href: "/admin/certificados",      title: "Certificados",          description: "Emision, descarga e invalidacion.",                  gradient: "grad-blue",    Icon: Award },
  { href: "/admin/reportes",          title: "Reportes",              description: "Analitica de rendimiento, notas y asistencia.",       gradient: "grad-purple",  Icon: TrendingUp },
  { href: "/admin/encuestas-builder", title: "Encuestas",             description: "Constructor y gestion de encuestas.",                 gradient: "grad-indigo",  Icon: MessageSquare },
  { href: "/admin/test-estilos",      title: "Test Estilos",          description: "Resultados de estilos de aprendizaje.",              gradient: "grad-violet",  Icon: Brain },
  { href: "/admin/administradores",   title: "Administradores",       description: "Cuentas con acceso total al panel.",                 gradient: "grad-purple",  Icon: Shield },
  { href: "/admin/finanzas",          title: "Finanzas",              description: "Registro de ingresos y gastos.",                     gradient: "grad-emerald", Icon: TrendingUp },
  { href: "/admin/auditoria",         title: "Auditoria",             description: "Trazabilidad de acciones del sistema.",              gradient: "grad-slate",   Icon: ClipboardList },
];

type AdminDashboardPageProps = {
  searchParams?: Promise<{ rut?: string; periodoId?: string }>;
};

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

  const [periodos, resultadoBusqueda, resumenDocentes, metricas, asigMetricas, notificacionesRecientes] = await Promise.all([
    listarPeriodosDashboard(),
    rutConsulta ? buscarPersonaPorRutAdmin({ rut: rutConsulta }) : null,
    obtenerResumenDatosDocentes({ periodoId: periodoSeleccionadoId }),
    obtenerMetricasGlobales({ periodoId: periodoSeleccionadoId }),
    obtenerMetricasPorAsignatura({ periodoId: periodoSeleccionadoId }),
    listarNotificacionesAdmin(),
  ]);

  const periodoSeleccionado =
    periodoSeleccionadoId !== null
      ? periodos.find((periodo) => periodo.id === periodoSeleccionadoId) ?? null
      : null;

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
            <label htmlFor="periodo-dashboard" className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
              Vista por periodo academico
            </label>
            <select
              id="periodo-dashboard"
              name="periodoId"
              defaultValue={periodoSeleccionadoId ?? "all"}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="all">Todos los periodos</option>
              {periodos.map((periodo) => (
                <option key={periodo.id} value={periodo.id}>
                  {periodo.codigo} · {periodo.nombre} ({ESTADO_PERIODO_LABELS[periodo.estado]})
                </option>
              ))}
            </select>
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

      {/* Module cards - vivoDuoc style grid */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {MODULE_CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group flex flex-col items-center gap-2 rounded-2xl border border-gray-200/80 bg-white p-4 text-center shadow-sm transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:shadow-lg hover:shadow-primary/10 active:scale-[0.98] dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary/40"
          >
            <card.Icon
              className="h-10 w-10 transition-transform duration-200 group-hover:scale-110"
              style={{ color: GRADIENT_COLORS[card.gradient] ?? "#8B3A9E" }}
              strokeWidth={1.5}
            />
            <p className="text-xs font-semibold leading-tight text-text-primary dark:text-white">{card.title}</p>
          </Link>
        ))}
      </div>

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
