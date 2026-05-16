import { IdCard, ShieldCheck, Users } from "lucide-react";

import {
  actualizarAccesoDocumentosAlumnoFormAction,
  contarAccesosDocumentosAdmin,
  listarAccesosDocumentosAdmin,
  listarSeccionesParaAccesosAdmin,
} from "@/actions/accesos-documentos";
import { Pagination } from "@/components/shared/Pagination";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { formatearIdentificador } from "@/lib/rut";

import { BeneficiosCursoForm } from "./BeneficiosCursoForm";
import { BeneficiosPersonaFilter } from "./BeneficiosPersonaFilter";

const PAGE_SIZE = 20;

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  acceso_alumno_actualizado: { tone: "success", text: "Acceso del alumno actualizado correctamente." },
  acceso_curso_actualizado: { tone: "success", text: "Accesos del curso actualizados correctamente." },
  invalid_input: { tone: "error", text: "Datos inválidos para actualizar accesos." },
  not_found: { tone: "error", text: "No se encontró el registro solicitado." },
  forbidden: { tone: "error", text: "No autorizado para esta acción." },
  error: { tone: "error", text: "No fue posible completar la acción." },
};

type PageProps = {
  searchParams?: Promise<{ state?: string; q?: string; asignaturaId?: string; page?: string }>;
};

export const metadata = { title: "Beneficios y Credenciales" };

const selectClass =
  "h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-text-primary focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";

const actionButtonClass =
  "inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark disabled:opacity-60";

function EstadoPill({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={
        enabled
          ? "inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          : "inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800 dark:bg-red-950 dark:text-red-200"
      }
    >
      {enabled ? "Habilitado" : "Deshabilitado"}
    </span>
  );
}

export default async function AdminBeneficiosCredencialesPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const asignaturaId = typeof params.asignaturaId === "string" ? params.asignaturaId : "";
  const currentPage = Math.max(1, Number(params.page ?? "1") || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const [alumnos, totalCount, secciones] = await Promise.all([
    listarAccesosDocumentosAdmin({
      query: q,
      asignaturaId: asignaturaId || undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    contarAccesosDocumentosAdmin({ query: q, asignaturaId: asignaturaId || undefined }),
    listarSeccionesParaAccesosAdmin(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const buildHref = (page: number) => {
    const qs = new URLSearchParams({ page: String(page) });
    if (q) qs.set("q", q);
    if (asignaturaId) qs.set("asignaturaId", asignaturaId);
    return `/admin/beneficios-credenciales?${qs.toString()}`;
  };

  return (
    <section className="space-y-5">
      <RouteStateToast state={params.state} map={STATUS_MAP} />

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Gestión de Beneficios y Credenciales
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-text-secondary dark:text-gray-400">
            Controla quién puede acceder a tarjetas de beneficio y credenciales, por alumno individual o por curso completo.
          </p>
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </span>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <BeneficiosPersonaFilter
              secciones={secciones}
              initialQuery={q}
              initialAsignaturaId={asignaturaId}
            />
          </article>

          <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
                Control por persona
              </h2>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {totalCount}
              </span>
              {totalCount > PAGE_SIZE ? (
                <span className="text-[11px] text-text-secondary dark:text-gray-400">
                  pág {currentPage}/{totalPages}
                </span>
              ) : null}
            </div>

            {alumnos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 px-6 py-10 text-center dark:border-gray-700">
                <p className="text-sm text-text-secondary dark:text-gray-400">
                  No hay alumnos para los filtros seleccionados.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                      <th className="px-3 py-2.5">Alumno</th>
                      <th className="px-3 py-2.5">Curso activo</th>
                      <th className="px-3 py-2.5">Beneficio</th>
                      <th className="px-3 py-2.5">Credencial</th>
                      <th className="px-3 py-2.5 text-right">Actualizar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                    {alumnos.map((alumno) => (
                      <tr key={alumno.alumnoId} className="align-top">
                        <td className="px-3 py-3">
                          <p className="font-semibold text-text-primary dark:text-gray-100">
                            {alumno.nombre} {alumno.apellido}
                          </p>
                          <p className="text-xs text-text-secondary dark:text-gray-400">
                            {formatearIdentificador(alumno.rut)}
                          </p>
                          {alumno.email && (
                            <p className="text-xs text-text-muted dark:text-gray-500">{alumno.email}</p>
                          )}
                        </td>
                        <td className="max-w-xs px-3 py-3 text-text-secondary dark:text-gray-400">
                          {alumno.secciones}
                        </td>
                        <td className="px-3 py-3">
                          <EstadoPill enabled={alumno.beneficioHabilitado} />
                        </td>
                        <td className="px-3 py-3">
                          <EstadoPill enabled={alumno.credencialHabilitada} />
                        </td>
                        <td className="px-3 py-3">
                          <form action={actualizarAccesoDocumentosAlumnoFormAction} className="ml-auto grid min-w-64 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                            <input type="hidden" name="alumnoId" value={alumno.alumnoId} />
                            <select name="beneficioHabilitado" defaultValue={String(alumno.beneficioHabilitado)} className={selectClass} aria-label="Acceso a beneficio">
                              <option value="true">Beneficio sí</option>
                              <option value="false">Beneficio no</option>
                            </select>
                            <select name="credencialHabilitada" defaultValue={String(alumno.credencialHabilitada)} className={selectClass} aria-label="Acceso a credencial">
                              <option value="true">Credencial sí</option>
                              <option value="false">Credencial no</option>
                            </select>
                            <button type="submit" className={actionButtonClass}>
                              Guardar
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              buildHref={buildHref}
              totalCount={totalCount}
            />
          </article>
        </div>

        <aside className="space-y-5">
          <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <IdCard className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-text-primary dark:text-white">
                Control por curso
              </h2>
            </div>
            <p className="mt-2 text-sm text-text-secondary dark:text-gray-400">
              Filtra por periodo y curso, elige una sección y revisa el alcance estimado antes
              de aplicar el cambio masivo.
            </p>

            <BeneficiosCursoForm secciones={secciones} />
          </article>
        </aside>
      </div>
    </section>
  );
}
