import {
  countUsuariosPorRol,
  listarUsuariosPorRol,
} from "@/actions/usuarios";
import { Pagination } from "@/components/shared/Pagination";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { formatearRut } from "@/lib/rut";
import { AlumnoForm } from "./AlumnoForm";
import { AlumnoToggle } from "./AlumnoToggle";

const PAGE_SIZE = 20;

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
    page?: string;
  };
};

export default async function AdminAlumnosPage({
  searchParams,
}: AdminAlumnosPageProps) {
  const currentPage = Math.max(1, Number(searchParams?.page ?? "1") || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const [alumnos, totalCount] = await Promise.all([
    listarUsuariosPorRol(
      "alumno",
      { limit: PAGE_SIZE, offset },
      { incluirInactivos: true },
    ),
    countUsuariosPorRol("alumno", { incluirInactivos: true }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const buildHref = (page: number): string => `/admin/alumnos?page=${page}`;
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
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
            Alumnos Registrados
          </h2>
          {totalCount > 0 ? (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
              {totalCount}
            </span>
          ) : null}
        </div>

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
                            ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
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
                                ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
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
