import {
  countUsuariosPorRol,
  listarUsuariosPorRol,
} from "@/actions/usuarios";
import { Pagination } from "@/components/shared/Pagination";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { AdminCreateModal } from "./AdminCreateModal";
import { AdminTable } from "./AdminTable";

const PAGE_SIZE = 20;

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  admin_created: { tone: "success", text: "Administrador creado correctamente." },
  admin_updated: { tone: "success", text: "Administrador actualizado/reactivado correctamente." },
  user_deactivated: { tone: "success", text: "Administrador desactivado correctamente." },
  user_activated: { tone: "success", text: "Administrador activado correctamente." },
  already_inactive: { tone: "success", text: "El admin ya estaba inactivo." },
  already_active: { tone: "success", text: "El admin ya estaba activo." },
  invalid_input: { tone: "error", text: "Datos inválidos. Verifica RUT, correo y política de contraseña." },
  invalid_rut: { tone: "error", text: "RUT inválido. Revisa formato y dígito verificador." },
  invalid_email: { tone: "error", text: "Correo inválido. Verifica el formato ingresado." },
  invalid_password_policy: { tone: "error", text: "La contraseña no cumple política: mínimo 12 caracteres, mayúscula, minúscula, número y símbolo." },
  invalid_name: { tone: "error", text: "Nombre o apellido inválido. Deben tener al menos 2 caracteres." },
  email_conflict: { tone: "error", text: "El correo ya está registrado por otro usuario." },
  rut_conflict: { tone: "error", text: "El RUT ya está asociado a otro tipo de usuario." },
  admin_mutation_failed: { tone: "error", text: "No fue posible crear/actualizar el admin por un error interno." },
  forbidden: { tone: "error", text: "Tu sesión no tiene permisos de administrador para esta acción." },
  error: { tone: "error", text: "No fue posible completar la acción. Revisa los datos e intenta nuevamente." },
};

type AdminAdministradoresPageProps = {
  searchParams?: {
    state?: string;
    page?: string;
  };
};

export const metadata = {
  title: "Administradores",
};

export default async function AdminAdministradoresPage({
  searchParams,
}: AdminAdministradoresPageProps) {
  const currentPage = Math.max(1, Number(searchParams?.page ?? "1") || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const [administradores, totalCount] = await Promise.all([
    listarUsuariosPorRol(
      "admin",
      { limit: PAGE_SIZE, offset },
      { incluirInactivos: true },
    ),
    countUsuariosPorRol("admin", { incluirInactivos: true }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const buildHref = (page: number): string => `/admin/administradores?page=${page}`;

  return (
    <section className="space-y-5">
      <RouteStateToast state={searchParams?.state} map={STATUS_MAP} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <header>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Gestión de Administradores
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Crea cuentas administradores seguras y administra su estado operativo.
          </p>
        </header>
        <AdminCreateModal />
      </div>

      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
            Administradores Registrados
          </h2>
          {totalCount > 0 && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
              {totalCount}
            </span>
          )}
        </div>

        <AdminTable administradores={administradores} />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          buildHref={buildHref}
        />
      </article>
    </section>
  );
}
