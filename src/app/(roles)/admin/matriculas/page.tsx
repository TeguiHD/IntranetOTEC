import {
  listarAsignaturasAdmin,
  type AsignaturaBusqueda,
} from "@/actions/asignaturas";
import {
  countMatriculasAdmin,
  listarMatriculasAdmin,
  matricularAlumnoFormAction,
} from "@/actions/matriculas";
import { Pagination } from "@/components/shared/Pagination";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { AlumnoCombobox } from "./AlumnoCombobox";
import { AsignaturaCombobox } from "./AsignaturaCombobox";
import { DesmatricularButton } from "./DesmatricularButton";
import { EditMatriculaButton } from "./EditMatriculaButton";
import { ExportCsvButton } from "./ExportCsvButton";

const PAGE_SIZE = 20;

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  matricula_created: { tone: "success", text: "Matrícula creada correctamente." },
  matricula_updated: { tone: "success", text: "Matrícula actualizada/reactivada correctamente." },
  matricula_edited: { tone: "success", text: "Matrícula editada correctamente." },
  matricula_deactivated: { tone: "success", text: "Matrícula desactivada correctamente." },
  already_inactive: { tone: "success", text: "La matrícula ya estaba inactiva." },
  error: { tone: "error", text: "No fue posible completar la acción. Revisa los datos e intenta nuevamente." },
};

type AdminMatriculasPageProps = {
  searchParams?: {
    state?: string;
    asignaturaId?: string;
    page?: string;
  };
};

const estaPagado = (estadoPago: string | null | undefined): boolean =>
  estadoPago === "pagado" || estadoPago === "becado";

const ESTADO_PAGO_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  mora: "Mora",
  becado: "Becado",
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const metadata = {
  title: "Matrículas",
};

