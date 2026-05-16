import { listarPeriodosDashboard } from "@/actions/admin-metricas";
import { contarCursos, listarCursos } from "@/actions/cursos";
import { listarUsuariosPorRol } from "@/actions/usuarios";
import { Pagination } from "@/components/shared/Pagination";
import { RouteStateToast } from "@/components/shared/RouteStateToast";

import { CursoManager } from "./CursoManager";

const PAGE_SIZE = 20;

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  curso_creado:       { tone: "success", text: "Curso creado correctamente." },
  curso_actualizado:  { tone: "success", text: "Curso actualizado correctamente." },
  curso_activado:     { tone: "success", text: "Curso activado." },
  curso_desactivado:  { tone: "success", text: "Curso desactivado." },
  curso_eliminado:    { tone: "success", text: "Curso eliminado." },
  codigo_duplicado:   { tone: "error",   text: "Ya existe un curso con ese código." },
  tiene_secciones:    { tone: "error",   text: "No se puede eliminar: tiene secciones asociadas." },
  error:              { tone: "error",   text: "No fue posible completar la acción." },
};

type PageProps = {
  searchParams?: Promise<{
    state?: string;
    page?: string;
    q?: string;
    incluirInactivos?: string;
  }>;
};

export const metadata = { title: "Cursos" };

export default async function AdminCursosPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const currentPage = Math.max(1, Number(params.page ?? "1") || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const incluirInactivos = params.incluirInactivos === "1";

  let listado: Awaited<ReturnType<typeof listarCursos>> = [];
  let periodos: Awaited<ReturnType<typeof listarPeriodosDashboard>> = [];
  let docentes: Awaited<ReturnType<typeof listarUsuariosPorRol>> = [];
  let total = 0;
  let loadFailed = false;

  try {
    [listado, total, periodos, docentes] = await Promise.all([
      listarCursos({ limit: PAGE_SIZE, offset }, { query: q, incluirInactivos }),
      contarCursos({ query: q, incluirInactivos }),
      listarPeriodosDashboard(),
      listarUsuariosPorRol("docente", { limit: 200, offset: 0 }),
    ]);
  } catch {
    loadFailed = true;
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const buildHref = (page: number) => {
    const qs = new URLSearchParams({ page: String(page) });
    if (q) qs.set("q", q);
    if (incluirInactivos) qs.set("incluirInactivos", "1");
    return `/admin/cursos?${qs.toString()}`;
  };

  return (
    <section className="space-y-5">
      <RouteStateToast state={params.state} map={STATUS_MAP} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <header>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Cursos
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Catálogo base de cursos. Cada sección es una oferta concreta de un curso en un periodo y turno.
          </p>
        </header>
        <CursoManager
          cursos={listado}
          periodos={periodos}
          docentes={docentes}
          searchQuery={q}
          mode="header-button"
        />
      </div>

      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        {loadFailed && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/70 dark:bg-amber-900/20 dark:text-amber-200">
            Ocurrio un problema al cargar el catalogo. Recarga la pagina para reintentar.
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
              Catálogo de Cursos
            </h2>
            {total > 0 && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
                {total}
              </span>
            )}
            <span className="text-[11px] text-text-secondary dark:text-gray-400">
              {incluirInactivos ? "Incluye inactivos" : "Solo activos"}
            </span>
          </div>
          <form method="GET" className="flex items-center gap-2">
            {q ? <input type="hidden" name="q" value={q} /> : null}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-text-secondary transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
              <input
                type="checkbox"
                name="incluirInactivos"
                value="1"
                defaultChecked={incluirInactivos}
                className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary"
              />
              Mostrar inactivos
            </label>
            <button
              type="submit"
              className="inline-flex h-8 items-center rounded-xl bg-primary px-3 text-xs font-semibold text-white transition hover:bg-primary-dark"
            >
              Aplicar
            </button>
          </form>
        </div>

        <CursoManager
          cursos={listado}
          periodos={periodos}
          docentes={docentes}
          searchQuery={q}
          mode="table"
        />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          buildHref={buildHref}
          totalCount={total}
        />
      </article>
    </section>
  );
}
