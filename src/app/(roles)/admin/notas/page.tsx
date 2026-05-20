import { BookOpen, CheckCircle2, Search, TrendingUp } from "lucide-react";

import { listarPeriodosDashboard } from "@/actions/admin-metricas";
import { listarAsignaturasAdmin } from "@/actions/asignaturas";
import {
  actualizarNotaAdminFormAction,
  countNotasAdmin,
  listarNotasAdmin,
  resumenNotasAdmin,
} from "@/actions/admin-notas";
import { formatearRut } from "@/lib/rut";
import { Pagination } from "@/components/shared/Pagination";
import { PeriodoCursoSeccionPicker } from "@/components/shared/PeriodoCursoSeccionPicker";

const PAGE_SIZE = 50;

const NOTA_COLOR = (nota: string) =>
  Number(nota) >= 4.0 ? "text-success" : "text-danger";

function formatFecha(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value + "T12:00:00");
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export const metadata = {
  title: "Notas — Admin",
};

type AdminNotasPageProps = {
  searchParams?: Promise<{
    q?: string;
    periodoId?: string;
    asignaturaId?: string;
    page?: string;
  }>;
};

export default async function AdminNotasPage({ searchParams }: AdminNotasPageProps) {
  const params = await (searchParams ?? Promise.resolve({} as { q?: string; periodoId?: string; asignaturaId?: string; page?: string }));
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

  const [notas, totalCount, resumenGlobal] = await Promise.all([
    listarNotasAdmin({ ...filterCommon, limit: PAGE_SIZE, offset }),
    countNotasAdmin(filterCommon),
    resumenNotasAdmin({ periodoId: selectedPeriodoId || undefined }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const totalNotas = resumenGlobal.total;
  const promedio = resumenGlobal.promedio ?? 0;
  const aprobados = resumenGlobal.aprobados;
  const pctAprobados = totalNotas > 0 ? Math.round((aprobados / totalNotas) * 100) : 0;
  const currentHref = (() => {
    const usp = new URLSearchParams();
    if (selectedPeriodoId) usp.set("periodoId", selectedPeriodoId);
    if (asignaturaId) usp.set("asignaturaId", asignaturaId);
    if (q) usp.set("q", q);
    if (currentPage > 1) usp.set("page", String(currentPage));
    const qs = usp.toString();
    return qs ? `/admin/notas?${qs}` : "/admin/notas";
  })();

  // Group by asignatura
  const grouped = new Map<string, { nombre: string; items: typeof notas }>();
  for (const nota of notas) {
    const existing = grouped.get(nota.asignaturaId);
    if (existing) {
      existing.items.push(nota);
    } else {
      grouped.set(nota.asignaturaId, { nombre: nota.asignaturaNombre, items: [nota] });
    }
  }

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <header>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Notas
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Registro completo de calificaciones ingresadas por docentes.
          </p>
        </header>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary dark:text-gray-400">
            Total notas
          </p>
          <p className="mt-1 text-2xl font-bold text-text-primary dark:text-white">{totalNotas}</p>
        </article>
        <article className="rounded-2xl border border-blue-200/80 bg-blue-50 p-4 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/30">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <p className="text-xs font-medium uppercase tracking-wide text-blue-700 dark:text-blue-300">
              Promedio
            </p>
          </div>
          <p className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-200">
            {totalNotas > 0 ? promedio.toFixed(1) : "—"}
          </p>
        </article>
        <article className="col-span-2 rounded-2xl border border-emerald-200/80 bg-emerald-50 p-4 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/30 sm:col-span-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              Aprobados
            </p>
          </div>
          <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-200">
            {pctAprobados}%
            <span className="ml-1 text-sm font-normal text-emerald-600/70 dark:text-emerald-400/70">
              ({aprobados}/{totalNotas})
            </span>
          </p>
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
            <a
              href={selectedPeriodoId ? `/admin/notas?periodoId=${selectedPeriodoId}` : "/admin/notas"}
              className="rounded-lg border border-gray-200 px-2 py-0.5 text-xs font-medium text-text-secondary transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Limpiar filtros
            </a>
          </div>
        )}
      </form>

      {notas.length === 0 ? (
        <article className="flex flex-col items-center justify-center rounded-2xl border border-gray-200/80 bg-white p-12 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <BookOpen className="h-8 w-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-text-primary dark:text-white">
            {q || asignaturaId ? "Sin resultados" : "Aún no hay notas registradas"}
          </h2>
          <p className="mt-1.5 max-w-xs text-sm text-text-secondary dark:text-gray-400">
            {q || asignaturaId
              ? "No se encontraron notas con los filtros aplicados. Prueba con otros criterios."
              : "Las notas aparecerán aquí cuando los docentes comiencen a registrar calificaciones en sus clases."}
          </p>
          {(q || asignaturaId) && (
            <a
              href="/admin/notas"
              className="mt-4 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Ver todas las notas
            </a>
          )}
        </article>
      ) : (
        Array.from(grouped.entries()).map(([asigId, group]) => {
          const grupoPromedio =
            group.items.reduce((acc, n) => acc + Number(n.nota), 0) / group.items.length;
          const grupoAprobados = group.items.filter((n) => Number(n.nota) >= 4.0).length;

          return (
            <article key={asigId} className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
                    {group.nombre}
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
                    {group.items.length} nota{group.items.length !== 1 ? "s" : ""} registrada{group.items.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="rounded-xl bg-blue-50 px-3 py-1.5 dark:bg-blue-950/30">
                    <p className="text-[10px] font-semibold uppercase text-blue-600 dark:text-blue-400">Promedio</p>
                    <p className="text-sm font-bold text-blue-700 dark:text-blue-300">{grupoPromedio.toFixed(1)}</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 px-3 py-1.5 dark:bg-emerald-950/30">
                    <p className="text-[10px] font-semibold uppercase text-emerald-600 dark:text-emerald-400">Aprobados</p>
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{grupoAprobados}/{group.items.length}</p>
                  </div>
                </div>
              </div>

              {/* Mobile: cards */}
              <div className="mt-4 space-y-2 sm:hidden">
                {group.items.map((n) => (
                  <div key={n.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-text-primary dark:text-white">
                          {n.alumnoNombre} {n.alumnoApellido}
                        </p>
                        <p className="text-xs text-text-secondary dark:text-gray-400">
                          {n.alumnoRut ? formatearRut(n.alumnoRut) : "-"} · {n.docenteNombre} {n.docenteApellido}
                        </p>
                      </div>
                      <span className={`text-lg font-bold ${NOTA_COLOR(n.nota)}`}>{n.nota}</span>
                    </div>
                    <p className="mt-1 text-xs text-text-muted dark:text-gray-500">{formatFecha(n.fechaRegistro)}</p>
                    <form action={actualizarNotaAdminFormAction} className="mt-3 flex items-center gap-2">
                      <input type="hidden" name="notaId" value={n.id} />
                      <input type="hidden" name="redirectTo" value={currentHref} />
                      <input
                        name="nota"
                        type="number"
                        min="1"
                        max="7"
                        step="0.1"
                        defaultValue={n.nota}
                        className="h-10 w-24 rounded-lg border border-gray-200 bg-white px-3 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      />
                      <button type="submit" className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white">
                        Guardar nota
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
                      <th className="px-3 py-2.5">Docente</th>
                      <th className="px-3 py-2.5 text-right">Nota</th>
                      <th className="px-3 py-2.5">Fecha</th>
                      <th className="px-3 py-2.5">Ajuste admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                    {group.items.map((n) => (
                      <tr key={n.id} className="transition-colors hover:bg-primary/[0.03] dark:hover:bg-primary/5">
                        <td className="px-3 py-3 font-medium text-text-primary dark:text-gray-100">
                          {n.alumnoNombre} {n.alumnoApellido}
                        </td>
                        <td className="px-3 py-3 text-text-secondary dark:text-gray-400">
                          {n.alumnoRut ? formatearRut(n.alumnoRut) : "-"}
                        </td>
                        <td className="px-3 py-3 text-text-secondary dark:text-gray-400">
                          {n.docenteNombre} {n.docenteApellido}
                        </td>
                        <td className={`px-3 py-3 text-right font-bold ${NOTA_COLOR(n.nota)}`}>
                          {n.nota}
                        </td>
                        <td className="px-3 py-3 text-text-secondary dark:text-gray-400">
                          {formatFecha(n.fechaRegistro)}
                        </td>
                        <td className="px-3 py-3">
                          <form action={actualizarNotaAdminFormAction} className="flex items-center gap-2">
                            <input type="hidden" name="notaId" value={n.id} />
                            <input type="hidden" name="redirectTo" value={currentHref} />
                            <input
                              name="nota"
                              type="number"
                              min="1"
                              max="7"
                              step="0.1"
                              defaultValue={n.nota}
                              className="h-9 w-24 rounded-lg border border-gray-200 bg-white px-2 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
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
            return qs ? `/admin/notas?${qs}` : "/admin/notas";
          }}
        />
      ) : null}
    </section>
  );
}