export default async function AdminMatriculasPage({ searchParams }: AdminMatriculasPageProps) {
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

  const selectedAsignaturaCombobox: AsignaturaBusqueda | null = selectedAsignaturaId
    ? (() => {
        const selected = asignaturas.find((item) => item.id === selectedAsignaturaId);

        if (!selected) {
          return null;
        }

        return {
          id: selected.id,
          nombre: selected.nombre,
          codigo: selected.codigo,
          estado: selected.estado,
        };
      })()
    : null;

  const [matriculas, totalCount] = selectedAsignaturaId
    ? await Promise.all([
        listarMatriculasAdmin(
          { limit: PAGE_SIZE, offset },
          { asignaturaId: selectedAsignaturaId, incluirInactivas: true },
        ),
        countMatriculasAdmin({ asignaturaId: selectedAsignaturaId, incluirInactivas: true }),
      ])
    : [[], 0];

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const totalActivas = matriculas.filter((m) => m.activa).length;
  const totalPagadas = matriculas.filter((m) => m.activa && estaPagado(m.estadoPago)).length;
  const totalNoPagadas = Math.max(totalActivas - totalPagadas, 0);

  function buildHref(page: number) {
    const params = new URLSearchParams();
    if (selectedAsignaturaId) params.set("asignaturaId", selectedAsignaturaId);
    params.set("page", String(page));
    return `/admin/matriculas?${params.toString()}`;
  }

  return (
    <section className="space-y-5">
      <RouteStateToast state={searchParams?.state} map={STATUS_MAP} />

      <header>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
          Matrículas
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
          Matricula alumnos por asignatura y controla indicador de pagó/no pagó.
        </p>
      </header>

      {/* Métricas */}
      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary dark:text-gray-400">
            Matrículas activas
          </p>
          <p className="mt-1 text-2xl font-bold text-text-primary dark:text-white">{totalActivas}</p>
        </article>
        <article className="rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm dark:border-green-900 dark:bg-green-950">
          <p className="text-xs font-medium uppercase tracking-wide text-green-800 dark:text-green-300">
            Pagó / cubierto
          </p>
          <p className="mt-1 text-2xl font-bold text-green-800 dark:text-green-200">{totalPagadas}</p>
        </article>
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-900 dark:bg-amber-950">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-800 dark:text-amber-300">
            No pagado
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-800 dark:text-amber-200">{totalNoPagadas}</p>
        </article>
      </div>

      {/* Filtro asignatura */}
      <form method="GET" className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <AsignaturaCombobox
            name="asignaturaId"
            label="Asignatura (filtro de tabla)"
            required={asignaturas.length > 0}
            defaultAsignatura={selectedAsignaturaCombobox}
          />
          <button
            type="submit"
            className="h-12 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:shadow-md active:scale-[0.98]"
          >
            Filtrar
          </button>
        </div>
      </form>

      {/* Formulario nueva matrícula */}
      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
          Registrar matrícula
        </h2>

        <form action={matricularAlumnoFormAction} className="mt-4 space-y-4">
          <input type="hidden" name="page" value={String(currentPage)} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <AsignaturaCombobox
                name="asignaturaId"
                label="Asignatura"
                required
                defaultAsignatura={selectedAsignaturaCombobox}
              />
            </div>

            {/* Combobox alumno */}
            <div className="sm:col-span-2">
              <AlumnoCombobox />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="mat-estado" className="text-sm font-medium text-text-primary dark:text-gray-200">
                Estado de pago <span className="text-danger">*</span>
              </label>
              <select
                id="mat-estado"
                name="estadoPago"
                required
                defaultValue="pendiente"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="pendiente">Pendiente</option>
                <option value="pagado">Pagado</option>
                <option value="mora">Mora</option>
                <option value="becado">Becado</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="mat-monto" className="text-sm font-medium text-text-primary dark:text-gray-200">
                Monto arancel (opcional)
              </label>
              <input
                id="mat-monto"
                name="montoArancel"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder="0.00"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="h-12 w-full rounded-xl bg-gradient-to-r from-primary to-primary-dark px-6 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-colors hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] sm:w-auto"
          >
            Guardar matrícula
          </button>
        </form>
      </article>

      {/* Lista matrículas */}
      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
              Matrículas registradas
            </h2>
            {totalCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
                {totalCount}
              </span>
            )}
          </div>
          <ExportCsvButton matriculas={matriculas} />
        </div>

        {matriculas.length === 0 ? (
          <p className="mt-4 text-sm text-text-secondary dark:text-gray-400">
            No hay matrículas registradas para esta asignatura.
          </p>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="mt-4 space-y-3 sm:hidden">
              {matriculas.map((matricula) => (
                <div
                  key={matricula.id}
                  className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-text-primary dark:text-white">
                        {matricula.alumnoNombre} {matricula.alumnoApellido}
                      </p>
                      <p className="text-xs text-text-secondary dark:text-gray-400">
                        {matricula.alumnoRut ?? "Sin RUT"}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        matricula.activa
                          ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
                          : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
                      }`}
                    >
                      {matricula.activa ? "Activa" : "Inactiva"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        estaPagado(matricula.estadoPago)
                          ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                      }`}
                    >
                      {ESTADO_PAGO_LABELS[matricula.estadoPago ?? ""] ?? matricula.estadoPago}
                    </span>
                    {matricula.montoArancel && (
                      <span className="text-xs text-text-secondary dark:text-gray-400">
                        ${matricula.montoArancel}
                      </span>
                    )}
                  </div>
                  {matricula.activa && (
                    <div className="mt-3 flex gap-2">
                      <EditMatriculaButton
                        matriculaId={matricula.id}
                        alumnoNombre={`${matricula.alumnoNombre} ${matricula.alumnoApellido}`}
                        estadoPago={matricula.estadoPago}
                        montoArancel={matricula.montoArancel}
                        asignaturaId={selectedAsignaturaId ?? ""}
                        currentPage={currentPage}
                      />
                      <DesmatricularButton
                        matriculaId={matricula.id}
                        alumnoNombre={`${matricula.alumnoNombre} ${matricula.alumnoApellido}`}
                        asignaturaId={selectedAsignaturaId ?? ""}
                        currentPage={currentPage}
                        className="h-10 flex-1 rounded-xl border border-danger/30 text-sm font-medium text-red-700 transition-colors hover:bg-danger/10 dark:text-red-400"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="mt-4 hidden overflow-x-auto sm:block">
              <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                    <th className="px-3 py-2.5">Alumno</th>
                    <th className="px-3 py-2.5">Estado pago</th>
                    <th className="px-3 py-2.5">Monto</th>
                    <th className="px-3 py-2.5">Estado</th>
                    <th className="px-3 py-2.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {matriculas.map((matricula) => (
                    <tr
                      key={matricula.id}
                      className="transition-colors hover:bg-primary/3 dark:hover:bg-primary/5"
                    >
                      <td className="px-3 py-3">
                        <p className="font-medium text-text-primary dark:text-gray-100">
                          {matricula.alumnoNombre} {matricula.alumnoApellido}
                        </p>
                        <p className="text-xs text-text-secondary dark:text-gray-400">
                          {matricula.alumnoRut ?? "Sin RUT"}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            estaPagado(matricula.estadoPago)
                              ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                          }`}
                        >
                          {ESTADO_PAGO_LABELS[matricula.estadoPago ?? ""] ?? matricula.estadoPago}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-text-secondary dark:text-gray-400">
                        {matricula.montoArancel ? `$${matricula.montoArancel}` : "-"}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            matricula.activa
                              ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
                              : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
                          }`}
                        >
                          {matricula.activa ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        {matricula.activa ? (
                          <div className="flex items-center justify-end gap-2">
                            <EditMatriculaButton
                              matriculaId={matricula.id}
                              alumnoNombre={`${matricula.alumnoNombre} ${matricula.alumnoApellido}`}
                              estadoPago={matricula.estadoPago}
                              montoArancel={matricula.montoArancel}
                              asignaturaId={selectedAsignaturaId ?? ""}
                              currentPage={currentPage}
                            />
                            <DesmatricularButton
                              matriculaId={matricula.id}
                              alumnoNombre={`${matricula.alumnoNombre} ${matricula.alumnoApellido}`}
                              asignaturaId={selectedAsignaturaId ?? ""}
                              currentPage={currentPage}
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-text-secondary dark:text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              buildHref={buildHref}
            />
          </>
        )}
      </article>
    </section>
  );
}
