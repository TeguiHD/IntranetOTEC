import { contarCursos, listarCursos } from "@/actions/cursos";
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
  searchParams?: Promise<{ state?: string; page?: string; q?: string }>;
};

export const metadata = { title: "Cursos" };

export default async function AdminCursosPage({ searchParams }: PageProps) {
  const params = await (searchParams ?? Promise.resolve({} as { state?: string; page?: string; q?: string }));
  const currentPage = Math.max(1, Number(params.page ?? "1") || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;
  const q = typeof params.q === "string" ? params.q.trim() : "";

  let listado: Awaited<ReturnType<typeof listarCursos>> = [];
  let total = 0;
  let loadFailed = false;

  try {
    [listado, total] = await Promise.all([
      listarCursos({ limit: PAGE_SIZE, offset }, { query: q, incluirInactivos: true }),
      contarCursos({ query: q, incluirInactivos: true }),
    ]);
  } catch {
    loadFailed = true;
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const buildHref = (page: number) => {
    const qs = new URLSearchParams({ page: String(page) });
    if (q) qs.set("q", q);
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

        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
            Catálogo de Cursos
          </h2>
          {total > 0 && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
              {total}
            </span>
          )}
        </div>

        <CursoManager
          cursos={listado}
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
