import {
  crearDocenteFormAction,
  desactivarDocenteFormAction,
  activarDocenteFormAction,
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
  user_activated: {
    tone: "success",
    text: "Docente activado correctamente.",
  },
  already_inactive: {
    tone: "success",
    text: "El docente ya estaba inactivo.",
  },
  already_active: {
    tone: "success",
    text: "El docente ya estaba activo.",
  },
  invalid_input: {
    tone: "error",
    text: "Datos invalidos. Verifica RUT, correo y politica de contrasena.",
  },
  invalid_rut: {
    tone: "error",
    text: "RUT invalido. Revisa formato y digito verificador.",
  },
  invalid_email: {
    tone: "error",
    text: "Correo invalido. Verifica el formato ingresado.",
  },
  invalid_password_policy: {
    tone: "error",
    text: "La contrasena no cumple politica: minimo 12 caracteres, mayuscula, minuscula, numero y simbolo.",
  },
  invalid_name: {
    tone: "error",
    text: "Nombre o apellido invalido. Deben tener al menos 2 caracteres.",
  },
  email_conflict: {
    tone: "error",
    text: "El correo ya esta registrado por otro usuario.",
  },
  rut_conflict: {
    tone: "error",
    text: "El RUT ya esta asociado a otro tipo de usuario.",
  },
  docente_mutation_failed: {
    tone: "error",
    text: "No fue posible crear/actualizar el docente por un error interno.",
  },
  forbidden: {
    tone: "error",
    text: "Tu sesion no tiene permisos de administrador para esta accion.",
  },
  error: {
    tone: "error",
    text: "No fue posible completar la accion. Revisa los datos e intenta nuevamente.",
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
    <section className="space-y-5">
      <RouteStateToast state={searchParams?.state} map={STATUS_MAP} />

      <header>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
          Gestion de Docentes
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
          Crea cuentas docentes seguras y administra su estado operativo.
        </p>
      </header>

      {/* Form: Crear Docente */}
      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
          Crear Docente
        </h2>
        <form action={crearDocenteFormAction} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="docente-nombre" className="text-sm font-medium text-text-primary dark:text-gray-200">
                Nombre <span className="text-danger">*</span>
              </label>
              <input
                id="docente-nombre"
                name="nombre"
                type="text"
                inputMode="text"
                required
                minLength={2}
                maxLength={80}
                placeholder="Ej: Maria"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-gray-400 transition-shadow focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-primary-light dark:focus:ring-primary/30"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="docente-apellido" className="text-sm font-medium text-text-primary dark:text-gray-200">
                Apellido <span className="text-danger">*</span>
              </label>
              <input
                id="docente-apellido"
                name="apellido"
                type="text"
                inputMode="text"
                required
                minLength={2}
                maxLength={80}
                placeholder="Ej: Gonzalez"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-gray-400 transition-shadow focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-primary-light dark:focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="docente-email" className="text-sm font-medium text-text-primary dark:text-gray-200">
                Correo electronico <span className="text-danger">*</span>
              </label>
              <input
                id="docente-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                maxLength={180}
                placeholder="docente@ejemplo.cl"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-gray-400 transition-shadow focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-primary-light dark:focus:ring-primary/30"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="docente-rut" className="text-sm font-medium text-text-primary dark:text-gray-200">
                RUT <span className="text-danger">*</span>
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
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-gray-400 transition-shadow focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-primary-light dark:focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="docente-password" className="text-sm font-medium text-text-primary dark:text-gray-200">
              Contrasena inicial <span className="text-danger">*</span>
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
              placeholder="Minimo 12 caracteres"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-gray-400 transition-shadow focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-primary-light dark:focus:ring-primary/30"
            />
            <p className="text-xs text-text-muted dark:text-gray-500">
              Debe incluir mayuscula, minuscula, numero, simbolo y minimo 12 caracteres.
            </p>
          </div>

          <button
            type="submit"
            className="h-12 w-full rounded-xl bg-gradient-to-r from-primary to-primary-dark px-6 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] sm:w-auto"
          >
            Crear Docente
          </button>
        </form>
      </article>

      {/* Lista: Docentes Registrados */}
      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
          Docentes Registrados
        </h2>

        {docentes.length === 0 ? (
          <p className="mt-4 text-sm text-text-secondary dark:text-gray-400">
            No hay docentes registrados aun.
          </p>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="mt-4 space-y-3 sm:hidden">
              {docentes.map((docente) => (
                <div key={docente.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-text-primary dark:text-white">
                        {docente.nombre} {docente.apellido}
                      </p>
                      <p className="mt-0.5 text-sm text-text-secondary dark:text-gray-400">
                        {docente.rut ? formatearRut(docente.rut) : "-"}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-text-secondary dark:text-gray-400">
                        {docente.email ?? "-"}
                      </p>
                    </div>
                    <span
                      className={`ml-2 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        docente.activo
                          ? "bg-success/15 text-green-700 dark:bg-green-950 dark:text-green-300"
                          : "bg-warning/15 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {docente.activo ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <div className="mt-3">
                    {docente.activo ? (
                      <form action={desactivarDocenteFormAction}>
                        <input type="hidden" name="userId" value={docente.id} />
                        <button
                          type="submit"
                          className="h-10 w-full rounded-xl border border-danger/30 text-sm font-medium text-danger transition-colors hover:bg-danger/10 active:bg-danger/20 dark:text-red-400"
                        >
                          Desactivar
                        </button>
                      </form>
                    ) : (
                      <form action={activarDocenteFormAction}>
                        <input type="hidden" name="userId" value={docente.id} />
                        <button
                          type="submit"
                          className="h-10 w-full rounded-xl border border-success/30 text-sm font-medium text-green-700 transition-colors hover:bg-success/10 active:bg-success/20 dark:text-green-400"
                        >
                          Activar
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="mt-4 hidden overflow-x-auto sm:block">
              <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                    <th className="px-3 py-2.5">Nombre</th>
                    <th className="px-3 py-2.5">RUT</th>
                    <th className="px-3 py-2.5">Correo</th>
                    <th className="px-3 py-2.5">Estado</th>
                    <th className="px-3 py-2.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {docentes.map((docente) => (
                    <tr key={docente.id} className="transition-colors hover:bg-primary/3 dark:hover:bg-primary/5">
                      <td className="px-3 py-3 font-medium text-text-primary dark:text-gray-100">
                        {docente.nombre} {docente.apellido}
                      </td>
                      <td className="px-3 py-3 text-text-secondary dark:text-gray-400">
                        {docente.rut ? formatearRut(docente.rut) : "-"}
                      </td>
                      <td className="px-3 py-3 text-text-secondary dark:text-gray-400">
                        {docente.email ?? "-"}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            docente.activo
                              ? "bg-success/15 text-green-700 dark:bg-green-950 dark:text-green-300"
                              : "bg-warning/15 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {docente.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        {docente.activo ? (
                          <form action={desactivarDocenteFormAction} className="inline">
                            <input type="hidden" name="userId" value={docente.id} />
                            <button
                              type="submit"
                              className="rounded-lg border border-danger/30 px-3.5 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10 dark:text-red-400"
                            >
                              Desactivar
                            </button>
                          </form>
                        ) : (
                          <form action={activarDocenteFormAction} className="inline">
                            <input type="hidden" name="userId" value={docente.id} />
                            <button
                              type="submit"
                              className="rounded-lg border border-success/30 px-3.5 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-success/10 dark:text-green-400"
                            >
                              Activar
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </article>
    </section>
  );
}
