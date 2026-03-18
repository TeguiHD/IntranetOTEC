import {
  listarUsuariosPorRol,
} from "@/actions/usuarios";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { formatearRut } from "@/lib/rut";
import { AlumnoForm } from "./AlumnoForm";
import { AlumnoToggle } from "./AlumnoToggle";

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
  user_activated: {
    tone: "success",
    text: "Alumno activado correctamente.",
  },
  already_inactive: {
    tone: "success",
    text: "El alumno ya estaba inactivo.",
  },
  already_active: {
    tone: "success",
    text: "El alumno ya estaba activo.",
  },
  invalid_input: {
    tone: "error",
    text: "Datos invalidos. Verifica los campos e intenta nuevamente.",
  },
  email_conflict: {
    tone: "error",
    text: "El correo ya esta registrado por otro usuario.",
  },
  alumno_mutation_failed: {
    tone: "error",
    text: "No fue posible crear/actualizar el alumno por un error interno.",
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
    <section className="space-y-5">
      <RouteStateToast state={searchParams?.state} map={STATUS_MAP} />

      <header>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
          Gestion de Alumnos
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
          Registra alumnos con RUT o credencial extranjera y controla su estado de acceso.
        </p>
      </header>

      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
          Crear Alumno
        </h2>
        <AlumnoForm />
      </article>

      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
          Alumnos Registrados
        </h2>

        {alumnos.length === 0 ? (
          <p className="mt-4 text-sm text-text-secondary dark:text-gray-400">
            No hay alumnos registrados aun.
          </p>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="mt-4 space-y-3 sm:hidden">
              {alumnos.map((alumno) => {
                const isExtranjero = alumno.rut?.startsWith("EXT-");
                return (
                  <div key={alumno.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-text-primary dark:text-white">
                          {alumno.nombre} {alumno.apellido}
                        </p>
                        <p className="mt-0.5 text-sm text-text-secondary dark:text-gray-400">
                          {alumno.rut
                            ? isExtranjero
                              ? alumno.rut.replace("EXT-", "Ext: ")
                              : formatearRut(alumno.rut)
                            : "-"}
                        </p>
                        {alumno.email ? (
                          <p className="mt-0.5 truncate text-sm text-text-secondary dark:text-gray-400">
                            {alumno.email}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className={`ml-2 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          alumno.activo
                            ? "bg-success/15 text-green-700 dark:bg-green-950 dark:text-green-300"
                            : "bg-warning/15 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {alumno.activo ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                    <div className="mt-3">
                      <AlumnoToggle userId={alumno.id} activo={alumno.activo ?? false} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: table */}
            <div className="mt-4 hidden overflow-x-auto sm:block">
              <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                    <th className="px-3 py-2.5">Nombre</th>
                    <th className="px-3 py-2.5">RUT / Credencial</th>
                    <th className="px-3 py-2.5">Correo</th>
                    <th className="px-3 py-2.5">Estado</th>
                    <th className="px-3 py-2.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {alumnos.map((alumno) => {
                    const isExtranjero = alumno.rut?.startsWith("EXT-");
                    return (
                      <tr key={alumno.id} className="transition-colors hover:bg-primary/3 dark:hover:bg-primary/5">
                        <td className="px-3 py-3 font-medium text-text-primary dark:text-gray-100">
                          {alumno.nombre} {alumno.apellido}
                        </td>
                        <td className="px-3 py-3 text-text-secondary dark:text-gray-400">
                          {alumno.rut
                            ? isExtranjero
                              ? alumno.rut.replace("EXT-", "Ext: ")
                              : formatearRut(alumno.rut)
                            : "-"}
                        </td>
                        <td className="px-3 py-3 text-text-secondary dark:text-gray-400">
                          {alumno.email ?? "-"}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                              alumno.activo
                                ? "bg-success/15 text-green-700 dark:bg-green-950 dark:text-green-300"
                                : "bg-warning/15 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                            }`}
                          >
                            {alumno.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <AlumnoToggle userId={alumno.id} activo={alumno.activo ?? false} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </article>
    </section>
  );
}
