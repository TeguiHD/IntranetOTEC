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
    text: "Datos inválidos. Verifica los campos e intenta nuevamente.",
  },
  email_conflict: {
    tone: "error",
    text: "El correo ya está registrado por otro usuario.",
  },
  alumno_mutation_failed: {
    tone: "error",
    text: "No fue posible crear/actualizar el alumno por un error interno.",
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
        <h1 className="text-2xl font-bold uppercase text-text-primary dark:text-gray-100">
          Gestión de Alumnos
        </h1>
        <p className="text-sm text-text-secondary dark:text-gray-300">
          Registra alumnos con RUT o credencial extranjera y controla su estado de acceso.
        </p>
      </header>

      <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-text-primary dark:text-gray-100">
          Crear Alumno
        </h2>
        <AlumnoForm />
      </article>

      <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-text-primary dark:text-gray-100">
          Alumnos Registrados
        </h2>

        {alumnos.length === 0 ? (
          <p className="mt-4 text-sm text-text-secondary dark:text-gray-400">
            No hay alumnos registrados aún.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-300">
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">RUT / Credencial</th>
                  <th className="px-3 py-2">Correo</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {alumnos.map((alumno) => {
                  const isExtranjero = alumno.rut?.startsWith("EXT-");
                  return (
                    <tr key={alumno.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-3 py-3 font-medium text-text-primary dark:text-gray-100">
                        {alumno.nombre} {alumno.apellido}
                      </td>
                      <td className="px-3 py-3 text-text-secondary dark:text-gray-300">
                        {alumno.rut
                          ? isExtranjero
                            ? alumno.rut.replace("EXT-", "Ext: ")
                            : formatearRut(alumno.rut)
                          : "-"}
                      </td>
                      <td className="px-3 py-3 text-text-secondary dark:text-gray-300">
                        {alumno.email ?? "-"}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            alumno.activo
                              ? "bg-success/15 text-green-700 dark:bg-green-950 dark:text-green-200"
                              : "bg-warning/20 text-amber-700 dark:bg-amber-950 dark:text-amber-200"
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
        )}
      </article>
    </section>
  );
}
