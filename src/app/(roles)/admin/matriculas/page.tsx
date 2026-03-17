import { listarAsignaturasAdmin } from "@/actions/asignaturas";
import {
  desmatricularAlumnoFormAction,
  listarMatriculasAdmin,
  matricularAlumnoFormAction,
} from "@/actions/matriculas";
import { listarUsuariosPorRol } from "@/actions/usuarios";

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  matricula_created: {
    tone: "success",
    text: "Matrícula creada correctamente.",
  },
  matricula_updated: {
    tone: "success",
    text: "Matrícula actualizada/reactivada correctamente.",
  },
  matricula_deactivated: {
    tone: "success",
    text: "Matrícula desactivada correctamente.",
  },
  already_inactive: {
    tone: "success",
    text: "La matrícula ya estaba inactiva.",
  },
  error: {
    tone: "error",
    text: "No fue posible completar la acción. Revisa los datos e intenta nuevamente.",
  },
};

type AdminMatriculasPageProps = {
  searchParams?: {
    state?: string;
    asignaturaId?: string;
  };
};

const estaPagado = (estadoPago: string | null | undefined): boolean =>
  estadoPago === "pagado" || estadoPago === "becado";

export default async function AdminMatriculasPage({
  searchParams,
}: AdminMatriculasPageProps) {
  const [asignaturas, alumnos] = await Promise.all([
    listarAsignaturasAdmin({ limit: 50, offset: 0 }, { incluirArchivadas: false }),
    listarUsuariosPorRol("alumno", { limit: 50, offset: 0 }),
  ]);

  const selectedAsignaturaIdRaw =
    typeof searchParams?.asignaturaId === "string" ? searchParams.asignaturaId : undefined;
  const selectedAsignaturaId =
    selectedAsignaturaIdRaw && asignaturas.some((item) => item.id === selectedAsignaturaIdRaw)
      ? selectedAsignaturaIdRaw
      : asignaturas[0]?.id;

  const matriculas = selectedAsignaturaId
    ? await listarMatriculasAdmin(
        { limit: 50, offset: 0 },
        { asignaturaId: selectedAsignaturaId, incluirInactivas: true },
      )
    : [];

  const totalActivas = matriculas.filter((matricula) => matricula.activa).length;
  const totalPagadas = matriculas.filter(
    (matricula) => matricula.activa && estaPagado(matricula.estadoPago),
  ).length;
  const totalNoPagadas = Math.max(totalActivas - totalPagadas, 0);

  const state = typeof searchParams?.state === "string" ? searchParams.state : undefined;
  const banner = state ? STATUS_MAP[state] ?? STATUS_MAP.error : null;

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-text-primary dark:text-gray-100">Matrículas</h1>
        <p className="text-sm text-text-secondary dark:text-gray-300">
          Matricula alumnos por asignatura y controla indicador de pagó/no pagó.
        </p>
      </header>

      {banner ? (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            banner.tone === "success"
              ? "border-success/30 bg-success/10 text-text-primary dark:border-green-700 dark:bg-green-950 dark:text-green-100"
              : "border-danger/30 bg-danger/10 text-text-primary dark:border-red-700 dark:bg-red-950 dark:text-red-100"
          }`}
          role="status"
        >
          {banner.text}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <article className="rounded-md border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-wide text-text-secondary dark:text-gray-300">
            Matrículas activas
          </p>
          <p className="mt-1 text-2xl font-bold text-text-primary dark:text-gray-100">{totalActivas}</p>
        </article>

        <article className="rounded-md border border-success/30 bg-success/10 p-4 shadow-sm dark:border-green-700 dark:bg-green-950">
          <p className="text-xs uppercase tracking-wide text-text-secondary dark:text-green-100">
            Pagó / cubierto
          </p>
          <p className="mt-1 text-2xl font-bold text-text-primary dark:text-green-100">{totalPagadas}</p>
        </article>

        <article className="rounded-md border border-warning/40 bg-warning/10 p-4 shadow-sm dark:border-amber-700 dark:bg-amber-950">
          <p className="text-xs uppercase tracking-wide text-text-secondary dark:text-amber-100">
            No pagado
          </p>
          <p className="mt-1 text-2xl font-bold text-text-primary dark:text-amber-100">{totalNoPagadas}</p>
        </article>
      </div>

      <article className="rounded-md border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-text-primary dark:text-gray-100">
          Registrar matrícula
        </h2>

        <form action={matricularAlumnoFormAction} className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="mat-asignatura" className="text-sm font-medium text-text-primary dark:text-gray-100">
              Asignatura
            </label>
            <select
              id="mat-asignatura"
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

          <div className="space-y-1">
            <label htmlFor="mat-alumno" className="text-sm font-medium text-text-primary dark:text-gray-100">
              Alumno
            </label>
            <select
              id="mat-alumno"
              name="alumnoId"
              required
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            >
              <option value="">Selecciona alumno</option>
              {alumnos.map((alumno) => (
                <option key={alumno.id} value={alumno.id}>
                  {alumno.nombre} {alumno.apellido} ({alumno.rut ?? "sin RUT"})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="mat-estado" className="text-sm font-medium text-text-primary dark:text-gray-100">
              Estado de pago
            </label>
            <select
              id="mat-estado"
              name="estadoPago"
              required
              defaultValue="pendiente"
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            >
              <option value="pendiente">Pendiente</option>
              <option value="pagado">Pagado</option>
              <option value="mora">Mora</option>
              <option value="becado">Becado</option>
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="mat-monto" className="text-sm font-medium text-text-primary dark:text-gray-100">
              Monto arancel (opcional)
            </label>
            <input
              id="mat-monto"
              name="montoArancel"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="h-10 rounded bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Guardar matrícula
            </button>
          </div>
        </form>
      </article>

      <article className="rounded-md border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold text-text-primary dark:text-gray-100">
            Matrículas registradas
          </h2>

          <form method="GET" className="flex items-center gap-2">
            <label htmlFor="mat-filter" className="text-xs font-medium text-text-secondary dark:text-gray-300">
              Filtrar asignatura
            </label>
            <select
              id="mat-filter"
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
                <th className="px-3 py-2">Alumno</th>
                <th className="px-3 py-2">Estado pago</th>
                <th className="px-3 py-2">Pagó</th>
                <th className="px-3 py-2">Monto</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {matriculas.map((matricula) => (
                <tr key={matricula.id}>
                  <td className="px-3 py-2 text-text-primary dark:text-gray-100">
                    {matricula.alumnoNombre} {matricula.alumnoApellido}
                    <p className="text-xs text-text-secondary dark:text-gray-400">
                      {matricula.alumnoRut ?? "Sin RUT"}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-text-secondary dark:text-gray-300">
                    {matricula.estadoPago}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${
                        estaPagado(matricula.estadoPago)
                          ? "bg-success/15 text-text-primary dark:bg-green-950 dark:text-green-100"
                          : "bg-warning/20 text-text-primary dark:bg-amber-950 dark:text-amber-100"
                      }`}
                    >
                      {estaPagado(matricula.estadoPago) ? "Sí" : "No"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-text-secondary dark:text-gray-300">
                    {matricula.montoArancel ?? "-"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${
                        matricula.activa
                          ? "bg-success/15 text-text-primary dark:bg-green-950 dark:text-green-100"
                          : "bg-warning/20 text-text-primary dark:bg-amber-950 dark:text-amber-100"
                      }`}
                    >
                      {matricula.activa ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {matricula.activa ? (
                      <form action={desmatricularAlumnoFormAction} className="inline">
                        <input type="hidden" name="matriculaId" value={matricula.id} />
                        <input
                          type="hidden"
                          name="asignaturaId"
                          value={selectedAsignaturaId ?? ""}
                        />
                        <button
                          type="submit"
                          className="rounded border border-danger/40 px-3 py-1 text-xs font-medium text-text-primary hover:bg-danger/10 dark:text-gray-100"
                        >
                          Desmatricular
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-text-secondary dark:text-gray-400">
                        Sin acciones
                      </span>
                    )}
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
