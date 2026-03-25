import { Search } from "lucide-react";

import {
  countAsignaturasAdmin,
  listarAsignaturasAdmin,
} from "@/actions/asignaturas";
import { listarUsuariosPorRol } from "@/actions/usuarios";
import { RouteStateToast } from "@/components/shared/RouteStateToast";

import { AsignaturaManager } from "./AsignaturaManager";

const PAGE_SIZE = 20;

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> =
  {
    asignatura_created: {
      tone: "success",
      text: "Asignatura creada correctamente.",
    },
    docente_assigned: {
      tone: "success",
      text: "Docente asignado correctamente. Se enviará una notificación por correo.",
    },
    asignatura_archived: {
      tone: "success",
      text: "Asignatura archivada.",
    },
    already_archived: {
      tone: "success",
      text: "La asignatura ya estaba archivada.",
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
    q?: string;
    estado?: string;
  }>;
};

export const metadata = {
  title: "Asignaturas",
};

export default async function AdminAsignaturasPage({
  searchParams,
}: AdminAsignaturasPageProps) {
  const params = await (searchParams ?? Promise.resolve({} as { state?: string; page?: string; q?: string; estado?: string }));
  const currentPage = Math.max(1, Number(params.page ?? "1") || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const estadoFilter = typeof params.estado === "string" && params.estado.length > 0
    ? (params.estado as "activo" | "borrador" | "finalizado" | "archivado")
    : undefined;

  const filterOpts = { incluirArchivadas: true, q: q || undefined, estado: estadoFilter };

  const [asignaturas, docentes, totalCount] = await Promise.all([
    listarAsignaturasAdmin({ limit: PAGE_SIZE, offset }, filterOpts),
    listarUsuariosPorRol("docente", { limit: 200, offset: 0 }, { incluirInactivos: true }),
    countAsignaturasAdmin(filterOpts),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const filterQuery = new URLSearchParams();
  if (q) filterQuery.set("q", q);
  if (estadoFilter) filterQuery.set("estado", estadoFilter);
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
    duracionMeses: a.duracionMeses,
    maxAlumnos: a.maxAlumnos,
    docenteId: a.docenteId,
    docenteNombre: a.docenteNombre,
    docenteApellido: a.docenteApellido,
  }));

  const hasFilter = q || estadoFilter;

  return (
    <section className="space-y-5">
      <RouteStateToast state={params.state} map={STATUS_MAP} />

      <header>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-gray-100 sm:text-2xl">
          Asignaturas
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-300">
          Gestiona asignaturas, fechas, duración y docentes responsables.
        </p>
      </header>

      {/* Search & Filter */}
      <form method="GET" className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
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
              {q && <> para «<strong>{q}</strong>»</>}
              {estadoFilter && <> en estado <strong>{estadoFilter}</strong></>}
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
          totalCount={totalCount}
          currentPage={currentPage}
          totalPages={totalPages}
          buildHref={buildHrefBase}
        />
      </article>
    </section>
  );
}
