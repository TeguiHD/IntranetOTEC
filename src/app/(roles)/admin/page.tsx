import Link from "next/link";

import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  Download,
  FileCheck,
  FileText,
  IdCard,
  LayoutDashboard,
  type LucideIcon,
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
} from "@/actions/admin-metricas";
import { listarNotificacionesAdmin } from "@/actions/notificaciones";
import { PeriodoCursoSeccionPicker } from "@/components/shared/PeriodoCursoSeccionPicker";

type KpiTile = {
  label: string;
  value: number;
  href: string;
  hint?: string;
  Icon: LucideIcon;
  tone: "emerald" | "danger";
};

const TILE_TONE: Record<KpiTile["tone"], string> = {
  emerald: "border-emerald-200/80 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100",
  danger: "border-red-200/80 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100",
};

type AdminDashboardPageProps = {
  searchParams?: Promise<{ periodoId?: string }>;
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

type AccessItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
};

const ADMIN_PANEL_ACCESS: AccessItem[] = [
  { href: "/admin", label: "Panel", Icon: LayoutDashboard },
  { href: "/admin/agenda", label: "Agenda", Icon: CalendarDays },
  { href: "/admin/academico", label: "Vista academica", Icon: BookOpen },
  { href: "/admin/asignaturas", label: "Secciones", Icon: BookOpen },
  { href: "/admin/cursos", label: "Cursos", Icon: BookOpen },
  { href: "/admin/horarios", label: "Horarios", Icon: CalendarRange },
  { href: "/admin/clases", label: "Clases", Icon: CalendarDays },
  { href: "/admin/materiales", label: "Materiales", Icon: Upload },
  { href: "/admin/evaluaciones", label: "Evaluaciones", Icon: ClipboardList },
  { href: "/admin/asistencias", label: "Asistencias", Icon: ClipboardCheck },
  { href: "/admin/notas", label: "Notas", Icon: ClipboardList },
  { href: "/admin/encuestas-builder", label: "Encuestas", Icon: FileText },
  { href: "/admin/docentes", label: "Docentes", Icon: UserCog },
  { href: "/admin/alumnos", label: "Alumnos", Icon: Users },
  { href: "/admin/matriculas", label: "Matriculas", Icon: Wallet },
  { href: "/admin/administradores", label: "Administradores", Icon: Shield },
  { href: "/admin/notificaciones", label: "Notificaciones", Icon: Bell },
  { href: "/admin/solicitudes", label: "Solicitudes", Icon: FileText },
  { href: "/admin/beneficios-credenciales", label: "Beneficios y Credenciales", Icon: IdCard },
  { href: "/admin/certificados", label: "Certificados", Icon: FileCheck },
  { href: "/admin/importar", label: "Importar Alumnos", Icon: Upload },
  { href: "/admin/reportes", label: "Analitica", Icon: BarChart3 },
  { href: "/admin/historial", label: "Historial", Icon: FileText },
  { href: "/admin/finanzas", label: "Finanzas", Icon: TrendingUp },
  { href: "/instalar", label: "Instalar App", Icon: Download },
];

export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
  const params = await (searchParams ?? Promise.resolve({} as { periodoId?: string }));
  const periodoIdRaw = typeof params.periodoId === "string" ? params.periodoId.trim() : "";
  const periodoSeleccionadoId =
    periodoIdRaw && periodoIdRaw.toLowerCase() !== "all" ? periodoIdRaw : null;

  const [periodos, metricas, notificacionesRecientes] = await Promise.all([
    listarPeriodosDashboard(),
    obtenerMetricasGlobales({ periodoId: periodoSeleccionadoId }),
    listarNotificacionesAdmin(),
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
              Solicitudes pendientes
            </h2>
            <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
              Bandeja principal para revisar solicitudes administrativas pendientes.
            </p>
          </div>
          <Link
            href="/admin/solicitudes"
            className="mt-2 inline-flex h-10 items-center justify-center rounded-xl border border-primary/25 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 dark:border-primary/40 dark:text-primary-light sm:mt-0"
          >
            Ir a solicitudes
          </Link>
        </div>

        <div className="mt-4 grid gap-3">
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

      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div>
          <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
            Accesos del panel
          </h2>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Los mismos puntos del menu lateral, disponibles en el panel principal para PC y PWA.
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {ADMIN_PANEL_ACCESS.map((item) => (
            <Link
              key={item.href}
              href={item.href === "/admin/reportes" && periodoQuery ? `${item.href}${periodoQuery}` : item.href}
              className="group flex min-h-16 items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-text-primary shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:text-primary hover:shadow-md dark:border-gray-800 dark:bg-gray-950/30 dark:text-white dark:hover:border-primary/50 dark:hover:bg-primary/10 dark:hover:text-primary-light"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-white dark:bg-primary/20 dark:text-primary-light">
                <item.Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 text-sm font-semibold leading-tight">
                {item.label}
              </span>
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
