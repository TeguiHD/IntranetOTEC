import { Search } from "lucide-react";

import { listarAsignaturasAdmin } from "@/actions/asignaturas";
import { countClasesAdmin, listarClasesAdmin } from "@/actions/clases";
import { Pagination } from "@/components/shared/Pagination";
import { RouteStateToast } from "@/components/shared/RouteStateToast";

import { ClaseCreateModal } from "./ClaseCreateModal";
import { ClasesTable } from "./ClasesTable";

const PAGE_SIZE = 20;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  clase_created: { tone: "success", text: "Clase creada correctamente." },
  clase_updated: { tone: "success", text: "Clase actualizada correctamente." },
  clase_deleted: { tone: "success", text: "Clase eliminada correctamente." },
  already_deleted: { tone: "success", text: "La clase ya estaba eliminada." },
  error: { tone: "error", text: "No fue posible completar la acción. Revisa los datos e intenta nuevamente." },
};

type AdminClasesPageProps = {
  searchParams?: {
    state?: string;
    asignaturaId?: string;
    page?: string;
    q?: string;
  };
};

export const metadata = {
  title: "Clases",
};

export default async function AdminClasesPage({ searchParams }: AdminClasesPageProps) {
  const currentPage = Math.max(1, Number(searchParams?.page ?? "1") || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;
  const q = typeof searchParams?.q === "string" ? searchParams.q.trim() : "";

  const asignaturas = await listarAsignaturasAdmin(
    { limit: 100, offset: 0 },
    { incluirArchivadas: false },
  );

  const selectedAsignaturaIdRaw =
    typeof searchParams?.asignaturaId === "string" ? searchParams.asignaturaId : undefined;
  const selectedAsignaturaId =
    selectedAsignaturaIdRaw && UUID_REGEX.test(selectedAsignaturaIdRaw)
      ? selectedAsignaturaIdRaw
      : asignaturas[0]?.id;



  const [clases, totalCount] = await Promise.all([
    listarClasesAdmin(
      { limit: PAGE_SIZE, offset },
      { asignaturaId: selectedAsignaturaId, incluirArchivadas: true, q: q || undefined },
    ),
    countClasesAdmin({ asignaturaId: selectedAsignaturaId, incluirArchivadas: true, q: q || undefined }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const totalPublicadas = clases.filter((c) => c.publicada).length;
  const totalBorrador = clases.filter((c) => !c.publicada).length;
  const totalConGrabacion = clases.filter((c) => c.urlGrabacion).length;

  function buildHref(page: number) {
    const params = new URLSearchParams();
    if (selectedAsignaturaId) params.set("asignaturaId", selectedAsignaturaId);
    if (q) params.set("q", q);
    params.set("page", String(page));
    return `/admin/clases?${params.toString()}`;
  }

  return (
    <section className="space-y-5">
      <RouteStateToast state={searchParams?.state} map={STATUS_MAP} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <header>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Clases
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Programa sesiones por asignatura y publica material audiovisual.
          </p>
        </header>
        <ClaseCreateModal asignaturaId={selectedAsignaturaId} currentPage={currentPage} />
      </div>

      {/* Métricas */}
      <div className="grid gap-3 sm:grid-cols-4">
        <article className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary dark:text-gray-400">Total clases</p>
          <p className="mt-1 text-2xl font-bold text-text-primary dark:text-white">{totalCount}</p>
        </article>
        <article className="rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm dark:border-green-900 dark:bg-green-950">
          <p className="text-xs font-medium uppercase tracking-wide text-green-800 dark:text-green-300">Publicadas</p>
          <p className="mt-1 text-2xl font-bold text-green-800 dark:text-green-200">{totalPublicadas}</p>
        </article>
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-900 dark:bg-amber-950">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-800 dark:text-amber-300">Borrador</p>
          <p className="mt-1 text-2xl font-bold text-amber-800 dark:text-amber-200">{totalBorrador}</p>
        </article>
        <article className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm dark:border-blue-900 dark:bg-blue-950">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-800 dark:text-blue-300">Con grabación</p>
          <p className="mt-1 text-2xl font-bold text-blue-800 dark:text-blue-200">{totalConGrabacion}</p>
        </article>
      </div>

      {/* Filters */}
      <form method="GET" className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          {/* Asignatura selector */}
          <div className="space-y-1.5">
            <label htmlFor="clases-asig" className="block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
              Asignatura
            </label>
            <div className="relative">
              <select
                id="clases-asig"
                name="asignaturaId"
                defaultValue={selectedAsignaturaId}
                className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white py-2 pl-4 pr-9 text-sm font-medium text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                {asignaturas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Text search */}
          <div className="space-y-1.5">
            <label htmlFor="clases-q" className="block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
              Buscar
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                id="clases-q"
                name="q"
                type="text"
                defaultValue={q}
                placeholder="Sesión, fecha (2025-03-15), hora..."
                className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
              />
            </div>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="h-11 w-full rounded-xl bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98] sm:w-auto"
            >
              Filtrar
            </button>
          </div>
        </div>

        {q && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-text-secondary dark:text-gray-400">
              Mostrando resultados para «<strong>{q}</strong>» · {totalCount} clase{totalCount !== 1 ? "s" : ""}
            </span>
            <a
              href={selectedAsignaturaId ? `/admin/clases?asignaturaId=${selectedAsignaturaId}` : "/admin/clases"}
              className="rounded-lg border border-gray-200 px-2 py-0.5 text-xs font-medium text-text-secondary transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Limpiar
            </a>
          </div>
        )}
      </form>

      {/* Classes list */}
      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
            Clases registradas
          </h2>
          {totalCount > 0 && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
              {totalCount}
            </span>
          )}
        </div>

        <ClasesTable
          clases={clases}
          selectedAsignaturaId={selectedAsignaturaId}
          currentPage={currentPage}
        />

        {totalPages > 1 && (
          <Pagination currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
        )}
      </article>
    </section>
  );
}
