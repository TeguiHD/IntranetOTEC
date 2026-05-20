import { CheckCircle2, Search, Users, XCircle } from "lucide-react";
import Link from "next/link";

import { listarPeriodosDashboard } from "@/actions/admin-metricas";
import { listarAsignaturasAdmin } from "@/actions/asignaturas";
import {
  actualizarAsistenciaAdminFormAction,
  countAsistenciasAdmin,
  crearAsistenciaAdminFormAction,
  listarAsistenciasAdmin,
  listarClasesParaAsistenciaAdmin,
  listarMatriculasParaAsistenciaAdmin,
  resumenAsistenciasAdmin,
} from "@/actions/admin-asistencias";
import { formatearRut } from "@/lib/rut";
import { Pagination } from "@/components/shared/Pagination";
import { PeriodoCursoSeccionPicker } from "@/components/shared/PeriodoCursoSeccionPicker";
import { RouteStateToast } from "@/components/shared/RouteStateToast";

const PAGE_SIZE = 50;

const ESTADO_STYLES: Record<string, string> = {
  presente: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  ausente: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  tardanza: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  justificado: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
};

const ESTADO_LABELS: Record<string, string> = {
  presente: "Presente",
  ausente: "Ausente",
  tardanza: "Tardanza",
  justificado: "Justificado",
};

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  attendance_created: { tone: "success", text: "Asistencia registrada correctamente." },
  attendance_updated: { tone: "success", text: "Asistencia actualizada correctamente." },
  invalid_input: { tone: "error", text: "Revisa clase, alumno y estado antes de guardar." },
  clase_not_found: { tone: "error", text: "Clase no encontrada." },
  matricula_not_found: { tone: "error", text: "La matricula seleccionada no pertenece a la seccion." },
  attendance_not_found: { tone: "error", text: "El registro de asistencia no existe." },
  forbidden: { tone: "error", text: "No tienes permisos para esta accion." },
  error: { tone: "error", text: "No fue posible completar la accion." },
};

function formatFecha(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value + "T12:00:00");
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export const metadata = {
  title: "Asistencias — Admin",
};

type AdminAsistenciasPageProps = {
  searchParams?: Promise<{
    q?: string;
    periodoId?: string;
    asignaturaId?: string;
    page?: string;
    state?: string;
  }>;
};

