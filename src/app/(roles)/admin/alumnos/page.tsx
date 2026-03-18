import {
  crearAlumnoFormAction,
  desactivarAlumnoFormAction,
  listarUsuariosPorRol,
} from "@/actions/usuarios";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { formatearRut } from "@/lib/rut";

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  alumno_created: {
    tone: "success",
    text: "Alumno creado correctamente.",
  },
  alumno_updated: {
    tone: "success",
    text: "Alumno actualizado/reactivado correctamente.",
  },
  user_deactivated: {
    tone: "success",
    text: "Alumno desactivado correctamente.",
  },
  already_inactive: {
    tone: "success",
    text: "El alumno ya estaba inactivo.",
  },
  error: {
    tone: "error",
    text: "No fue posible completar la acción. Revisa los datos e intenta nuevamente.",
  },
};

type AdminAlumnosPageProps = {
  searchParams?: {
    state?: string;
  };
};

export default async function AdminAlumnosPage({
  searchParams,
}: AdminAlumnosPageProps) {
  const alumnos = await listarUsuariosPorRol(
    "alumno",
    { limit: 50, offset: 0 },
    { incluirInactivos: true },
  );
  return (
    <section className="space-y-6">
      <RouteStateToast state={searchParams?.state} map={STATUS_MAP} />

      <header>
        <h1 className="text-2xl font-bold text-text-primary dark:text-gray-100">
          Gestión de alumnos
        </h1>
        <p className="text-sm text-text-secondary dark:text-gray-300">
          Registra alumnos con validación RUT y controla su estado de acceso.
        </p>
      </header>

      <article className="rounded-md border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-text-primary dark:text-gray-100">
          Crear alumno
        </h2>
        <form action={crearAlumnoFormAction} className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="alumno-nombre" className="text-sm font-medium text-text-primary dark:text-gray-100">
              Nombre
            </label>
            <input
              id="alumno-nombre"
              name="nombre"
              type="text"
              inputMode="text"
              required
              minLength={2}
              maxLength={80}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="alumno-apellido" className="text-sm font-medium text-text-primary dark:text-gray-100">
              Apellido
            </label>
            <input
              id="alumno-apellido"
              name="apellido"
              type="text"
              inputMode="text"
              required
              minLength={2}
              maxLength={80}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="alumno-rut" className="text-sm font-medium text-text-primary dark:text-gray-100">
              RUT
            </label>
            <input
              id="alumno-rut"
              name="rut"
              type="text"
              inputMode="numeric"
              required
              minLength={8}
              maxLength={12}
              placeholder="12.345.678-5"
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="alumno-email" className="text-sm font-medium text-text-primary dark:text-gray-100">
              Correo (opcional)
            </label>
            <input
              id="alumno-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={180}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="h-10 rounded bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Crear alumno
            </button>
          </div>
        </form>
      </article>

      <article className="rounded-md border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-text-primary dark:text-gray-100">
          Alumnos registrados
        </h2>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-300">
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">RUT</th>
                <th className="px-3 py-2">Correo</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {alumnos.map((alumno) => (
                <tr key={alumno.id}>
                  <td className="px-3 py-2 text-text-primary dark:text-gray-100">
                    {alumno.nombre} {alumno.apellido}
                  </td>
                  <td className="px-3 py-2 text-text-secondary dark:text-gray-300">
                    {alumno.rut ? formatearRut(alumno.rut) : "-"}
                  </td>
                  <td className="px-3 py-2 text-text-secondary dark:text-gray-300">
                    {alumno.email ?? "-"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${
                        alumno.activo
                          ? "bg-success/15 text-text-primary dark:bg-green-950 dark:text-green-100"
                          : "bg-warning/20 text-text-primary dark:bg-amber-950 dark:text-amber-100"
                      }`}
                    >
                      {alumno.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {alumno.activo ? (
                      <form action={desactivarAlumnoFormAction} className="inline">
                        <input type="hidden" name="userId" value={alumno.id} />
                        <button
                          type="submit"
                          className="rounded border border-danger/40 px-3 py-1 text-xs font-medium text-text-primary hover:bg-danger/10 dark:text-gray-100"
                        >
                          Desactivar
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
