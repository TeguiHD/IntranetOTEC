import { Suspense } from "react";

import {
  countUsuariosPorRol,
  listarUsuariosPorRol,
} from "@/actions/usuarios";
import { Pagination } from "@/components/shared/Pagination";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { DocenteCreateModal } from "./DocenteCreateModal";
import { DocenteTable } from "./DocenteTable";

const PAGE_SIZE = 20;

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  docente_created: { tone: "success", text: "Docente creado correctamente." },
  docente_updated: { tone: "success", text: "Docente actualizado/reactivado correctamente." },
  user_deactivated: { tone: "success", text: "Docente desactivado correctamente." },
  user_activated: { tone: "success", text: "Docente activado correctamente." },
  user_soft_deleted: { tone: "success", text: "Baja definitiva aplicada al docente (sin borrado fisico)." },
  already_soft_deleted: { tone: "success", text: "El docente ya tenia baja definitiva logica." },
  already_inactive: { tone: "success", text: "El docente ya estaba inactivo." },
  already_active: { tone: "success", text: "El docente ya estaba activo." },
  delete_failed: { tone: "error", text: "No fue posible eliminar el docente. Puede tener datos historicos." },
  invalid_input: { tone: "error", text: "Datos invalidos. Verifica RUT, correo y politica de contrasena." },
  invalid_rut: { tone: "error", text: "RUT invalido. Revisa formato y digito verificador." },
  invalid_email: { tone: "error", text: "Correo invalido. Verifica el formato ingresado." },
  invalid_password_policy: { tone: "error", text: "La contraseña no cumple la política: mínimo 8 caracteres, letras y números." },
  invalid_name: { tone: "error", text: "Nombre o apellido invalido. Deben tener al menos 2 caracteres." },
  email_conflict: { tone: "error", text: "El correo ya esta registrado por otro usuario." },
  rut_conflict: { tone: "error", text: "El RUT ya esta asociado a otro tipo de usuario." },
  docente_mutation_failed: { tone: "error", text: "No fue posible crear/actualizar el docente por un error interno." },
  forbidden: { tone: "error", text: "Tu sesion no tiene permisos de administrador para esta accion." },
  error: { tone: "error", text: "No fue posible completar la accion. Revisa los datos e intenta nuevamente." },
};

type AdminDocentesPageProps = {
  searchParams?: Promise<{
    state?: string;
    page?: string;
    q?: string;
  }>;
};

export const metadata = {
  title: "Docentes",
};

export default async function AdminDocentesPage({
  searchParams,
}: AdminDocentesPageProps) {
  const params = await (searchParams ?? Promise.resolve({} as { state?: string; page?: string; q?: string }));
  const currentPage = Math.max(1, Number(params.page ?? "1") || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;
  const searchQuery = typeof params.q === "string" ? params.q.trim() : "";

  const [docentes, totalCount] = await Promise.all([
    listarUsuariosPorRol(
      "docente",
      { limit: PAGE_SIZE, offset },
      { incluirInactivos: true, query: searchQuery },
    ),
    countUsuariosPorRol("docente", { incluirInactivos: true, query: searchQuery }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const buildHref = (page: number): string => {
    const qs = new URLSearchParams({ page: String(page) });
    if (searchQuery) qs.set("q", searchQuery);
    return `/admin/docentes?${qs.toString()}`;
  };

  return (
    <section className="space-y-5">
      <Suspense>
        <RouteStateToast state={params.state} map={STATUS_MAP} />
      </Suspense>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <header>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Gestion de Docentes
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Crea cuentas docentes seguras y administra su estado operativo.
          </p>
        </header>
        <DocenteCreateModal />
      </div>

      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
            Docentes Registrados
          </h2>
          {totalCount > 0 && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
              {totalCount}
            </span>
          )}
        </div>

        <div className="mb-5 rounded-2xl border border-gray-100 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-800/40">
          <form action="/admin/docentes" method="get" className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="w-full xl:max-w-xl">
              <label htmlFor="docentes-q" className="text-sm font-medium text-text-primary dark:text-gray-200">
                Buscar en todo el padron docente
              </label>
              <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                <input
                  id="docentes-q"
                  name="q"
                  type="search"
                  defaultValue={searchQuery}
                  maxLength={80}
                  placeholder="Nombre, apellido, RUT o correo"
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="h-11 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98]"
                  >
                    Buscar
                  </button>
                  {searchQuery ? (
                    <a
                      href="/admin/docentes"
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 px-4 text-sm font-medium text-text-primary transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      Limpiar
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            {searchQuery && (
              <p className="rounded-xl bg-white px-4 py-2.5 text-sm text-text-secondary shadow-sm dark:bg-gray-900 dark:text-gray-300">
                {totalCount} resultado{totalCount === 1 ? "" : "s"} para &ldquo;{searchQuery}&rdquo;
              </p>
            )}
          </form>
        </div>

        <DocenteTable
          docentes={docentes}
          emptyMessage={
            searchQuery
              ? `No se encontraron docentes para "${searchQuery}".`
              : "No hay docentes registrados aun."
          }
        />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          buildHref={buildHref}
          totalCount={totalCount}
        />
      </article>
    </section>
  );
}
