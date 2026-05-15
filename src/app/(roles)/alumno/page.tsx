import Link from "next/link";

import {
  Award,
  Bell,
  Brain,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileText,
  GraduationCap,
  IdCard,
  type LucideIcon,
  MessageSquare,
  Star,
  User,
} from "lucide-react";

import { obtenerAccesoDocumentosAlumnoActual } from "@/actions/accesos-documentos";
import { obtenerDashboardAlumno } from "@/actions/alumno-dashboard";
import { listarMisNotificaciones } from "@/actions/notificaciones";
import { normalizarTextoVisible } from "@/lib/displayText";

const GRADIENT_COLORS: Record<string, string> = {
  "grad-purple": "#8B3A9E",
  "grad-blue": "#3B82F6",
  "grad-cyan": "#06B6D4",
  "grad-amber": "#F5A623",
  "grad-emerald": "#10B981",
  "grad-pink": "#EC4899",
  "grad-violet": "#8B5CF6",
  "grad-gold": "#F5A623",
  "grad-indigo": "#6366F1",
};

type AlumnoNavItem = { href: string; title: string; gradient: string; Icon: LucideIcon };

const ALUMNO_NAV_ACADEMICO: AlumnoNavItem[] = [
  { href: "/alumno/asignaturas",  title: "Mis Cursos",    gradient: "grad-blue",    Icon: GraduationCap },
  { href: "/alumno/materiales",    title: "Materiales",    gradient: "grad-emerald", Icon: FileText },
  { href: "/alumno/calendario",   title: "Calendario",    gradient: "grad-cyan",    Icon: CalendarDays },
  { href: "/alumno/clases",       title: "Clases",        gradient: "grad-cyan",    Icon: CalendarDays },
  { href: "/alumno/evaluaciones", title: "Evaluaciones",  gradient: "grad-violet",  Icon: ClipboardList },
  { href: "/alumno/notas",        title: "Mis Notas",     gradient: "grad-gold",    Icon: ClipboardList },
  { href: "/alumno/asistencias",  title: "Mi Asistencia", gradient: "grad-emerald", Icon: ClipboardCheck },
  { href: "/alumno/encuesta-docente", title: "Evaluar Docente", gradient: "grad-amber", Icon: Star },
  { href: "/alumno/test-estilos", title: "Test Estilos",  gradient: "grad-violet",  Icon: Brain },
  { href: "/encuestas",           title: "Mis Encuestas", gradient: "grad-indigo",  Icon: MessageSquare },
];

const ALUMNO_NAV_GESTION: AlumnoNavItem[] = [
  { href: "/alumno/certificados",                    title: "Mis Certificados", gradient: "grad-purple", Icon: Award },
  { href: "/alumno/solicitudes/credencial",        title: "Credencial",         gradient: "grad-violet", Icon: IdCard },
  { href: "/alumno/solicitudes/tarjeta-beneficio", title: "Tarjeta Beneficio",  gradient: "grad-pink",   Icon: CreditCard },
  { href: "/alumno/notificaciones",                title: "Notificaciones",     gradient: "grad-amber",  Icon: Bell },
  { href: "/alumno/perfil",                        title: "Mi Perfil",          gradient: "grad-blue",   Icon: User },
];

const ESTADO_COLORS: Record<string, string> = {
  activo: "text-success",
  finalizado: "text-amber-600 dark:text-amber-400",
  borrador: "text-text-secondary dark:text-gray-400",
  archivado: "text-text-muted dark:text-gray-500",
};

const PAGO_COLORS: Record<string, string> = {
  pagado: "text-success",
  pendiente: "text-amber-600 dark:text-amber-400",
  mora: "text-danger",
  becado: "text-primary dark:text-primary-light",
};

function formatFecha(value: string | Date | null): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value + "T12:00:00") : value;
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short" }).format(d);
}

export const metadata = {
  title: "Dashboard",
};

