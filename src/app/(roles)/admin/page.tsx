import Link from "next/link";

import { obtenerMetricasGlobales, obtenerMetricasPorAsignatura } from "@/actions/admin-metricas";
import { obtenerResumenDatosDocentes } from "@/actions/admin-resumen";
import { buscarPersonaPorRutAdmin } from "@/actions/usuarios";
import { AccordionItem } from "@/components/shared/Accordion";
import { MessageToast } from "@/components/shared/MessageToast";
import { formatearRut } from "@/lib/rut";

const MODULE_ICONS: Record<string, string> = {
  Docentes: "M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM4 21a8 8 0 0 1 16 0",
  Alumnos: "M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21a6 6 0 0 1 12 0M14 21a5 5 0 0 1 8 0",
  Asignaturas: "M5 4.5h10.5A3.5 3.5 0 0 1 19 8v12.5H8A3 3 0 0 1 5 17.5V4.5Z",
  Matriculas: "M12 7a6.5 3.5 0 1 0 0-.01M5.5 7v10c0 1.93 2.91 3.5 6.5 3.5s6.5-1.57 6.5-3.5V7",
  Clases: "M3 4h18v17H3zM8 2v4M16 2v4M3 10h18",
  Solicitudes: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6ZM14 2v6h6",
};

const MODULE_CARDS = [
  { href: "/admin/docentes", title: "Docentes", description: "Crear y desactivar cuentas docentes." },
  { href: "/admin/alumnos", title: "Alumnos", description: "Registrar alumnos y controlar su acceso." },
  { href: "/admin/asignaturas", title: "Asignaturas", description: "Crear asignaturas y asignar docentes." },
  { href: "/admin/matriculas", title: "Matriculas", description: "Vincular alumnos a asignaturas." },
  { href: "/admin/clases", title: "Clases", description: "Programar sesiones y publicar contenido." },
  { href: "/admin/solicitudes", title: "Solicitudes", description: "Gestionar solicitudes de documentos." },
] as const;

type AdminDashboardPageProps = {
  searchParams?: { rut?: string };
};

const formatDate = (value: Date | null): string => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-CL", { year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
};

const ESTADO_COLORS: Record<string, string> = {
  activo: "text-success",
  finalizado: "text-amber-600 dark:text-amber-400",
  borrador: "text-text-secondary dark:text-gray-400",
  archivado: "text-text-muted dark:text-gray-500",
};

export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
  const rutConsulta = typeof searchParams?.rut === "string" ? searchParams.rut.trim() : "";

  const [resultadoBusqueda, resumenDocentes, metricas, asigMetricas] = await Promise.all([
    rutConsulta ? buscarPersonaPorRutAdmin({ rut: rutConsulta }) : null,
    obtenerResumenDatosDocentes(),
    obtenerMetricasGlobales(),
    obtenerMetricasPorAsignatura(),
  ]);

  return (
    <section className="space-y-5">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark p-5 shadow-lg shadow-primary/15 sm:p-6">
        <h1 className="text-xl font-bold uppercase text-white sm:text-2xl">Panel Admin</h1>
        <p className="mt-1 text-sm text-white/80">
          Centro operativo para administración académica y control de usuarios.
        </p>
      </div>

      {/* Global metrics */}
      {metricas && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {[
            { label: "Docentes", value: metricas.totalDocentes, color: "text-primary" },
            { label: "Alumnos", value: metricas.totalAlumnos, color: "text-primary" },
            { label: "Asignaturas", value: metricas.totalAsignaturas, color: "text-primary" },
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

      {/* Module cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {MODULE_CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm transition-colors hover:border-primary/30 hover:shadow-md hover:shadow-primary/10 active:scale-[0.98] dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary/40 sm:p-5"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/15 dark:bg-primary/20">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 text-primary dark:text-primary-light">
                <path strokeLinecap="round" strokeLinejoin="round" d={MODULE_ICONS[card.title] ?? ""} />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-text-primary dark:text-white sm:text-base">{card.title}</h2>
            <p className="mt-1 hidden text-xs text-text-secondary dark:text-gray-400 sm:block">{card.description}</p>
          </Link>
        ))}
      </div>

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

        <form action="/admin" method="get" className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full space-y-1.5 sm:max-w-sm">
            <label htmlFor="buscar-rut" className="text-sm font-medium text-text-primary dark:text-gray-200">RUT</label>
            <input
              id="buscar-rut"
              name="rut"
              type="text"
              inputMode="numeric"
              required
              minLength={8}
              maxLength={12}
              defaultValue={rutConsulta}
              placeholder="12.345.678-5"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-primary-light dark:focus:ring-primary/30"
            />
          </div>
          <button
            type="submit"
            className="h-12 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-6 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-colors hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] sm:h-auto sm:py-3"
          >
            Buscar
          </button>
        </form>

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
                RUT: {resultadoBusqueda.persona.rut ? formatearRut(resultadoBusqueda.persona.rut) : "-"} · Rol: {resultadoBusqueda.persona.rol}
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
