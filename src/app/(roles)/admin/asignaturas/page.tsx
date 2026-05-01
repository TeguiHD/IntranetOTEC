import { Search } from "lucide-react";

import {
  countAsignaturasAdmin,
  listarAsignaturasAdmin,
} from "@/actions/asignaturas";
import { listarPeriodosDashboard } from "@/actions/admin-metricas";
import { listarCursosCombobox } from "@/actions/cursos";
import { listarUsuariosPorRol } from "@/actions/usuarios";
import { RouteStateToast } from "@/components/shared/RouteStateToast";

import { AsignaturaManager } from "./AsignaturaManager";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_PAGE_SIZE = 10;

function parsePageSize(value?: string): number {
  const parsed = Number(value ?? "");
  return PAGE_SIZE_OPTIONS.includes(parsed as (typeof PAGE_SIZE_OPTIONS)[number])
    ? parsed
    : DEFAULT_PAGE_SIZE;
}

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> =
  {
    asignatura_created: {
      tone: "success",
      text: "Sección creada correctamente.",
    },
    asignatura_updated: {
      tone: "success",
      text: "Sección actualizada correctamente.",
    },
    docente_assigned: {
      tone: "success",
      text: "Docente asignado correctamente. Se enviará una notificación por correo.",
    },
    asignatura_archived: {
      tone: "success",
      text: "Sección archivada.",
    },
    already_archived: {
      tone: "success",
      text: "La sección ya estaba archivada.",
    },
    asignatura_unarchived: {
      tone: "success",
      text: "Sección desarchivada y reactivada.",
    },
    asignatura_deleted: {
      tone: "success",
      text: "Sección eliminada.",
    },
    already_deleted: {
      tone: "success",
      text: "La sección ya había sido eliminada.",
    },
    error: {
      tone: "error",
      text: "No fue posible completar la acción. Revisa los datos e intenta nuevamente.",
    },
  };

const ESTADO_OPTIONS = ["", "activo", "borrador", "finalizado", "archivado"] as const;

type AdminAsignaturasPageProps = {
  searchParams?: Promise<{
    state?: string;
    page?: string;
    pageSize?: string;
    q?: string;
    estado?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }>;
};

export const metadata = {
  title: "Secciones",
};