export default async function AlumnoDashboardPage() {
  let data;
  let notificacionesRecientes: Awaited<ReturnType<typeof listarMisNotificaciones>> = [];

  try {
    [data, notificacionesRecientes] = await Promise.all([
      obtenerDashboardAlumno(),
      listarMisNotificaciones(),
    ]);
  } catch {
    return (
      <section className="space-y-5">
        <div className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark p-5 shadow-lg shadow-primary/15 sm:p-6">
          <h1 className="text-xl font-bold uppercase text-white sm:text-2xl">Panel Alumno</h1>
        </div>
        <article className="rounded-xl border border-danger/30 bg-danger/5 p-6 dark:border-danger/40 dark:bg-danger/10">
          <p className="text-sm font-medium text-danger">
            No fue posible cargar tu panel. Intenta recargar la página.
          </p>
        </article>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="space-y-5">
        <div className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark p-5 shadow-lg shadow-primary/15 sm:p-6">
          <h1 className="text-xl font-bold uppercase text-white sm:text-2xl">Panel Alumno</h1>
          <p className="mt-1 text-sm text-white/80">No fue posible cargar tus datos.</p>
        </div>
      </section>
    );
  }

  const { resumen, cursos, proximasClases, estaSemanaPendiente } = data;
  const hoyStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const clasesHoy = proximasClases.filter((c) => c.fecha === hoyStr);
  const accesos = await obtenerAccesoDocumentosAlumnoActual();
  const gestionItems = ALUMNO_NAV_GESTION.filter((item) => {
    if (item.href === "/alumno/solicitudes/credencial") return accesos?.credencialHabilitada ?? true;
    if (item.href === "/alumno/solicitudes/tarjeta-beneficio") return accesos?.beneficioHabilitado ?? true;
    return true;
  });

  return (
    <section className="space-y-5">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark p-5 shadow-lg shadow-primary/15 sm:p-6">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-intranet.webp" alt="OTEC" className="h-10 w-10 rounded-xl object-contain bg-white/10 p-1" />
          <div>
            <h1 className="text-xl font-bold uppercase text-white sm:text-2xl">Panel Alumno</h1>
            <p className="mt-0.5 text-sm text-white/80">
              Resumen de tu actividad académica y accesos rápidos.
            </p>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-2xl font-bold text-primary">{resumen.cursosActivos}</p>
          <p className="text-xs text-text-secondary dark:text-gray-400">Cursos Activos</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-2xl font-bold text-success">
            {resumen.asistenciaPromedio !== null ? `${resumen.asistenciaPromedio}%` : "-"}
          </p>
          <p className="text-xs text-text-secondary dark:text-gray-400">Asistencia</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-2xl font-bold text-secondary">
            {resumen.notaPromedio !== null ? resumen.notaPromedio.toFixed(1) : "-"}
          </p>
          <p className="text-xs text-text-secondary dark:text-gray-400">Promedio Notas</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className={`text-2xl font-bold ${resumen.solicitudesPendientes > 0 ? "text-amber-600 dark:text-amber-400" : "text-success"}`}>
            {resumen.solicitudesPendientes}
          </p>
          <p className="text-xs text-text-secondary dark:text-gray-400">Solicitudes Pend.</p>
        </div>
      </div>

      {/* Notificaciones recientes */}
      {notificacionesRecientes.length > 0 && (
        <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-white">
              <Bell className="h-4 w-4 text-amber-500" />
              Notificaciones
              {notificacionesRecientes.filter((n) => !n.leidoAt).length > 0 && (
                <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                  {notificacionesRecientes.filter((n) => !n.leidoAt).length}
                </span>
              )}
            </h2>
            <Link
              href="/alumno/notificaciones"
              className="text-xs font-medium text-primary hover:underline dark:text-primary-light"
            >
              Ver todas
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {notificacionesRecientes.slice(0, 3).map((n) => (
              <div
                key={n.id}
                className={`rounded-xl p-3 text-sm ${
                  n.leidoAt
                    ? "bg-gray-50 dark:bg-gray-800/50"
                    : "bg-primary/[0.04] ring-1 ring-primary/10 dark:bg-primary/5"
                }`}
              >
                <div className="flex items-center gap-2">
                  {!n.leidoAt && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                  <span className="font-medium text-text-primary dark:text-white">{n.titulo}</span>
                </div>
                <p className="mt-0.5 line-clamp-1 text-xs text-text-secondary dark:text-gray-400">
                  {n.contenido}
                </p>
              </div>
            ))}
          </div>
        </article>
      )}

      {/* Esta semana */}
      {false && estaSemanaPendiente.length > 0 && (
        <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-4 dark:border-primary/30 dark:from-primary/10 dark:to-primary/5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-primary dark:text-primary-light">
            Esta semana
          </h2>
          <ul className="space-y-2">
            {estaSemanaPendiente.map((act, i) => {
              const fechaLabel = new Intl.DateTimeFormat("es-CL", {
                weekday: "short",
                day: "numeric",
                month: "short",
                ...(act.tipo === "evaluacion" ? { hour: "2-digit", minute: "2-digit" } : {}),
              }).format(act.fecha);
              return (
                <li key={i}>
                  <Link
                    href={act.href}
                    className={`flex items-start gap-3 rounded-xl border p-3 transition-colors hover:bg-white/70 dark:hover:bg-gray-800/50 ${
                      act.urgente
                        ? "border-red-200 bg-red-50/60 dark:border-red-800/50 dark:bg-red-950/20"
                        : "border-gray-200/60 bg-white/60 dark:border-gray-700/40 dark:bg-gray-900/40"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        act.tipo === "evaluacion"
                          ? "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300"
                          : "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300"
                      }`}
                    >
                      {act.tipo === "evaluacion" ? "E" : "C"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary dark:text-white">
                        {normalizarTextoVisible(act.titulo)}
                      </p>
                      <p className="text-xs text-text-secondary dark:text-gray-400">
                        {normalizarTextoVisible(act.asignaturaNombre)} · {fechaLabel}
                      </p>
                    </div>
                    {act.urgente && (
                      <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/50 dark:text-red-300">
                        Urgente
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Quick nav — Académico */}
      <div>
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-text-muted dark:text-gray-500">
          Académico
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {ALUMNO_NAV_ACADEMICO.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-gray-200/80 bg-white p-3 text-center shadow-sm transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:shadow-lg hover:shadow-primary/10 active:scale-[0.98] dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary/40"
            >
              <item.Icon
                className="h-8 w-8 transition-transform duration-200 group-hover:scale-110"
                strokeWidth={1.5}
                style={{ color: GRADIENT_COLORS[item.gradient] ?? "#6B7280" }}
              />
              <p className="text-[11px] font-semibold leading-tight text-text-primary dark:text-white">{item.title}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick nav — Gestiones */}
      <div>
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-text-muted dark:text-gray-500">
          Gestiones
        </p>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
          {gestionItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-gray-200/80 bg-white p-3 text-center shadow-sm transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:shadow-lg hover:shadow-primary/10 active:scale-[0.98] dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary/40"
            >
              <item.Icon
                className="h-8 w-8 transition-transform duration-200 group-hover:scale-110"
                strokeWidth={1.5}
                style={{ color: GRADIENT_COLORS[item.gradient] ?? "#6B7280" }}
              />
              <p className="text-[11px] font-semibold leading-tight text-text-primary dark:text-white">{item.title}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Upcoming classes */}
      {false && proximasClases.length > 0 && (
        <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
            Próximas Clases
          </h2>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Sesiones programadas en tus cursos activos.
          </p>

          <div className="mt-4 space-y-2">
            {proximasClases.slice(0, 5).map((clase) => (
              <div
                key={clase.claseId}
                className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-gray-800/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-text-primary dark:text-white">
                    {normalizarTextoVisible(clase.titulo)}
                  </p>
                  <p className="text-xs text-text-secondary dark:text-gray-400">
                    {normalizarTextoVisible(clase.asignaturaNombre)} · Sesión {clase.numeroSesion}
                  </p>
                </div>
                <div className="ml-3 text-right">
                  <p className="text-sm font-semibold text-primary dark:text-primary-light">
                    {formatFecha(clase.fecha)}
                  </p>
                  {clase.horaInicio && (
                    <p className="text-xs text-text-secondary dark:text-gray-400">
                      {clase.horaInicio.slice(0, 5)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </article>
      )}

      {/* Clases de hoy */}
      <article className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-emerald-100/40 p-5 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/30 dark:to-emerald-900/10 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary dark:text-white sm:text-lg">
            <CalendarDays className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Clases de Hoy
          </h2>
          <Link
            href="/alumno/clases"
            className="text-xs font-medium text-primary hover:underline dark:text-primary-light"
          >
            Ver todas
          </Link>
        </div>

        {clasesHoy.length === 0 ? (
          <p className="mt-4 text-sm text-text-secondary dark:text-gray-400">
            No tienes clases programadas para hoy.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {clasesHoy.map((clase) => (
              <li
                key={clase.claseId}
                className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200/60 bg-white/80 p-3 backdrop-blur dark:border-emerald-800/40 dark:bg-gray-900/60"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                      Sesión {clase.numeroSesion}
                    </span>
                    <p className="truncate text-sm font-semibold text-text-primary dark:text-white">
                      {normalizarTextoVisible(clase.titulo)}
                    </p>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-text-secondary dark:text-gray-400">
                    {normalizarTextoVisible(clase.asignaturaNombre)}
                  </p>
                </div>
                {clase.horaInicio && (
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                      {clase.horaInicio.slice(0, 5)}
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </article>

      {false && cursos.length > 0 && (
        <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
            Mis Cursos Inscritos
          </h2>

          <div className="mt-4 space-y-2">
            {cursos.map((curso) => (
              <div
                key={curso.matriculaId}
                className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-gray-800/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-text-primary dark:text-white">
                    {curso.nombre}
                  </p>
                  <p className="text-xs text-text-secondary dark:text-gray-400">
                    {curso.codigo ? `${curso.codigo} · ` : ""}
                    <span className={ESTADO_COLORS[curso.estado ?? ""] ?? ""}>
                      {curso.estado ?? "-"}
                    </span>
                  </p>
                </div>
                <div className="ml-3 text-right">
                  <span className={`text-xs font-semibold ${PAGO_COLORS[curso.estadoPago ?? ""] ?? "text-text-secondary"}`}>
                    {curso.estadoPago ?? "-"}
                  </span>
                  <p className="text-[10px] text-text-muted dark:text-gray-500">
                    {formatFecha(curso.fechaInicio)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </article>
      )}

      {/* Empty state */}
      {cursos.length === 0 && (
        <article className="rounded-2xl border border-gray-200/80 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.2" className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600">
            <path strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" d="M22 10v6M2 10l10-5 10 5-10 5z M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" />
          </svg>
          <h2 className="mt-4 text-lg font-semibold text-text-primary dark:text-white">
            Sin cursos matriculados
          </h2>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Cuando te matriculen en un curso, verás aquí tu información académica.
          </p>
        </article>
      )}
    </section>
  );
}
