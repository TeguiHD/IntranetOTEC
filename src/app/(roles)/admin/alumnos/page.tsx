import { Suspense } from "react";
import { and, count, eq, inArray, isNull } from "drizzle-orm";

import {
  countUsuariosPorRol,
  listarUsuariosPorRol,
} from "@/actions/usuarios";
import { Pagination } from "@/components/shared/Pagination";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { getDb } from "@/db";
import { certificados, matriculas } from "@/db/schema";
import { AlumnoCreateModal } from "./AlumnoCreateModal";
import { AlumnoTable } from "./AlumnoTable";
import { ImportarAlumnosModal } from "./ImportarAlumnosModal";

const PAGE_SIZE = 20;

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  alumno_created: { tone: "success", text: "Alumno creado correctamente." },
  alumno_updated: { tone: "success", text: "Alumno actualizado/reactivado correctamente." },
  user_deactivated: { tone: "success", text: "Alumno desactivado correctamente." },
  user_activated: { tone: "success", text: "Alumno activado correctamente." },
  alumnos_deactivated: { tone: "success", text: "Alumnos seleccionados desactivados correctamente." },
  alumnos_deactivate_partial: { tone: "success", text: "Desactivacion masiva aplicada parcialmente. Se omitieron alumnos ya inactivos o dados de baja." },
  alumnos_deactivate_none: { tone: "error", text: "No hay alumnos activos disponibles para desactivar." },
  user_soft_deleted: { tone: "success", text: "Baja definitiva aplicada al alumno (sin borrado fisico)." },
  alumnos_bulk_deleted: { tone: "success", text: "Baja masiva aplicada. Los alumnos dejaron de aparecer en el padron normal." },
  alumnos_bulk_partial: { tone: "success", text: "Baja masiva aplicada parcialmente. Se omitieron alumnos ya dados de baja." },
  alumnos_bulk_none: { tone: "error", text: "No hay alumnos visibles disponibles para baja masiva." },
  already_soft_deleted: { tone: "success", text: "El alumno ya tenia baja definitiva logica." },
  already_inactive: { tone: "success", text: "El alumno ya estaba inactivo." },
  already_active: { tone: "success", text: "El alumno ya estaba activo." },
  invalid_input: { tone: "error", text: "Datos invalidos. Verifica los campos e intenta nuevamente." },
  email_conflict: { tone: "error", text: "El correo ya esta registrado por otro usuario." },
  has_active_records: { tone: "error", text: "El alumno tiene matriculas activas. Desmatricula primero." },
  delete_failed: { tone: "error", text: "No fue posible eliminar el alumno. Puede tener datos historicos." },
  alumno_mutation_failed: { tone: "error", text: "No fue posible crear/actualizar el alumno por un error interno." },
  forbidden: { tone: "error", text: "Tu sesion no tiene permisos de administrador para esta accion." },
  error: { tone: "error", text: "No fue posible completar la accion. Revisa los datos e intenta nuevamente." },
};

type AdminAlumnosPageProps = {
  searchParams?: Promise<{
    state?: string;
    page?: string;
    q?: string;
  }>;
};

export const metadata = {
  title: "Alumnos",
};

export default async function AdminAlumnosPage({
  searchParams,
}: AdminAlumnosPageProps) {
  const params = await (searchParams ?? Promise.resolve({} as { state?: string; page?: string; q?: string }));
  const currentPage = Math.max(1, Number(params.page ?? "1") || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;
  const searchQuery = typeof params.q === "string" ? params.q.trim() : "";

  const [alumnos, totalCount] = await Promise.all([
    listarUsuariosPorRol(
      "alumno",
      { limit: PAGE_SIZE, offset },
      { incluirInactivos: true, query: searchQuery },
    ),
    countUsuariosPorRol("alumno", { incluirInactivos: true, query: searchQuery }),
  ]);
  const alumnoIds = alumnos.map((alumno) => alumno.id);
  const [matriculasPorAlumno, certificadosPorAlumno] = alumnoIds.length > 0
    ? await Promise.all([
        getDb()
          .select({
            alumnoId: matriculas.alumnoId,
            totalMatriculas: count(matriculas.id),
          })
          .from(matriculas)
          .where(and(inArray(matriculas.alumnoId, alumnoIds), isNull(matriculas.eliminadoAt)))
          .groupBy(matriculas.alumnoId),
        getDb()
          .select({
            alumnoId: matriculas.alumnoId,
            totalCertificados: count(certificados.id),
          })
          .from(certificados)
          .innerJoin(matriculas, eq(certificados.matriculaId, matriculas.id))
          .where(and(inArray(matriculas.alumnoId, alumnoIds), eq(certificados.valido, true)))
          .groupBy(matriculas.alumnoId),
      ])
    : [[], []];
  const matriculasMap = new Map(matriculasPorAlumno.map((row) => [row.alumnoId, Number(row.totalMatriculas)]));
  const certificadosMap = new Map(certificadosPorAlumno.map((row) => [row.alumnoId, Number(row.totalCertificados)]));
  const alumnosConFicha = alumnos.map((alumno) => ({
    ...alumno,
    totalMatriculas: matriculasMap.get(alumno.id) ?? 0,
    totalCertificados: certificadosMap.get(alumno.id) ?? 0,
  }));

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const buildHref = (page: number): string => {
    const qs = new URLSearchParams({ page: String(page) });
    if (searchQuery) qs.set("q", searchQuery);
    return `/admin/alumnos?${qs.toString()}`;
  };

  return (
    <section className="space-y-5">
      <Suspense>
        <RouteStateToast state={params.state} map={STATUS_MAP} />
      </Suspense>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <header>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Gestión de Alumnos
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Registra alumnos con RUT o credencial extranjera y controla su estado de acceso.
          </p>
        </header>
        <div className="flex flex-wrap gap-2">
          <ImportarAlumnosModal />
          <AlumnoCreateModal />
        </div>
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

        <div className="mb-5 rounded-2xl border border-gray-100 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-800/40">
          <form action="/admin/alumnos" method="get" className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="w-full xl:max-w-xl">
              <label htmlFor="alumnos-q" className="text-sm font-medium text-text-primary dark:text-gray-200">
                Buscar en todo el padron
              </label>
              <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                <input
                  id="alumnos-q"
                  name="q"
                  type="search"
                  defaultValue={searchQuery}
                  maxLength={80}
                  placeholder="Nombre, apellido, RUT, credencial o correo"
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500" inputMode="email"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="h-11 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98]"
                  >
                    Buscar
                  </button>
                  {searchQuery ? (
                    <a
                      href="/admin/alumnos"
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

        <AlumnoTable
          alumnos={alumnosConFicha}
          emptyMessage={
            searchQuery
              ? `No se encontraron alumnos para "${searchQuery}".`
              : "No hay alumnos registrados aun."
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
