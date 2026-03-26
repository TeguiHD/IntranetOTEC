import Link from "next/link";

import {
  Brain,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileCheck,
  GraduationCap,
  IdCard,
  type LucideIcon,
  MessageSquare,
  Star,
  User,
} from "lucide-react";

import { obtenerDashboardAlumno } from "@/actions/alumno-dashboard";
import { listarObservacionesAlumno } from "@/actions/docente";
import { OnboardingModal } from "@/components/shared/OnboardingModal";

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

const ALUMNO_NAV: { href: string; title: string; gradient: string; Icon: LucideIcon }[] = [
  { href: "/alumno/asignaturas",              title: "Mis Cursos",           gradient: "grad-blue",    Icon: GraduationCap },
  { href: "/alumno/clases",                   title: "Clases",               gradient: "grad-cyan",    Icon: CalendarDays },
  { href: "/alumno/evaluaciones",             title: "Evaluaciones",         gradient: "grad-violet",  Icon: ClipboardList },
  { href: "/alumno/notas",                    title: "Mis Notas",            gradient: "grad-gold",    Icon: ClipboardList },
  { href: "/alumno/asistencias",              title: "Mi Asistencia",        gradient: "grad-emerald", Icon: ClipboardCheck },
  { href: "/alumno/encuesta-docente",         title: "Evaluar Docente",      gradient: "grad-amber",   Icon: Star },
  { href: "/alumno/test-estilos",             title: "Test Estilos",         gradient: "grad-violet",  Icon: Brain },
  { href: "/encuestas",                       title: "Mis Encuestas",        gradient: "grad-indigo",  Icon: MessageSquare },
  { href: "/alumno/solicitudes/credencial",   title: "Credencial",           gradient: "grad-violet",  Icon: IdCard },
  { href: "/alumno/solicitudes/alumno-regular", title: "Cert. Alumno Regular", gradient: "grad-blue", Icon: FileCheck },
  { href: "/alumno/solicitudes/tarjeta-beneficio", title: "Tarjeta de Beneficio", gradient: "grad-pink", Icon: CreditCard },
  { href: "/alumno/perfil",                   title: "Mi Perfil",            gradient: "grad-blue",    Icon: User },
];

const TIPO_EVAL_LABELS: Record<string, string> = {
  formulario: "Formulario",
  tarea: "Tarea",
  examen: "Examen",
  proyecto: "Proyecto",
};

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

function formatFechaFull(value: string | Date | null): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value + "T12:00:00") : value;
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

function tiempoRestante(fecha: Date | null): string | null {
  if (!fecha) return null;
  const ahora = new Date();
  const diff = fecha.getTime() - ahora.getTime();
  if (diff <= 0) return "Vencida";
  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (dias > 0) return `${dias}d ${horas}h`;
  return `${horas}h`;
}

export const metadata = {
  title: "Dashboard",
};

