import Link from "next/link";

import {
  AlertTriangle,
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
  FileUp,
  FolderUp,
  GraduationCap,
  IdCard,
  Inbox,
  Layers,
  LayoutGrid,
  type LucideIcon,
  MessageSquareText,
  PencilLine,
  PlaySquare,
  Settings2,
  Shield,
  ShieldCheck,
  TrendingUp,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";

import {
  listarPeriodosDashboard,
  obtenerMetricasGlobales,
  obtenerSeccionesSinClasesAdmin,
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

type AccessGroup = {
  titulo: string;
  descripcion: string;
  items: AccessItem[];
};

const ADMIN_PANEL_GROUPS: AccessGroup[] = [
  {
    titulo: "Académico",
    descripcion: "Oferta, calendario y operación del aula.",
    items: [
      { href: "/admin/academico", label: "Vista académica", Icon: LayoutGrid },
      { href: "/admin/cursos", label: "Cursos", Icon: BookOpen },
      { href: "/admin/asignaturas", label: "Secciones", Icon: Layers },
      { href: "/admin/periodos", label: "Periodos", Icon: CalendarRange },
      { href: "/admin/horarios", label: "Horarios", Icon: Settings2 },
      { href: "/admin/agenda", label: "Agenda", Icon: CalendarDays },
      { href: "/admin/clases", label: "Clases", Icon: PlaySquare },
    ],
  },
  {
    titulo: "Personas",
    descripcion: "Docentes, alumnos y permisos administrativos.",
    items: [
      { href: "/admin/docentes", label: "Docentes", Icon: UserCog },
      { href: "/admin/alumnos", label: "Alumnos", Icon: Users },
      { href: "/admin/administradores", label: "Administradores", Icon: Shield },
      { href: "/admin/matriculas", label: "Matrículas", Icon: Wallet },
    ],
  },
  {
    titulo: "Operaciones",
    descripcion: "Material académico, evaluación y comunicación.",
    items: [
      { href: "/admin/materiales", label: "Materiales", Icon: FolderUp },
      { href: "/admin/evaluaciones", label: "Evaluaciones", Icon: ClipboardList },
      { href: "/admin/notas", label: "Notas", Icon: PencilLine },
      { href: "/admin/asistencias", label: "Asistencias", Icon: ClipboardCheck },
      { href: "/admin/encuestas-builder", label: "Encuestas", Icon: MessageSquareText },
      { href: "/admin/notificaciones", label: "Notificaciones", Icon: Bell },
      { href: "/admin/solicitudes", label: "Solicitudes", Icon: Inbox },
      { href: "/admin/importar", label: "Importar alumnos", Icon: FileUp },
    ],
  },
  {
    titulo: "Reportes y administración",
    descripcion: "Indicadores, finanzas, certificados y auditoría.",
    items: [
      { href: "/admin/reportes", label: "Analítica", Icon: BarChart3 },
      { href: "/admin/finanzas", label: "Finanzas", Icon: TrendingUp },
      { href: "/admin/certificados", label: "Certificados", Icon: FileCheck },
      { href: "/admin/historial", label: "Historial académico", Icon: GraduationCap },
      { href: "/admin/auditoria", label: "Auditoría", Icon: ShieldCheck },
      { href: "/admin/beneficios-credenciales", label: "Beneficios", Icon: IdCard },
      { href: "/instalar", label: "Instalar app", Icon: Download },
    ],
  },
];

export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
  const params = await (searchParams ?? Promise.resolve({} as { periodoId?: string }));
  const periodoIdRaw = typeof params.periodoId === "string" ? params.periodoId.trim() : "";
  const periodoSeleccionadoId =
    periodoIdRaw && periodoIdRaw.toLowerCase() !== "all" ? periodoIdRaw : null;

  const [periodos, metricas, notificacionesRecientes, seccionesSinClases] = await Promise.all([
    listarPeriodosDashboard(),
    obtenerMetricasGlobales({ periodoId: periodoSeleccionadoId }),
    listarNotificacionesAdmin(),
    obtenerSeccionesSinClasesAdmin(),
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
      {seccionesSinClases.length > 0 ? (
        <article className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm dark:border-amber-800 dark:bg-amber-950/30 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-800 dark:bg-amber-800/60 dark:text-amber-100">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
                {seccionesSinClases.length} secci{seccionesSinClases.length === 1 ? "ón" : "ones"}{" "}
                sin calendario asignado
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
                Tienen alumnos matriculados pero ninguna clase publicada. Los alumnos no verán
                clases en su calendario hasta que se asigne día/hora a la sección.
              </p>
              <ul className="mt-3 space-y-1.5">
                {seccionesSinClases.slice(0, 5).map((s) => (
                  <li key={s.asignaturaId}>
                    <Link
                      href={`/admin/secciones/${s.asignaturaId}`}
                      className="group flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs transition hover:border-amber-400 hover:bg-amber-100/50 dark:border-amber-900 dark:bg-amber-950/40 dark:hover:border-amber-700 dark:hover:bg-amber-900/40"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-amber-900 dark:text-amber-100">
                          {s.asignaturaNombre}
                        </span>
                        <span className="block truncate text-[11px] text-amber-700 dark:text-amber-300">
                          {s.cursoNombre} · periodo {s.periodoCodigo}
                          {s.sinDia ? " · nombre sin día (Lun/Mar/…)" : ""}
                        </span>
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-2">
                        <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-800/60 dark:text-amber-100">
                          {s.totalMatriculas} alumno{s.totalMatriculas === 1 ? "" : "s"}
                        </span>
                        <span className="text-[11px] font-semibold text-amber-700 group-hover:text-amber-900 dark:text-amber-300 dark:group-hover:text-amber-100">
                          Configurar →
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
                {seccionesSinClases.length > 5 ? (
                  <li className="px-1 text-[11px] text-amber-700 dark:text-amber-300">
                    + {seccionesSinClases.length - 5} más
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        </article>
      ) : null}

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
            Accesos rápidos
          </h2>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Áreas operativas agrupadas. Cada tarjeta abre la sección completa con sus métricas y
            acciones.
          </p>
        </div>

        <div className="mt-5 space-y-6">
          {ADMIN_PANEL_GROUPS.map((grupo) => (
            <div key={grupo.titulo}>
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-primary dark:text-primary-light">
                  {grupo.titulo}
                </h3>
                <p className="hidden text-[11px] text-text-secondary dark:text-gray-400 sm:block">
                  {grupo.descripcion}
                </p>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
                {grupo.items.map((item) => (
                  <Link
                    key={item.href}
                    href={
                      item.href === "/admin/reportes" && periodoQuery
                        ? `${item.href}${periodoQuery}`
                        : item.href
                    }
                    className="group flex min-h-[72px] items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-text-primary shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:text-primary hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-gray-800 dark:bg-gray-950/30 dark:text-white dark:hover:border-primary/50 dark:hover:bg-primary/10 dark:hover:text-primary-light"
                  >
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-white dark:bg-primary/20 dark:text-primary-light">
                      <item.Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 text-sm font-semibold leading-tight">
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
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
