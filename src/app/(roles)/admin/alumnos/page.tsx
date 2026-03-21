import {
  countUsuariosPorRol,
  listarUsuariosPorRol,
} from "@/actions/usuarios";
import { Pagination } from "@/components/shared/Pagination";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { AlumnoCreateModal } from "./AlumnoCreateModal";
import { AlumnoTable } from "./AlumnoTable";

const PAGE_SIZE = 20;

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  alumno_created: { tone: "success", text: "Alumno creado correctamente." },
  alumno_updated: { tone: "success", text: "Alumno actualizado/reactivado correctamente." },
  user_deactivated: { tone: "success", text: "Alumno desactivado correctamente." },
  user_activated: { tone: "success", text: "Alumno activado correctamente." },
  already_inactive: { tone: "success", text: "El alumno ya estaba inactivo." },
  already_active: { tone: "success", text: "El alumno ya estaba activo." },
  invalid_input: { tone: "error", text: "Datos inválidos. Verifica los campos e intenta nuevamente." },
  email_conflict: { tone: "error", text: "El correo ya está registrado por otro usuario." },
  alumno_mutation_failed: { tone: "error", text: "No fue posible crear/actualizar el alumno por un error interno." },
  forbidden: { tone: "error", text: "Tu sesión no tiene permisos de administrador para esta acción." },
  error: { tone: "error", text: "No fue posible completar la acción. Revisa los datos e intenta nuevamente." },
};

type AdminAlumnosPageProps = {
  searchParams?: Promise<{
    state?: string;
    page?: string;
  }>;
};

export default async function AdminAlumnosPage({
  searchParams,
}: AdminAlumnosPageProps) {
  const params = await (searchParams ?? Promise.resolve({} as { state?: string; page?: string }));
  const currentPage = Math.max(1, Number(params?.page ?? "1") || 1);
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
      <RouteStateToast state={params?.state} map={STATUS_MAP} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <header>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Gestión de Alumnos
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Registra alumnos con RUT o credencial extranjera y controla su estado de acceso.
          </p>
        </header>
        <AlumnoCreateModal />
      </div>

      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
            Alumnos Registrados
          </h2>
          {totalCount > 0 && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
              {totalCount}
            </span>
          )}
        </div>

        <AlumnoTable alumnos={alumnos} />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          buildHref={buildHref}
        />
      </article>
    </section>
  );
}