export default async function AlumnoDashboardPage() {
  let data;
  let observaciones: Awaited<ReturnType<typeof listarObservacionesAlumno>> = [];

  try {
    [data, observaciones] = await Promise.all([
      obtenerDashboardAlumno(),
      listarObservacionesAlumno(),
    ]);
  } catch {
    observaciones = [];
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

  const { resumen, cursos, proximasClases, evaluacionesPendientes, notasRecientes, notasDocenteRecientes } = data;
  const evalSinNota = evaluacionesPendientes.filter((e) => !e.tieneNota);

  return (
    <section className="space-y-5">
      <OnboardingModal />
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

      {/* Quick nav */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {ALUMNO_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex flex-col items-center gap-2 rounded-2xl border border-gray-200/80 bg-white p-4 text-center shadow-sm transition-all hover:shadow-lg hover:shadow-primary/10 active:scale-[0.98] dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary/40"
          >
            <item.Icon
              className="h-10 w-10 transition-transform duration-200 group-hover:scale-110"
              strokeWidth={1.5}
              style={{ color: GRADIENT_COLORS[item.gradient] ?? "#6B7280" }}
            />
            <p className="text-xs font-semibold leading-tight text-text-primary dark:text-white">{item.title}</p>
          </Link>
        ))}
      </div>

      {/* Upcoming classes */}
      {proximasClases.length > 0 && (
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
                      {clase.horaInicio.slice(0, 5)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </article>
      )}

      {/* Pending evaluations */}
      {evalSinNota.length > 0 && (
        <article className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-5 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20 sm:p-6">
          <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
            Evaluaciones Pendientes
          </h2>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Actividades y entregas que requieren tu atención.
          </p>

          <div className="mt-4 space-y-2">
            {evalSinNota.map((ev) => {
              const restante = tiempoRestante(ev.fechaLimite);
              const vencida = restante === "Vencida";

              return (
                <div
                  key={ev.evaluacionId}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary dark:bg-primary/20 dark:text-primary-light">
                        {TIPO_EVAL_LABELS[ev.tipo] ?? ev.tipo}
                      </span>
                      <p className="truncate text-sm font-medium text-text-primary dark:text-white">
                        {ev.titulo}
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs text-text-secondary dark:text-gray-400">
                      {ev.asignaturaNombre}
                    </p>
                  </div>
                  {restante && (
                    <div className="ml-3 text-right">
                      <p className={`text-sm font-bold ${vencida ? "text-danger" : "text-amber-600 dark:text-amber-400"}`}>
                        {restante}
                      </p>
                      {ev.fechaLimite && (
                        <p className="text-[10px] text-text-muted dark:text-gray-500">
                          {formatFechaFull(ev.fechaLimite)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </article>
      )}

      {/* Recent grades */}
      {(notasRecientes.length > 0 || notasDocenteRecientes.length > 0) && (
        <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
            Notas Recientes
          </h2>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Últimas calificaciones registradas.
          </p>

          <div className="mt-4 space-y-2">
            {notasRecientes.map((n) => (
              <div
                key={n.notaId}
                className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-gray-800/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-text-primary dark:text-white">
                    {n.evaluacionTitulo}
                  </p>
                  <p className="text-xs text-text-secondary dark:text-gray-400">
                    {n.asignaturaNombre} · {TIPO_EVAL_LABELS[n.evaluacionTipo] ?? n.evaluacionTipo}
                  </p>
                </div>
                <div className="ml-3 text-right">
                  <p className={`text-lg font-bold ${Number(n.nota) >= 4.0 ? "text-success" : "text-danger"}`}>
                    {n.nota ?? "-"}
                  </p>
                  <p className="text-[10px] text-text-muted dark:text-gray-500">
                    {formatFecha(n.fechaNota)}
                  </p>
                </div>
              </div>
            ))}

            {notasDocenteRecientes.map((n) => (
              <div
                key={n.id}
                className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-gray-800/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-text-primary dark:text-white">
                    Nota Docente
                  </p>
                  <p className="text-xs text-text-secondary dark:text-gray-400">
                    {n.asignaturaNombre}
                  </p>
                </div>
                <div className="ml-3 text-right">
                  <p className={`text-lg font-bold ${Number(n.nota) >= 4.0 ? "text-success" : "text-danger"}`}>
                    {n.nota}
                  </p>
                  <p className="text-[10px] text-text-muted dark:text-gray-500">
                    {formatFecha(n.fechaRegistro)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </article>
      )}

      {/* Observaciones de docentes */}
      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
          Observaciones de Docentes
        </h2>
        {observaciones.length === 0 ? (
          <p className="mt-4 text-sm text-text-secondary dark:text-gray-400">
            No tienes observaciones registradas por tus docentes.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {observaciones.slice(0, 10).map((obs) => (
              <div
                key={obs.id}
                className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-gray-800/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-text-primary dark:text-gray-100">{obs.observacion}</p>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-medium text-primary dark:text-primary-light">
                      {formatFecha(obs.fechaRegistro)}
                    </p>
                    <p className="text-[10px] text-text-muted dark:text-gray-500">{obs.asignaturaNombre}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>

      {/* Enrolled courses */}
      {cursos.length > 0 && (
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
      {cursos.length === 0 && proximasClases.length === 0 && (
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
