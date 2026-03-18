import {
  crearDocenteFormAction,
  desactivarDocenteFormAction,
  listarUsuariosPorRol,
} from "@/actions/usuarios";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { formatearRut } from "@/lib/rut";

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  docente_created: {
    tone: "success",
    text: "Docente creado correctamente.",
  },
  docente_updated: {
    tone: "success",
    text: "Docente actualizado/reactivado correctamente.",
  },
  user_deactivated: {
    tone: "success",
    text: "Docente desactivado correctamente.",
  },
  already_inactive: {
    tone: "success",
    text: "El docente ya estaba inactivo.",
  },
  invalid_input: {
    tone: "error",
    text: "Datos inválidos. Verifica RUT, correo y política de contraseña.",
  },
  invalid_rut: {
    tone: "error",
    text: "RUT inválido. Revisa formato y dígito verificador.",
  },
  invalid_email: {
    tone: "error",
    text: "Correo inválido. Verifica el formato ingresado.",
  },
  invalid_password_policy: {
    tone: "error",
    text: "La contraseña no cumple política: mínimo 12, mayúscula, minúscula, número y símbolo.",
  },
  invalid_name: {
    tone: "error",
    text: "Nombre o apellido inválido. Deben tener al menos 2 caracteres.",
  },
  email_conflict: {
    tone: "error",
    text: "El correo ya está registrado por otro usuario.",
  },
  rut_conflict: {
    tone: "error",
    text: "El RUT ya está asociado a otro tipo de usuario.",
  },
  docente_mutation_failed: {
    tone: "error",
    text: "No fue posible crear/actualizar el docente por un error interno.",
  },
  forbidden: {
    tone: "error",
    text: "Tu sesión no tiene permisos de administrador para esta acción.",
  },
  error: {
    tone: "error",
    text: "No fue posible completar la acción. Revisa los datos e intenta nuevamente.",
  },
};

type AdminDocentesPageProps = {
  searchParams?: {
    state?: string;
  };
};

export default async function AdminDocentesPage({
  searchParams,
}: AdminDocentesPageProps) {
  const docentes = await listarUsuariosPorRol(
    "docente",
    { limit: 50, offset: 0 },
    { incluirInactivos: true },
  );
  return (
    <section className="space-y-6">
      <RouteStateToast state={searchParams?.state} map={STATUS_MAP} />

      <header>
        <h1 className="text-2xl font-bold text-text-primary dark:text-gray-100">
          Gestión de docentes
        </h1>
        <p className="text-sm text-text-secondary dark:text-gray-300">
          Crea cuentas docentes seguras y administra su estado operativo.
        </p>
      </header>

      <article className="rounded-md border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-text-primary dark:text-gray-100">
          Crear docente
        </h2>
        <form action={crearDocenteFormAction} className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="docente-nombre" className="text-sm font-medium text-text-primary dark:text-gray-100">
              Nombre
            </label>
            <input
              id="docente-nombre"
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
            <label htmlFor="docente-apellido" className="text-sm font-medium text-text-primary dark:text-gray-100">
              Apellido
            </label>
            <input
              id="docente-apellido"
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
            <label htmlFor="docente-email" className="text-sm font-medium text-text-primary dark:text-gray-100">
              Correo
            </label>
            <input
              id="docente-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              maxLength={180}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="docente-rut" className="text-sm font-medium text-text-primary dark:text-gray-100">
              RUT
            </label>
            <input
              id="docente-rut"
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
            <label htmlFor="docente-password" className="text-sm font-medium text-text-primary dark:text-gray-100">
              Contraseña inicial
            </label>
            <input
              id="docente-password"
              name="password"
              type="password"
              inputMode="text"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
            <p className="text-xs text-text-secondary dark:text-gray-400">
              Debe incluir mayúscula, minúscula, número, símbolo y mínimo 12 caracteres.
            </p>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="h-10 rounded bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Crear docente
            </button>
          </div>
        </form>
      </article>

      <article className="rounded-md border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-text-primary dark:text-gray-100">
          Docentes registrados
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
              {docentes.map((docente) => (
                <tr key={docente.id}>
                  <td className="px-3 py-2 text-text-primary dark:text-gray-100">
                    {docente.nombre} {docente.apellido}
                  </td>
                  <td className="px-3 py-2 text-text-secondary dark:text-gray-300">
                    {docente.rut ? formatearRut(docente.rut) : "-"}
                  </td>
                  <td className="px-3 py-2 text-text-secondary dark:text-gray-300">
                    {docente.email ?? "-"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${
                        docente.activo
                          ? "bg-success/15 text-text-primary dark:bg-green-950 dark:text-green-100"
                          : "bg-warning/20 text-text-primary dark:bg-amber-950 dark:text-amber-100"
                      }`}
                    >
                      {docente.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {docente.activo ? (
                      <form action={desactivarDocenteFormAction} className="inline">
                        <input type="hidden" name="userId" value={docente.id} />
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
