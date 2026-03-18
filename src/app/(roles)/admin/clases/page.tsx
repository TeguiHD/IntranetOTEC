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
  error: { tone: "error", text: "No fue posible completar la acción. Revisa los datos e intenta nuevamente." },
};

type AdminClasesPageProps = {
  searchParams?: {
    state?: string;
    asignaturaId?: string;
    page?: string;
  };
};

export default async function AdminClasesPage({ searchParams }: AdminClasesPageProps) {
  const currentPage = Math.max(1, Number(searchParams?.page ?? "1") || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

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
      { asignaturaId: selectedAsignaturaId, incluirArchivadas: true },
    ),
    countClasesAdmin({ asignaturaId: selectedAsignaturaId, incluirArchivadas: true }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  function buildHref(page: number) {
    const params = new URLSearchParams();
    if (selectedAsignaturaId) params.set("asignaturaId", selectedAsignaturaId);
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

      {/* Asignatura filter */}
      <form method="GET" className="flex flex-wrap items-center gap-2">
        <label htmlFor="clases-filter" className="text-sm font-medium text-text-primary dark:text-gray-200">
          Asignatura
        </label>
        <select
          id="clases-filter"
          name="asignaturaId"
          defaultValue={selectedAsignaturaId}
          className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 sm:flex-none sm:min-w-[260px]"
        >
          {asignaturas.map((a) => (
            <option key={a.id} value={a.id}>{a.nombre}</option>
          ))}
        </select>
        <button
          type="submit"
          className="h-11 rounded-xl bg-gray-100 px-5 text-sm font-medium text-text-primary transition-colors hover:bg-gray-200 active:scale-[0.98] dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
        >
          Filtrar
        </button>
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