export default async function AdminAsistenciasPage({ searchParams }: AdminAsistenciasPageProps) {
  const params = await (searchParams ?? Promise.resolve({} as { q?: string; periodoId?: string; asignaturaId?: string; page?: string; state?: string }));
  const q = typeof params.q === "string" ? params.q.trim() : undefined;
  const requestedPeriodoId = typeof params.periodoId === "string" ? params.periodoId.trim() : "";

  const periodos = await listarPeriodosDashboard();
  const defaultPeriodoId = periodos.find((p) => p.estado === "activo")?.id ?? periodos[0]?.id ?? "";
  const selectedPeriodoId =
    requestedPeriodoId && periodos.some((p) => p.id === requestedPeriodoId)
      ? requestedPeriodoId
      : defaultPeriodoId;

  const asignaturas = await listarAsignaturasAdmin(
    { limit: 1000, offset: 0 },
    { incluirArchivadas: true, periodoId: selectedPeriodoId || undefined },
  );

  const requestedAsignaturaId = typeof params.asignaturaId === "string" ? params.asignaturaId : undefined;
  const asignaturaId =
    requestedAsignaturaId && asignaturas.some((a) => a.id === requestedAsignaturaId)
      ? requestedAsignaturaId
      : undefined;

  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const offset = (currentPage - 1) * PAGE_SIZE;

  const filterCommon = {
    q: q || undefined,
    asignaturaId,
    periodoId: selectedPeriodoId || undefined,
  };

  const [asistencias, totalCount, resumenGlobal, matriculasParaAsistencia, clasesParaAsistencia] = await Promise.all([
    listarAsistenciasAdmin({ ...filterCommon, limit: PAGE_SIZE, offset }),
    countAsistenciasAdmin(filterCommon),
    // Resumen del periodo entero, sin q ni asignatura, para metricas estables al filtrar.
    resumenAsistenciasAdmin({ periodoId: selectedPeriodoId || undefined }),
    listarMatriculasParaAsistenciaAdmin(asignaturaId),
    listarClasesParaAsistenciaAdmin(asignaturaId),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const total = resumenGlobal.total;
  const presentes = resumenGlobal.presentes;
  const ausentes = resumenGlobal.ausentes;
  const tardanzas = resumenGlobal.tardanzas;
  const pctPresente = total > 0 ? Math.round((presentes / total) * 100) : 0;
  const currentHref = (() => {
    const usp = new URLSearchParams();
    if (selectedPeriodoId) usp.set("periodoId", selectedPeriodoId);
    if (asignaturaId) usp.set("asignaturaId", asignaturaId);
    if (q) usp.set("q", q);
    if (currentPage > 1) usp.set("page", String(currentPage));
    const qs = usp.toString();
    return qs ? `/admin/asistencias?${qs}` : "/admin/asistencias";
  })();

  // Group by asignatura
  const grouped = new Map<string, { nombre: string; items: typeof asistencias }>();
  for (const row of asistencias) {
    const existing = grouped.get(row.asignaturaId);
    if (existing) {
      existing.items.push(row);
    } else {
      grouped.set(row.asignaturaId, { nombre: row.asignaturaNombre, items: [row] });
    }
  }

  return (
    <section className="space-y-5">
      <RouteStateToast state={params.state} map={STATUS_MAP} />

      {/* Header */}
      <header>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
          Asistencias
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
          Registro completo de asistencia por asignatura y clase.
        </p>
      </header>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <article className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-text-secondary dark:text-gray-400" />
            <p className="text-xs font-medium uppercase tracking-wide text-text-secondary dark:text-gray-400">Total</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-text-primary dark:text-white">{total}</p>
        </article>
        <article className="rounded-2xl border border-emerald-200/80 bg-emerald-50 p-4 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/30">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Presentes</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-200">
            {pctPresente}%
            <span className="ml-1 text-xs font-normal opacity-70">({presentes})</span>
          </p>
        </article>
        <article className="rounded-2xl border border-red-200/80 bg-red-50 p-4 shadow-sm dark:border-red-900/40 dark:bg-red-950/30">
          <div className="flex items-center gap-2">
            <XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
            <p className="text-xs font-medium uppercase tracking-wide text-red-700 dark:text-red-300">Ausentes</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-red-700 dark:text-red-200">
            {total > 0 ? Math.round((ausentes / total) * 100) : 0}%
            <span className="ml-1 text-xs font-normal opacity-70">({ausentes})</span>
          </p>
        </article>
        <article className="rounded-2xl border border-amber-200/80 bg-amber-50 p-4 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/30">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">Tardanzas</p>
          <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-200">{tardanzas}</p>
        </article>
      </div>

      {/* Search & Filter */}
      <form method="GET" className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[260px_1fr_auto]">
          <PeriodoCursoSeccionPicker
            asForm={false}
            autoSubmit={false}
            layout="stack"
            periodos={periodos.map((p) => ({
              id: p.id,
              label: p.nombre,
              badge: p.estado,
            }))}
            asignaturas={asignaturas.map((a) => ({
              id: a.id,
              label: a.nombre,
              badge: a.codigo,
            }))}
            selected={{
              periodoId: selectedPeriodoId,
              asignaturaId: asignaturaId ?? undefined,
            }}
            labels={{ asignatura: "Sección" }}
            emptyLabels={{ asignatura: "Todas las secciones" }}
          />
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              name="q"
              type="text"
              defaultValue={q}
              placeholder="Buscar por nombre o RUT del alumno..."
              className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500" inputMode="search"
            />
          </div>
          <button
            type="submit"
            className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98]"
          >
            Filtrar
          </button>
        </div>
        {(q || asignaturaId) && (
          <div className="mt-2">
            <Link
              href={selectedPeriodoId ? `/admin/asistencias?periodoId=${selectedPeriodoId}` : "/admin/asistencias"}
              className="rounded-lg border border-gray-200 px-2 py-0.5 text-xs font-medium text-text-secondary transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Limpiar filtros
            </Link>
          </div>
        )}
      </form>

      <article className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-text-primary dark:text-white">
            Registrar asistencia
          </h2>
          <p className="text-sm text-text-secondary dark:text-gray-400">
            Crea asistencia para alumnos matriculados en la seccion seleccionada, incluso si aun no existen registros.
          </p>
        </div>

        {!asignaturaId ? (
          <div className="mt-4 rounded-xl border border-dashed border-gray-200 px-4 py-3 text-sm text-text-secondary dark:border-gray-700 dark:text-gray-400">
            Selecciona una seccion en el filtro superior para habilitar el registro de asistencia.
          </div>
        ) : clasesParaAsistencia.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-gray-200 px-4 py-3 text-sm text-text-secondary dark:border-gray-700 dark:text-gray-400">
            No hay clases creadas para esta seccion.
          </div>
        ) : matriculasParaAsistencia.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-gray-200 px-4 py-3 text-sm text-text-secondary dark:border-gray-700 dark:text-gray-400">
            No hay alumnos activos matriculados en esta seccion.
          </div>
        ) : (
          <form action={crearAsistenciaAdminFormAction} className="mt-4 grid gap-3 lg:grid-cols-[minmax(240px,1fr)_minmax(240px,1fr)_160px_minmax(180px,0.8fr)_auto] lg:items-end">
            <input type="hidden" name="redirectTo" value={currentHref} />
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                Clase
              </span>
              <select
                name="claseId"
                required
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-text-primary focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="">Seleccionar clase</option>
                {clasesParaAsistencia.map((clase) => (
                  <option key={clase.claseId} value={clase.claseId}>
                    Sesion {clase.numeroSesion} - {formatFecha(clase.fecha)} - {clase.titulo}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                Alumno
              </span>
              <select
                name="matriculaId"
                required
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-text-primary focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="">Seleccionar alumno</option>
                {matriculasParaAsistencia.map((m) => (
                  <option key={m.matriculaId} value={m.matriculaId}>
                    {m.alumnoApellido} {m.alumnoNombre}
                    {m.alumnoRut ? ` - ${formatearRut(m.alumnoRut)}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                Estado
              </span>
              <select
                name="estado"
                required
                defaultValue="presente"
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-text-primary focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="presente">Presente</option>
                <option value="ausente">Ausente</option>
                <option value="tardanza">Tardanza</option>
                <option value="justificado">Justificado</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                Observacion
              </span>
              <input
                name="observacion"
                placeholder="Opcional"
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
              />
            </label>
            <button
              type="submit"
              className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98]"
            >
              Crear asistencia
            </button>
          </form>
        )}
      </article>

      {asistencias.length === 0 ? (
        <article className="flex flex-col items-center justify-center rounded-2xl border border-gray-200/80 bg-white p-12 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <CheckCircle2 className="h-8 w-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-text-primary dark:text-white">
            {q || asignaturaId ? "Sin resultados" : "Aún no hay registros de asistencia"}
          </h2>
          <p className="mt-1.5 max-w-xs text-sm text-text-secondary dark:text-gray-400">
            {q || asignaturaId
              ? "No se encontraron registros con los filtros aplicados."
              : "Los registros aparecerán aquí cuando los docentes comiencen a tomar asistencia en sus clases mediante el código QR."}
          </p>
          {(q || asignaturaId) && (
            <Link
              href="/admin/asistencias"
              className="mt-4 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Ver todos los registros
            </Link>
          )}
        </article>
      ) : (
        Array.from(grouped.entries()).map(([asigId, group]) => {
          const gpPresente = group.items.filter((r) => r.estado === "presente").length;
          const gpTotal = group.items.length;
          const gpPct = gpTotal > 0 ? Math.round((gpPresente / gpTotal) * 100) : 0;

          return (
            <article key={asigId} className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
                    {group.nombre}
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
                    {gpTotal} registro{gpTotal !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5 dark:bg-emerald-950/30">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    {gpPct}% asistencia
                  </span>
                </div>
              </div>

              {/* Mobile: cards */}
              <div className="mt-4 space-y-2 sm:hidden">
                {group.items.map((row) => (
                  <div key={row.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-text-primary dark:text-white">
                          {row.alumnoNombre} {row.alumnoApellido}
                        </p>
                        <p className="text-xs text-text-secondary dark:text-gray-400">
                          {row.alumnoRut ? formatearRut(row.alumnoRut) : "-"} · Sesión {row.numeroSesion}
                        </p>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_STYLES[row.estado ?? ""] ?? ""}`}>
                        {ESTADO_LABELS[row.estado ?? ""] ?? row.estado ?? "-"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-text-muted dark:text-gray-500">
                      {row.claseTitulo} · {formatFecha(row.claseFecha)}
                    </p>
                    <form action={actualizarAsistenciaAdminFormAction} className="mt-3 grid gap-2">
                      <input type="hidden" name="asistenciaId" value={row.id} />
                      <input type="hidden" name="redirectTo" value={currentHref} />
                      <select
                        name="estado"
                        defaultValue={row.estado ?? "presente"}
                        className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      >
                        <option value="presente">Presente</option>
                        <option value="ausente">Ausente</option>
                        <option value="tardanza">Tardanza</option>
                        <option value="justificado">Justificado</option>
                      </select>
                      <input
                        name="observacion"
                        defaultValue={row.observacion ?? ""}
                        placeholder="Observación"
                        className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      />
                      <button type="submit" className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white">
                        Guardar asistencia
                      </button>
                    </form>
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="mt-4 hidden overflow-x-auto sm:block">
                <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                      <th className="px-3 py-2.5">Alumno</th>
                      <th className="px-3 py-2.5">RUT</th>
                      <th className="px-3 py-2.5">Clase</th>
                      <th className="px-3 py-2.5">Sesión</th>
                      <th className="px-3 py-2.5">Estado</th>
                      <th className="px-3 py-2.5">Fecha</th>
                      <th className="px-3 py-2.5">Ajuste admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                    {group.items.map((row) => (
                      <tr key={row.id} className="transition-colors hover:bg-primary/[0.03] dark:hover:bg-primary/5">
                        <td className="px-3 py-3 font-medium text-text-primary dark:text-gray-100">
                          {row.alumnoNombre} {row.alumnoApellido}
                        </td>
                        <td className="px-3 py-3 text-text-secondary dark:text-gray-400">
                          {row.alumnoRut ? formatearRut(row.alumnoRut) : "-"}
                        </td>
                        <td className="px-3 py-3 text-text-secondary dark:text-gray-400">
                          {row.claseTitulo}
                        </td>
                        <td className="px-3 py-3 text-text-secondary dark:text-gray-400">
                          {row.numeroSesion}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_STYLES[row.estado ?? ""] ?? ""}`}>
                            {ESTADO_LABELS[row.estado ?? ""] ?? row.estado ?? "-"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-text-secondary dark:text-gray-400">
                          {formatFecha(row.claseFecha)}
                        </td>
                        <td className="px-3 py-3">
                          <form action={actualizarAsistenciaAdminFormAction} className="flex min-w-[340px] items-center gap-2">
                            <input type="hidden" name="asistenciaId" value={row.id} />
                            <input type="hidden" name="redirectTo" value={currentHref} />
                            <select
                              name="estado"
                              defaultValue={row.estado ?? "presente"}
                              className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                            >
                              <option value="presente">Presente</option>
                              <option value="ausente">Ausente</option>
                              <option value="tardanza">Tardanza</option>
                              <option value="justificado">Justificado</option>
                            </select>
                            <input
                              name="observacion"
                              defaultValue={row.observacion ?? ""}
                              placeholder="Observación"
                              className="h-9 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                            />
                            <button type="submit" className="h-9 rounded-lg bg-primary px-3 text-xs font-semibold text-white">
                              Guardar
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          );
        })
      )}

      {totalCount > 0 ? (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          buildHref={(page) => {
            const usp = new URLSearchParams();
            if (selectedPeriodoId) usp.set("periodoId", selectedPeriodoId);
            if (asignaturaId) usp.set("asignaturaId", asignaturaId);
            if (q) usp.set("q", q);
            if (page > 1) usp.set("page", String(page));
            const qs = usp.toString();
            return qs ? `/admin/asistencias?${qs}` : "/admin/asistencias";
          }}
        />
      ) : null}
    </section>
  );
}
