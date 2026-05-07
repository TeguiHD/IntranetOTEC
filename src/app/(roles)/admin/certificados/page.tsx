import {
  countCertificadosAdmin,
  emitirCertificadoFormAction,
  invalidarCertificadoFormAction,
  listarCertificadosAdmin,
} from "@/actions/certificados";
import { Pagination } from "@/components/shared/Pagination";
import { RouteStateToast } from "@/components/shared/RouteStateToast";

import { MatriculaCombobox } from "./MatriculaCombobox";

const PAGE_SIZE = 20;

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  certificado_emitido: { tone: "success", text: "Certificado emitido correctamente." },
  certificado_invalidado: { tone: "success", text: "Certificado invalidado." },
  already_invalidated: { tone: "success", text: "El certificado ya estaba invalidado." },
  matricula_not_found: { tone: "error", text: "Matrícula no encontrada." },
  error: { tone: "error", text: "No fue posible completar la acción." },
};

const TIPO_LABELS: Record<string, string> = {
  alumno_regular: "Alumno Regular",
  termino_curso: "Término de Curso",
};

type AdminCertificadosPageProps = {
  searchParams?: Promise<{
    state?: string;
    page?: string;
    tipo?: string;
  }>;
};

export default async function AdminCertificadosPage({ searchParams }: AdminCertificadosPageProps) {
  const params = await (searchParams ?? Promise.resolve({} as { state?: string; page?: string; tipo?: string }));
  const currentPage = Math.max(1, Number(params?.page ?? "1") || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const filterTipo =
    params?.tipo === "alumno_regular" || params?.tipo === "termino_curso"
      ? params.tipo
      : undefined;

  const [certs, totalCount] = await Promise.all([
    listarCertificadosAdmin(
      { limit: PAGE_SIZE, offset },
      filterTipo ? { tipo: filterTipo } : undefined,
    ),
    countCertificadosAdmin(filterTipo ? { tipo: filterTipo } : undefined),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  function buildHref(page: number) {
    const p = new URLSearchParams();
    if (filterTipo) p.set("tipo", filterTipo);
    p.set("page", String(page));
    return `/admin/certificados?${p.toString()}`;
  }

  return (
    <section className="space-y-5">
      <RouteStateToast state={params?.state} map={STATUS_MAP} />

      <header>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
          Certificados
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
          Emite y gestiona certificados para alumnos matriculados.
        </p>
      </header>

      {/* Emit form */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 text-base font-semibold text-text-primary dark:text-white">
          Emitir Certificado
        </h2>
        <form action={emitirCertificadoFormAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="filterTipo" value={filterTipo ?? ""} />
          <input type="hidden" name="page" value={String(currentPage)} />

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-secondary dark:text-gray-400">
              Alumno / Matrícula
            </label>
            <MatriculaCombobox name="matriculaId" required />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-secondary dark:text-gray-400">
              Tipo
            </label>
            <select
              name="tipo"
              required
              className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="alumno_regular">Alumno Regular</option>
              <option value="termino_curso">Término de Curso</option>
            </select>
          </div>

          <button
            type="submit"
            className="h-10 rounded-xl bg-gradient-to-r from-cta to-cta-dark px-4 text-sm font-semibold text-white shadow-md hover:opacity-90"
          >
            Emitir
          </button>
        </form>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <form className="flex items-center gap-2">
          <select
            name="tipo"
            defaultValue={filterTipo ?? ""}
            className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="">Todos los tipos</option>
            <option value="alumno_regular">Alumno Regular</option>
            <option value="termino_curso">Término de Curso</option>
          </select>
          <button
            type="submit"
            className="h-9 rounded-xl border border-gray-200 px-3 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Filtrar
          </button>
        </form>
        <p className="ml-auto text-sm text-text-secondary dark:text-gray-400">
          {totalCount} certificado{totalCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {certs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-text-secondary dark:text-gray-400">
              No hay certificados registrados.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted dark:text-gray-500">
                      Código
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted dark:text-gray-500">
                      Alumno
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted dark:text-gray-500">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted dark:text-gray-500">
                      Fecha Emisión
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted dark:text-gray-500">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted dark:text-gray-500">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {certs.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="px-4 py-3 font-mono text-xs text-text-primary dark:text-white">
                        {c.codigoUnico}
                      </td>
                      <td className="px-4 py-3 text-text-primary dark:text-white">
                        {c.alumnoNombre} {c.alumnoApellido}
                      </td>
                      <td className="px-4 py-3 text-text-secondary dark:text-gray-400">
                        {TIPO_LABELS[c.tipo] ?? c.tipo}
                      </td>
                      <td className="px-4 py-3 text-text-secondary dark:text-gray-400">
                        {c.fechaEmision
                          ? new Date(c.fechaEmision).toLocaleDateString("es-CL")
                          : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            c.valido
                              ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                              : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                          }`}
                        >
                          {c.valido ? "Válido" : "Invalidado"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <a
                            href={`/api/certificados/${encodeURIComponent(c.codigoUnico)}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/30"
                          >
                            PDF
                          </a>
                          {c.valido && (
                            <form action={invalidarCertificadoFormAction} className="inline">
                              <input type="hidden" name="id" value={c.id} />
                              <input type="hidden" name="filterTipo" value={filterTipo ?? ""} />
                              <input type="hidden" name="page" value={String(currentPage)} />
                              <button
                                type="submit"
                                className="rounded-lg px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                              >
                                Invalidar
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="divide-y divide-gray-100 dark:divide-gray-800 md:hidden">
              {certs.map((c) => (
                <div key={c.id} className="p-4 space-y-1">
                  <p className="font-mono text-xs text-text-muted dark:text-gray-500">
                    {c.codigoUnico}
                  </p>
                  <p className="font-semibold text-text-primary dark:text-white">
                    {c.alumnoNombre} {c.alumnoApellido}
                  </p>
                  <p className="text-sm text-text-secondary dark:text-gray-400">
                    {TIPO_LABELS[c.tipo] ?? c.tipo}
                    {" · "}
                    {c.fechaEmision
                      ? new Date(c.fechaEmision).toLocaleDateString("es-CL")
                      : "-"}
                  </p>
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.valido
                          ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                          : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                      }`}
                    >
                      {c.valido ? "Válido" : "Invalidado"}
                    </span>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/api/certificados/${encodeURIComponent(c.codigoUnico)}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/30"
                      >
                        PDF
                      </a>
                      {c.valido && (
                        <form action={invalidarCertificadoFormAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="filterTipo" value={filterTipo ?? ""} />
                          <input type="hidden" name="page" value={String(currentPage)} />
                          <button
                            type="submit"
                            className="rounded-lg px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                          >
                            Invalidar
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </section>
  );
}
