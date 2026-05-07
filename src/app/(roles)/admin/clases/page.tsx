import { AlertTriangle, CalendarDays, Clock, MapPin, Search } from "lucide-react";

import { listarPeriodosDashboard } from "@/actions/admin-metricas";
import { listarAsignaturasAdmin } from "@/actions/asignaturas";
import {
  countClasesAdmin,
  generarClasesDesdeBloquesFormAction,
  listarClasesAdmin,
} from "@/actions/clases";
import { obtenerBloquesDeAsignatura } from "@/actions/horarios";
import { Pagination } from "@/components/shared/Pagination";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { PeriodoCursoSeccionPicker } from "@/components/shared/PeriodoCursoSeccionPicker";

import { ClaseCreateModal } from "./ClaseCreateModal";
import { ClasesTable } from "./ClasesTable";

const PAGE_SIZE = 20;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

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

  const [clases, totalCount, bloquesHorario] = selectedAsignaturaId
    ? await Promise.all([
        listarClasesAdmin(
          { limit: PAGE_SIZE, offset },
          { asignaturaId: selectedAsignaturaId, incluirArchivadas: true, q: q || undefined },
        ),
        countClasesAdmin({ asignaturaId: selectedAsignaturaId, incluirArchivadas: true, q: q || undefined }),
        obtenerBloquesDeAsignatura(selectedAsignaturaId),
      ])
    : [[], 0, []];

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const totalPublicadas = clases.filter((c) => c.publicada).length;
  const totalBorrador = clases.filter((c) => !c.publicada).length;
  const totalConGrabacion = clases.filter((c) => c.urlGrabacion).length;
  const selectedAsignatura = asignaturas.find((a) => a.id === selectedAsignaturaId);

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

      {selectedAsignaturaId && (
        <article className={`rounded-2xl border p-5 shadow-sm sm:p-6 ${
          bloquesHorario.length > 0
            ? "border-primary/20 bg-primary/5 dark:border-primary/30 dark:bg-primary/10"
            : "border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/25"
        }`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                <CalendarDays className="h-4 w-4" />
                Dependencia de horario
              </p>
              <h2 className="mt-1 text-lg font-bold text-text-primary dark:text-white">
                {selectedAsignatura?.nombre ?? "Sección seleccionada"}
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-text-secondary dark:text-gray-400">
                Las clases pueden autogenerarse desde los bloques horarios. Si el horario está vacío, configura bloques antes de planificar sesiones recurrentes.
              </p>
            </div>
            <a
              href={`/admin/horarios?periodoId=${selectedPeriodoId}&asignaturaId=${selectedAsignaturaId}`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-primary/25 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 dark:border-primary/40 dark:text-primary-light"
            >
              <Clock className="h-4 w-4" />
              Ver horario
            </a>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
            {bloquesHorario.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {bloquesHorario.map((bloque) => (
                  <div key={bloque.id} className="rounded-xl border border-white/60 bg-white/80 px-3 py-2.5 text-sm shadow-sm dark:border-gray-800 dark:bg-gray-900/70">
                    <p className="font-semibold text-text-primary dark:text-white">
                      {DIAS[bloque.diaSemana] ?? `Día ${bloque.diaSemana + 1}`}
                    </p>
                    <p className="mt-0.5 text-xs text-text-secondary dark:text-gray-400">
                      {bloque.horaInicio}–{bloque.horaFin}
                    </p>
                    {bloque.sala ? (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-text-muted dark:text-gray-500">
                        <MapPin className="h-3.5 w-3.5" />
                        {bloque.sala}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-white/70 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-gray-900/70 dark:text-amber-100">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>No hay bloques horarios. La autogeneración fallará hasta que el horario de la sección esté definido.</p>
              </div>
            )}

            {bloquesHorario.length > 0 ? (
              <form action={generarClasesDesdeBloquesFormAction}>
                <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
                <input type="hidden" name="periodoId" value={selectedPeriodoId} />
                <input type="hidden" name="page" value={String(currentPage)} />
                <input type="hidden" name="q" value={q} />
                <button
                  type="submit"
                  className="h-11 w-full rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-dark md:w-auto"
                >
                  Generar sesiones
                </button>
              </form>
            ) : null}
          </div>
        </article>
      )}

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
