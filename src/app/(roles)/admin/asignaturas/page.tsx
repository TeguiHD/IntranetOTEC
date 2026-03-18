import {
  asignarDocenteFormAction,
  countAsignaturasAdmin,
  crearAsignaturaFormAction,
  listarAsignaturasAdmin,
} from "@/actions/asignaturas";
import { listarUsuariosPorRol } from "@/actions/usuarios";
import { Pagination } from "@/components/shared/Pagination";
import { RouteStateToast } from "@/components/shared/RouteStateToast";

const PAGE_SIZE = 20;

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  asignatura_created: {
    tone: "success",
    text: "Asignatura creada correctamente.",
  },
  docente_assigned: {
    tone: "success",
    text: "Docente asignado correctamente.",
  },
  error: {
    tone: "error",
    text: "No fue posible completar la acción. Revisa los datos e intenta nuevamente.",
  },
};

const ESTADO_BADGE_CLASS: Record<string, string> = {
  activo: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  borrador: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  finalizado: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  archivado: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
};

type AdminAsignaturasPageProps = {
  searchParams?: {
    state?: string;
    page?: string;
  };
};

export default async function AdminAsignaturasPage({
  searchParams,
}: AdminAsignaturasPageProps) {
  const currentPage = Math.max(1, Number(searchParams?.page ?? "1") || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const [asignaturas, docentes, totalCount] = await Promise.all([
    listarAsignaturasAdmin({ limit: PAGE_SIZE, offset }, { incluirArchivadas: true }),
    listarUsuariosPorRol("docente", { limit: 200, offset: 0 }),
    countAsignaturasAdmin({ incluirArchivadas: true }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const buildHref = (page: number): string => `/admin/asignaturas?page=${page}`;

  return (
    <section className="space-y-5">
      <RouteStateToast state={searchParams?.state} map={STATUS_MAP} />

      <header>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-gray-100 sm:text-2xl">
          Asignaturas
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-300">
          Crea asignaturas, define duración y asigna docentes responsables.
        </p>
      </header>

      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-6">
        <h2 className="text-lg font-semibold text-text-primary dark:text-gray-100">
          Crear asignatura
        </h2>

        <form action={crearAsignaturaFormAction} className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-1 md:col-span-2">
            <label htmlFor="asig-nombre" className="text-sm font-medium text-text-primary dark:text-gray-100">
              Nombre
            </label>
            <input
              id="asig-nombre"
              name="nombre"
              type="text"
              inputMode="text"
              required
              minLength={3}
              maxLength={120}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label htmlFor="asig-descripcion" className="text-sm font-medium text-text-primary dark:text-gray-100">
              Descripción
            </label>
            <textarea
              id="asig-descripcion"
              name="descripcion"
              rows={3}
              maxLength={500}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="asig-codigo" className="text-sm font-medium text-text-primary dark:text-gray-100">
              Código (opcional)
            </label>
            <input
              id="asig-codigo"
              name="codigo"
              type="text"
              inputMode="text"
              maxLength={24}
              placeholder="ASIG-001"
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm uppercase text-text-primary focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="asig-fecha" className="text-sm font-medium text-text-primary dark:text-gray-100">
              Fecha inicio
            </label>
            <input
              id="asig-fecha"
              name="fechaInicio"
              type="date"
              inputMode="numeric"
              required
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="asig-duracion" className="text-sm font-medium text-text-primary dark:text-gray-100">
              Duración (meses)
            </label>
            <select
              id="asig-duracion"
              name="duracionMeses"
              required
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            >
              <option value="2">2 meses</option>
              <option value="4">4 meses</option>
              <option value="6">6 meses</option>
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="asig-max" className="text-sm font-medium text-text-primary dark:text-gray-100">
              Máximo alumnos
            </label>
            <input
              id="asig-max"
              name="maxAlumnos"
              type="number"
              inputMode="numeric"
              required
              min={1}
              max={300}
              defaultValue={30}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="asig-docente" className="text-sm font-medium text-text-primary dark:text-gray-100">
              Docente inicial (opcional)
            </label>
            <select
              id="asig-docente"
              name="docenteId"
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            >
              <option value="">Sin asignar</option>
              {docentes.map((docente) => (
                <option key={docente.id} value={docente.id}>
                  {docente.nombre} {docente.apellido}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="h-10 rounded bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Crear asignatura
            </button>
          </div>
        </form>
      </article>

      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-text-primary dark:text-gray-100">
            Asignaturas registradas
          </h2>
          {totalCount > 0 ? (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
              {totalCount}
            </span>
          ) : null}
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-300">
                <th className="px-3 py-2">Asignatura</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Docente</th>
                <th className="px-3 py-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {asignaturas.map((asignatura) => (
                <tr key={asignatura.id}>
                  <td className="px-3 py-2 text-text-primary dark:text-gray-100">
                    <p className="font-medium">{asignatura.nombre}</p>
                    <p className="text-xs text-text-secondary dark:text-gray-400">
                      {asignatura.codigo ?? "Sin código"} · {asignatura.duracionMeses} meses
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        ESTADO_BADGE_CLASS[asignatura.estado ?? ""] ??
                        "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                      }`}
                    >
                      {asignatura.estado}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-text-secondary dark:text-gray-300">
                    {asignatura.docenteNombre
                      ? `${asignatura.docenteNombre} ${asignatura.docenteApellido ?? ""}`
                      : "Sin asignar"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <form action={asignarDocenteFormAction} className="inline-flex items-center gap-2">
                      <input type="hidden" name="asignaturaId" value={asignatura.id} />
                      <select
                        name="docenteId"
                        required
                        defaultValue={asignatura.docenteId ?? ""}
                        className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-text-primary focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                      >
                        <option value="">Selecciona docente</option>
                        {docentes.map((docente) => (
                          <option key={docente.id} value={docente.id}>
                            {docente.nombre} {docente.apellido}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded bg-primary px-3 py-1 text-xs font-semibold text-white hover:bg-primary-dark"
                        disabled={docentes.length === 0}
                      >
                        Asignar
                      </button>
                    </form>
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
      </article>
    </section>
  );
}