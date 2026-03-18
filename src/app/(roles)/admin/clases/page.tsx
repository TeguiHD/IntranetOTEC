import { listarAsignaturasAdmin } from "@/actions/asignaturas";
import { countClasesAdmin, crearClaseFormAction, listarClasesAdmin } from "@/actions/clases";
import { Pagination } from "@/components/shared/Pagination";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
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

      <header>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
          Clases
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
          Crea sesiones por asignatura y publica material audiovisual de forma segura.
        </p>
      </header>

      {/* Filtro asignatura */}
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
            <option key={a.id} value={a.id}>
              {a.nombre}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-11 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:shadow-md active:scale-[0.98]"
        >
          Filtrar
        </button>
      </form>

      {/* Formulario crear clase */}
      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
          Crear clase
        </h2>

        <form action={crearClaseFormAction} className="mt-4 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="asignaturaId" value={selectedAsignaturaId ?? ""} />
          <input type="hidden" name="page" value={String(currentPage)} />

          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="clase-titulo" className="text-sm font-medium text-text-primary dark:text-gray-200">
              Título <span className="text-danger">*</span>
            </label>
            <input
              id="clase-titulo"
              name="titulo"
              type="text"
              inputMode="text"
              required
              minLength={3}
              maxLength={140}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="clase-descripcion" className="text-sm font-medium text-text-primary dark:text-gray-200">
              Descripción (opcional)
            </label>
            <textarea
              id="clase-descripcion"
              name="descripcion"
              rows={2}
              maxLength={600}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="clase-fecha" className="text-sm font-medium text-text-primary dark:text-gray-200">
              Fecha <span className="text-danger">*</span>
            </label>
            <input
              id="clase-fecha"
              name="fecha"
              type="date"
              inputMode="numeric"
              required
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="clase-hora" className="text-sm font-medium text-text-primary dark:text-gray-200">
              Hora inicio (opcional)
            </label>
            <input
              id="clase-hora"
              name="horaInicio"
              type="time"
              inputMode="numeric"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="clase-sesion" className="text-sm font-medium text-text-primary dark:text-gray-200">
              Número sesión (opcional)
            </label>
            <input
              id="clase-sesion"
              name="numeroSesion"
              type="number"
              inputMode="numeric"
              min={1}
              max={1000}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="clase-tipo-url" className="text-sm font-medium text-text-primary dark:text-gray-200">
              Tipo URL (opcional)
            </label>
            <select
              id="clase-tipo-url"
              name="tipoUrl"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="">Sin grabación</option>
              <option value="youtube">YouTube</option>
              <option value="vimeo">Vimeo</option>
              <option value="drive">Drive</option>
              <option value="directo">Directo</option>
            </select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="clase-url" className="text-sm font-medium text-text-primary dark:text-gray-200">
              URL grabación (opcional)
            </label>
            <input
              id="clase-url"
              name="urlGrabacion"
              type="url"
              inputMode="url"
              maxLength={500}
              placeholder="https://www.youtube-nocookie.com/..."
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="inline-flex items-center gap-2.5 text-sm text-text-primary dark:text-gray-200">
              <input
                type="checkbox"
                inputMode="text"
                name="publicada"
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              Publicar inmediatamente
            </label>
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="h-12 w-full rounded-xl bg-gradient-to-r from-primary to-primary-dark px-6 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-colors hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] sm:w-auto"
            >
              Crear clase
            </button>
          </div>
        </form>
      </article>

      {/* Lista clases */}
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
