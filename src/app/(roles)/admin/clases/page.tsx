import { listarAsignaturasAdmin } from "@/actions/asignaturas";
import { crearClaseFormAction, listarClasesAdmin } from "@/actions/clases";
import { RouteStateToast } from "@/components/shared/RouteStateToast";

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  clase_created: {
    tone: "success",
    text: "Clase creada correctamente.",
  },
  error: {
    tone: "error",
    text: "No fue posible crear la clase. Revisa los datos e intenta nuevamente.",
  },
};

type AdminClasesPageProps = {
  searchParams?: {
    state?: string;
    asignaturaId?: string;
  };
};

export default async function AdminClasesPage({
  searchParams,
}: AdminClasesPageProps) {
  const asignaturas = await listarAsignaturasAdmin(
    { limit: 50, offset: 0 },
    { incluirArchivadas: false },
  );

  const selectedAsignaturaIdRaw =
    typeof searchParams?.asignaturaId === "string" ? searchParams.asignaturaId : undefined;
  const selectedAsignaturaId =
    selectedAsignaturaIdRaw && asignaturas.some((item) => item.id === selectedAsignaturaIdRaw)
      ? selectedAsignaturaIdRaw
      : asignaturas[0]?.id;

  const clases = await listarClasesAdmin(
    { limit: 50, offset: 0 },
    {
      asignaturaId: selectedAsignaturaId,
      incluirArchivadas: true,
    },
  );

  return (
    <section className="space-y-6">
      <RouteStateToast state={searchParams?.state} map={STATUS_MAP} />

      <header>
        <h1 className="text-2xl font-bold text-text-primary dark:text-gray-100">Clases</h1>
        <p className="text-sm text-text-secondary dark:text-gray-300">
          Crea sesiones por asignatura y publica material audiovisual de forma segura.
        </p>
      </header>

      <article className="rounded-md border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-text-primary dark:text-gray-100">
          Crear clase
        </h2>

        <form action={crearClaseFormAction} className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-1 md:col-span-2">
            <label htmlFor="clase-asignatura" className="text-sm font-medium text-text-primary dark:text-gray-100">
              Asignatura
            </label>
            <select
              id="clase-asignatura"
              name="asignaturaId"
              required
              defaultValue={selectedAsignaturaId ?? ""}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            >
              <option value="">Selecciona asignatura</option>
              {asignaturas.map((asignatura) => (
                <option key={asignatura.id} value={asignatura.id}>
                  {asignatura.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 md:col-span-2">
            <label htmlFor="clase-titulo" className="text-sm font-medium text-text-primary dark:text-gray-100">
              Título
            </label>
            <input
              id="clase-titulo"
              name="titulo"
              type="text"
              inputMode="text"
              required
              minLength={3}
              maxLength={140}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label htmlFor="clase-descripcion" className="text-sm font-medium text-text-primary dark:text-gray-100">
              Descripción
            </label>
            <textarea
              id="clase-descripcion"
              name="descripcion"
              rows={3}
              maxLength={600}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="clase-fecha" className="text-sm font-medium text-text-primary dark:text-gray-100">
              Fecha
            </label>
            <input
              id="clase-fecha"
              name="fecha"
              type="date"
              inputMode="numeric"
              required
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="clase-hora" className="text-sm font-medium text-text-primary dark:text-gray-100">
              Hora inicio (opcional)
            </label>
            <input
              id="clase-hora"
              name="horaInicio"
              type="time"
              inputMode="numeric"
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="clase-sesion" className="text-sm font-medium text-text-primary dark:text-gray-100">
              Número sesión (opcional)
            </label>
            <input
              id="clase-sesion"
              name="numeroSesion"
              type="number"
              inputMode="numeric"
              min={1}
              max={1000}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="clase-tipo-url" className="text-sm font-medium text-text-primary dark:text-gray-100">
              Tipo URL (opcional)
            </label>
            <select
              id="clase-tipo-url"
              name="tipoUrl"
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            >
              <option value="">Sin grabación</option>
              <option value="youtube">YouTube</option>
              <option value="vimeo">Vimeo</option>
              <option value="drive">Drive</option>
              <option value="directo">Directo</option>
            </select>
          </div>

          <div className="space-y-1 md:col-span-2">
            <label htmlFor="clase-url" className="text-sm font-medium text-text-primary dark:text-gray-100">
              URL grabación (opcional)
            </label>
            <input
              id="clase-url"
              name="urlGrabacion"
              type="url"
              inputMode="url"
              maxLength={500}
              placeholder="https://www.youtube-nocookie.com/..."
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="md:col-span-2">
            <label className="inline-flex items-center gap-2 text-sm text-text-primary dark:text-gray-100">
              <input
                type="checkbox"
                name="publicada"
                inputMode="text"
                className="h-4 w-4 rounded border-gray-300"
              />
              Publicar inmediatamente
            </label>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="h-10 rounded bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Crear clase
            </button>
          </div>
        </form>
      </article>

      <article className="rounded-md border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold text-text-primary dark:text-gray-100">
            Clases registradas
          </h2>

          <form method="GET" className="flex items-center gap-2">
            <label htmlFor="clases-filter" className="text-xs font-medium text-text-secondary dark:text-gray-300">
              Filtrar asignatura
            </label>
            <select
              id="clases-filter"
              name="asignaturaId"
              defaultValue={selectedAsignaturaId}
              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-text-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            >
              {asignaturas.map((asignatura) => (
                <option key={asignatura.id} value={asignatura.id}>
                  {asignatura.nombre}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-text-primary hover:bg-gray-100 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800"
            >
              Aplicar
            </button>
          </form>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-300">
                <th className="px-3 py-2">Sesión</th>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Grabación</th>
                <th className="px-3 py-2">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {clases.map((clase) => (
                <tr key={clase.id}>
                  <td className="px-3 py-2 text-text-primary dark:text-gray-100">
                    <p className="font-medium">Sesión {clase.numeroSesion}</p>
                    <p className="text-xs text-text-secondary dark:text-gray-400">{clase.titulo}</p>
                  </td>
                  <td className="px-3 py-2 text-text-secondary dark:text-gray-300">
                    {clase.fecha}
                    {clase.horaInicio ? ` ${clase.horaInicio}` : ""}
                  </td>
                  <td className="px-3 py-2 text-text-secondary dark:text-gray-300">
                    {clase.urlGrabacion ? clase.tipoUrl ?? "URL" : "Sin URL"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${
                        clase.publicada
                          ? "bg-success/15 text-text-primary dark:bg-green-950 dark:text-green-100"
                          : "bg-warning/20 text-text-primary dark:bg-amber-950 dark:text-amber-100"
                      }`}
                    >
                      {clase.publicada ? "Publicada" : "Borrador"}
                    </span>
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
