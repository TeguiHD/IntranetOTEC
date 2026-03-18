import {
  asignarDocenteFormAction,
  crearAsignaturaFormAction,
  listarAsignaturasAdmin,
} from "@/actions/asignaturas";
import { listarUsuariosPorRol } from "@/actions/usuarios";
import { RouteStateToast } from "@/components/shared/RouteStateToast";

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

type AdminAsignaturasPageProps = {
  searchParams?: {
    state?: string;
  };
};

export default async function AdminAsignaturasPage({
  searchParams,
}: AdminAsignaturasPageProps) {
  const [asignaturas, docentes] = await Promise.all([
    listarAsignaturasAdmin({ limit: 50, offset: 0 }, { incluirArchivadas: true }),
    listarUsuariosPorRol("docente", { limit: 50, offset: 0 }),
  ]);

  return (
    <section className="space-y-6">
      <RouteStateToast state={searchParams?.state} map={STATUS_MAP} />

      <header>
        <h1 className="text-2xl font-bold text-text-primary dark:text-gray-100">Asignaturas</h1>
        <p className="text-sm text-text-secondary dark:text-gray-300">
          Crea asignaturas, define duración y asigna docentes responsables.
        </p>
      </header>

      <article className="rounded-md border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
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

      <article className="rounded-md border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-text-primary dark:text-gray-100">
          Asignaturas registradas
        </h2>

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
                    <span className="inline-flex rounded bg-gray-100 px-2 py-1 text-xs font-medium text-text-primary dark:bg-gray-800 dark:text-gray-200">
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
      </article>
    </section>
  );
}