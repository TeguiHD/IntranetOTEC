import { Search } from "lucide-react";

import { listarPeriodosDashboard } from "@/actions/admin-metricas";
import { listarAsignaturasAdmin } from "@/actions/asignaturas";
import {
  countClasesAdmin,
  generarClasesDesdeBloquesFormAction,
  listarClasesAdmin,
} from "@/actions/clases";
import { Pagination } from "@/components/shared/Pagination";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { PeriodoCursoSeccionPicker } from "@/components/shared/PeriodoCursoSeccionPicker";

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
  clases_autogeneradas: {
    tone: "success",
    text: "Clases generadas automáticamente desde bloques horarios.",
  },
  clases_autogeneradas_sin_cambios: {
    tone: "success",
    text: "No se generaron clases nuevas porque ya existen en ese rango.",
  },
  sin_bloques_horario: {
    tone: "error",
    text: "La sección no tiene bloques horarios configurados.",
  },
  asignatura_range_missing: {
    tone: "error",
    text: "La sección debe tener fechas de inicio y término para autogenerar clases.",
  },
  asignatura_range_invalid: {
    tone: "error",
    text: "La sección tiene un rango de fechas inválido.",
  },
  clases_autogeneradas_failed: {
    tone: "error",
    text: "No fue posible autogenerar clases. Intenta nuevamente.",
  },
  error: { tone: "error", text: "No fue posible completar la acción. Revisa los datos e intenta nuevamente." },
};

type AdminClasesPageProps = {
  searchParams?: Promise<{
    state?: string;
    periodoId?: string;
    asignaturaId?: string;
    page?: string;
    q?: string;
  }>;
};

export const metadata = {
  title: "Clases",
};

export default async function AdminClasesPage({ searchParams }: AdminClasesPageProps) {
  const params = await (searchParams ?? Promise.resolve({} as { state?: string; periodoId?: string; asignaturaId?: string; page?: string; q?: string }));
  const currentPage = Math.max(1, Number(params.page ?? "1") || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const requestedPeriodoId = typeof params.periodoId === "string" ? params.periodoId.trim() : "";

  const periodos = await listarPeriodosDashboard();
  const defaultPeriodoId = periodos.find((p) => p.estado === "activo")?.id ?? periodos[0]?.id ?? "";
  const selectedPeriodoId =
    requestedPeriodoId && periodos.some((p) => p.id === requestedPeriodoId)
      ? requestedPeriodoId
      : defaultPeriodoId;

  const asignaturas = await listarAsignaturasAdmin(
    { limit: 1000, offset: 0 },
    { incluirArchivadas: false, periodoId: selectedPeriodoId || undefined },
  );

  const selectedAsignaturaIdRaw =
    typeof params.asignaturaId === "string" ? params.asignaturaId : undefined;
  const selectedAsignaturaId =
    selectedAsignaturaIdRaw && UUID_REGEX.test(selectedAsignaturaIdRaw) && asignaturas.some((a) => a.id === selectedAsignaturaIdRaw)
      ? selectedAsignaturaIdRaw
      : asignaturas[0]?.id;

  const [clases, totalCount] = selectedAsignaturaId
    ? await Promise.all([
        listarClasesAdmin(
          { limit: PAGE_SIZE, offset },
          { asignaturaId: selectedAsignaturaId, incluirArchivadas: true, q: q || undefined },
        ),
        countClasesAdmin({ asignaturaId: selectedAsignaturaId, incluirArchivadas: true, q: q || undefined }),
      ])
    : [[], 0];

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const totalPublicadas = clases.filter((c) => c.publicada).length;
  const totalBorrador = clases.filter((c) => !c.publicada).length;
  const totalConGrabacion = clases.filter((c) => c.urlGrabacion).length;

  function buildHref(page: number) {
    const urlParams = new URLSearchParams();
    if (selectedPeriodoId) urlParams.set("periodoId", selectedPeriodoId);
    if (selectedAsignaturaId) urlParams.set("asignaturaId", selectedAsignaturaId);
    if (q) urlParams.set("q", q);
    urlParams.set("page", String(page));
    return `/admin/clases?${urlParams.toString()}`;
  }

  return (
    <section className="space-y-5">
      <RouteStateToast state={params.state} map={STATUS_MAP} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <header>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Clases
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Programa sesiones por asignatura y publica material audiovisual.
          </p>
        </header>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {selectedAsignaturaId && (
            <form action={generarClasesDesdeBloquesFormAction}>
              <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
              <input type="hidden" name="periodoId" value={selectedPeriodoId} />
              <input type="hidden" name="page" value={String(currentPage)} />
              <input type="hidden" name="q" value={q} />
              <button
                type="submit"
                className="h-11 rounded-xl border border-primary/40 bg-primary/5 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 dark:border-primary-light/40 dark:bg-primary-light/10 dark:text-primary-light"
              >
                Autogenerar desde bloques
              </button>
            </form>
          )}
          <ClaseCreateModal
            asignaturaId={selectedAsignaturaId}
            currentPage={currentPage}
            periodoId={selectedPeriodoId || undefined}
            searchQuery={q || undefined}
            disabled={!selectedAsignaturaId}
          />
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
              asignaturaId: selectedAsignaturaId,
            }}
          />

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
                inputMode="search"
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
              href={selectedPeriodoId ? `/admin/clases?periodoId=${selectedPeriodoId}${selectedAsignaturaId ? `&asignaturaId=${selectedAsignaturaId}` : ""}` : (selectedAsignaturaId ? `/admin/clases?asignaturaId=${selectedAsignaturaId}` : "/admin/clases")}
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

        {selectedAsignaturaId ? (
          <ClasesTable
            clases={clases}
            selectedAsignaturaId={selectedAsignaturaId}
            currentPage={currentPage}
            selectedPeriodoId={selectedPeriodoId || undefined}
            searchQuery={q || undefined}
          />
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-gray-200 px-6 py-10 text-center text-sm text-text-secondary dark:border-gray-700 dark:text-gray-400">
            Selecciona una seccion para ver y gestionar sus clases.
          </div>
        )}

        {totalPages > 1 && (
          <Pagination currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
        )}
      </article>
    </section>
  );
}