export default async function AdminAsignaturasPage({
  searchParams,
}: AdminAsignaturasPageProps) {
  const params = await (searchParams ?? Promise.resolve({
    state: undefined,
    page: undefined,
    pageSize: undefined,
    q: undefined,
    estado: undefined,
    fechaDesde: undefined,
    fechaHasta: undefined,
  }));
  const pageSize = parsePageSize(params.pageSize);
  const requestedPage = Math.max(1, Number(params.page ?? "1") || 1);
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const estadoFilter = typeof params.estado === "string" && params.estado.length > 0
    ? (params.estado as "activo" | "borrador" | "finalizado" | "archivado")
    : undefined;
  const fechaDesde = typeof params.fechaDesde === "string" ? params.fechaDesde.trim() : "";
  const fechaHasta = typeof params.fechaHasta === "string" ? params.fechaHasta.trim() : "";

  const filterOpts = {
    incluirArchivadas: true,
    q: q || undefined,
    estado: estadoFilter,
    fechaDesde: fechaDesde || undefined,
    fechaHasta: fechaHasta || undefined,
  };

  const totalCount = await countAsignaturasAdmin(filterOpts);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(requestedPage, totalPages);
  const offset = (currentPage - 1) * pageSize;

  const [asignaturas, docentes, cursosCombo, periodos] = await Promise.all([
    listarAsignaturasAdmin({ limit: pageSize, offset }, filterOpts),
    listarUsuariosPorRol("docente", { limit: 200, offset: 0 }, { incluirInactivos: true }),
    listarCursosCombobox(),
    listarPeriodosDashboard(),
  ]);

  const filterQuery = new URLSearchParams();
  filterQuery.set("pageSize", String(pageSize));
  if (q) filterQuery.set("q", q);
  if (estadoFilter) filterQuery.set("estado", estadoFilter);
  if (fechaDesde) filterQuery.set("fechaDesde", fechaDesde);
  if (fechaHasta) filterQuery.set("fechaHasta", fechaHasta);
  const buildHrefBase = filterQuery.toString()
    ? `/admin/asignaturas?${filterQuery.toString()}&`
    : "/admin/asignaturas?";

  const docentesSimple = docentes.map((d) => ({
    id: d.id,
    nombre: d.nombre ?? "",
    apellido: d.apellido ?? "",
    rut: d.rut ?? null,
    activo: d.activo ?? false,
  }));

  const asignaturasSimple = asignaturas.map((a) => ({
    id: a.id,
    nombre: a.nombre,
    codigo: a.codigo,
    estado: a.estado,
    fechaInicio: a.fechaInicio,
    fechaFin: a.fechaFin,
    duracionMeses: a.duracionMeses,
    maxAlumnos: a.maxAlumnos,
    docenteId: a.docenteId,
    docenteNombre: a.docenteNombre,
    docenteApellido: a.docenteApellido,
  }));

  const hasFilter = q || estadoFilter || fechaDesde || fechaHasta;

  // Tab counts per estado (sin filtro de búsqueda para mostrar totales reales)
  const [countTodas, countActivo, countBorrador, countFinalizado, countArchivado] = await Promise.all([
    countAsignaturasAdmin({ incluirArchivadas: true }),
    countAsignaturasAdmin({ incluirArchivadas: false, estado: "activo" }),
    countAsignaturasAdmin({ incluirArchivadas: false, estado: "borrador" }),
    countAsignaturasAdmin({ incluirArchivadas: false, estado: "finalizado" }),
    countAsignaturasAdmin({ incluirArchivadas: true, estado: "archivado" }),
  ]);

  const estadoTabs = [
    { value: "", label: "Todas", count: countTodas },
    { value: "activo", label: "Activas", count: countActivo },
    { value: "borrador", label: "Borrador", count: countBorrador },
    { value: "finalizado", label: "Finalizadas", count: countFinalizado },
    { value: "archivado", label: "Archivadas", count: countArchivado },
  ] as const;

  return (
    <section className="space-y-5">
      <RouteStateToast state={params.state} map={STATUS_MAP} />

      <header>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-gray-100 sm:text-2xl">
          Secciones
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-300">
          Gestiona secciones, vigencia, cupos y docentes responsables.
        </p>
      </header>

      {/* Tabs por estado */}
      <nav className="flex flex-wrap gap-1.5 rounded-2xl border border-gray-200/80 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {estadoTabs.map((tab) => {
          const tabParams = new URLSearchParams();
          tabParams.set("pageSize", String(pageSize));
          if (q) tabParams.set("q", q);
          if (tab.value) tabParams.set("estado", tab.value);
          if (fechaDesde) tabParams.set("fechaDesde", fechaDesde);
          if (fechaHasta) tabParams.set("fechaHasta", fechaHasta);
          const href = `/admin/asignaturas${tabParams.toString() ? `?${tabParams.toString()}` : ""}`;
          const isActive = (estadoFilter ?? "") === tab.value;
          return (
            <a
              key={tab.value}
              href={href}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
            >
              {tab.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                isActive
                  ? "bg-white/25 text-white"
                  : "bg-gray-100 text-text-secondary dark:bg-gray-800 dark:text-gray-400"
              }`}>
                {tab.count}
              </span>
            </a>
          );
        })}
      </nav>

      {/* Search & Filter */}
      <form method="GET" className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_auto_auto_auto_auto_auto]">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              name="q"
              type="text"
              defaultValue={q}
              placeholder="Buscar por nombre, código o docente..."
              className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
          </div>
          <div className="relative">
            <select
              name="estado"
              defaultValue={estadoFilter ?? ""}
              className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white py-2 pl-4 pr-9 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 sm:w-40"
            >
              {ESTADO_OPTIONS.map((e) => (
                <option key={e} value={e}>{e ? e.charAt(0).toUpperCase() + e.slice(1) : "Todos los estados"}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
              <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <input
            name="fechaDesde"
            type="date"
            defaultValue={fechaDesde}
            className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            aria-label="Fecha desde"
          />
          <input
            name="fechaHasta"
            type="date"
            defaultValue={fechaHasta}
            className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            aria-label="Fecha hasta"
          />
          <div className="relative">
            <select
              name="pageSize"
              defaultValue={String(pageSize)}
              className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white py-2 pl-4 pr-9 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 sm:w-32"
              aria-label="Secciones por página"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} / pág.
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
              <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <button
            type="submit"
            className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98]"
          >
            Filtrar
          </button>
        </div>
        {hasFilter && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-text-secondary dark:text-gray-400">
              {totalCount} resultado{totalCount !== 1 ? "s" : ""}
              {` · ${pageSize} por página`}
              {q && <> para «<strong>{q}</strong>»</>}
              {estadoFilter && <> en estado <strong>{estadoFilter}</strong></>}
              {(fechaDesde || fechaHasta) && (
                <>
                  {" "}
                  en rango <strong>{fechaDesde || "..."}</strong> a <strong>{fechaHasta || "..."}</strong>
                </>
              )}
            </span>
            <a
              href="/admin/asignaturas"
              className="rounded-lg border border-gray-200 px-2 py-0.5 text-xs font-medium text-text-secondary transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Limpiar
            </a>
          </div>
        )}
      </form>

      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-6">
        <AsignaturaManager
          asignaturas={asignaturasSimple}
          docentes={docentesSimple}
          cursos={cursosCombo}
          periodos={periodos}
          totalCount={totalCount}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          buildHref={buildHrefBase}
        />
      </article>
    </section>
  );
}
