import { countAuditLogsAdmin, listarAuditLogsAdmin } from "@/actions/audit";
import { Pagination } from "@/components/shared/Pagination";

const PAGE_SIZE = 20;

const ACCION_LABELS: Record<string, string> = {
  login_ok: "Login exitoso",
  login_fail: "Login fallido",
  logout: "Logout",
  crear: "Crear",
  editar: "Editar",
  desactivar: "Desactivar",
  archivar: "Archivar",
  cerrar_ciclo: "Cerrar ciclo",
  emitir_certificado: "Emitir certificado",
  invalidar_certificado: "Invalidar certificado",
  subir_material: "Subir material",
  exportar_excel: "Exportar Excel",
  cambiar_nota: "Cambiar nota",
  registrar_asistencia: "Registrar asistencia",
};

const ACCION_COLORS: Record<string, string> = {
  login_ok:
    "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  login_fail: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  logout:
    "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  crear: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  editar:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  desactivar: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  archivar:
    "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  cerrar_ciclo:
    "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
  emitir_certificado:
    "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  invalidar_certificado:
    "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  subir_material:
    "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  exportar_excel:
    "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  cambiar_nota:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  registrar_asistencia:
    "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
};

const ALL_ACCIONES = [
  "login_ok",
  "login_fail",
  "logout",
  "crear",
  "editar",
  "desactivar",
  "archivar",
  "cerrar_ciclo",
  "emitir_certificado",
  "invalidar_certificado",
  "subir_material",
  "exportar_excel",
  "cambiar_nota",
  "registrar_asistencia",
];

function formatFechaHora(date: Date | null | undefined): string {
  if (!date) return "-";

  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");

  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

type Props = {
  searchParams?: Promise<{
    page?: string;
    accion?: string;
    desde?: string;
    hasta?: string;
  }>;
};

export default async function AdminAuditoriaPage({ searchParams }: Props) {
  const params = await (searchParams ?? Promise.resolve({} as { page?: string; accion?: string; desde?: string; hasta?: string }));
  const currentPage = Math.max(1, Number(params?.page ?? "1") || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const filterAccion =
    typeof params?.accion === "string" && params.accion ? params.accion : undefined;
  const filterDesde =
    typeof params?.desde === "string" && params.desde ? params.desde : undefined;
  const filterHasta =
    typeof params?.hasta === "string" && params.hasta ? params.hasta : undefined;

  const filterOptions = {
    accion: filterAccion,
    desde: filterDesde,
    hasta: filterHasta,
  };

  const [logs, totalCount] = await Promise.all([
    listarAuditLogsAdmin({ limit: PAGE_SIZE, offset }, filterOptions),
    countAuditLogsAdmin(filterOptions),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  function buildHref(page: number) {
    const p = new URLSearchParams();
    if (filterAccion) p.set("accion", filterAccion);
    if (filterDesde) p.set("desde", filterDesde);
    if (filterHasta) p.set("hasta", filterHasta);
    p.set("page", String(page));
    return `/admin/auditoria?${p.toString()}`;
  }

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
          Registro de Auditoria
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
          Historial de acciones realizadas en el sistema.
        </p>
      </header>

      {/* Metricas */}
      <div className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary dark:text-gray-400">
            Total registros
          </p>
          <p className="mt-1 text-2xl font-bold text-text-primary dark:text-white">
            {totalCount}
          </p>
        </article>
      </div>

      {/* Filtros */}
      <form
        method="GET"
        className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5"
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <label
              htmlFor="audit-accion"
              className="text-sm font-medium text-text-primary dark:text-gray-200"
            >
              Tipo de accion
            </label>
            <select
              id="audit-accion"
              name="accion"
              defaultValue={filterAccion ?? ""}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="">Todas las acciones</option>
              {ALL_ACCIONES.map((a) => (
                <option key={a} value={a}>
                  {ACCION_LABELS[a] ?? a}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="audit-desde"
              className="text-sm font-medium text-text-primary dark:text-gray-200"
            >
              Desde
            </label>
            <input
              id="audit-desde"
              name="desde"
              type="date"
              defaultValue={filterDesde ?? ""}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="audit-hasta"
              className="text-sm font-medium text-text-primary dark:text-gray-200"
            >
              Hasta
            </label>
            <input
              id="audit-hasta"
              name="hasta"
              type="date"
              defaultValue={filterHasta ?? ""}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          <button
            type="submit"
            className="h-12 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:shadow-md active:scale-[0.98]"
          >
            Filtrar
          </button>
        </div>
      </form>

      {/* Tabla de logs */}
      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
              Registros de auditoria
            </h2>
            {totalCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
                {totalCount}
              </span>
            )}
          </div>
        </div>

        {logs.length === 0 ? (
          <p className="mt-4 text-sm text-text-secondary dark:text-gray-400">
            Sin registros.
          </p>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="mt-4 space-y-3 sm:hidden">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-text-primary dark:text-white">
                        {log.usuarioNombre
                          ? `${log.usuarioNombre} ${log.usuarioApellido ?? ""}`
                          : "Sistema"}
                      </p>
                      <p className="text-xs text-text-secondary dark:text-gray-400">
                        {log.userRol ?? "-"} &middot;{" "}
                        {formatFechaHora(log.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        log.exitoso
                          ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
                          : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
                      }`}
                    >
                      {log.exitoso ? "OK" : "Fallo"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        ACCION_COLORS[log.accion] ??
                        "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                      }`}
                    >
                      {ACCION_LABELS[log.accion] ?? log.accion}
                    </span>
                    {log.entidad && (
                      <span className="text-xs text-text-secondary dark:text-gray-400">
                        {log.entidad}
                      </span>
                    )}
                  </div>
                  {log.ip && (
                    <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                      IP: {log.ip}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="mt-4 hidden overflow-x-auto sm:block">
              <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                    <th className="px-3 py-2.5">Fecha/Hora</th>
                    <th className="px-3 py-2.5">Usuario</th>
                    <th className="px-3 py-2.5">Rol</th>
                    <th className="px-3 py-2.5">Accion</th>
                    <th className="px-3 py-2.5">Entidad</th>
                    <th className="px-3 py-2.5">Exitoso</th>
                    <th className="px-3 py-2.5">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="transition-colors hover:bg-primary/3 dark:hover:bg-primary/5"
                    >
                      <td className="whitespace-nowrap px-3 py-3 text-text-secondary dark:text-gray-400">
                        {formatFechaHora(log.createdAt)}
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-text-primary dark:text-gray-100">
                          {log.usuarioNombre
                            ? `${log.usuarioNombre} ${log.usuarioApellido ?? ""}`
                            : "Sistema"}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-text-secondary dark:text-gray-400">
                        {log.userRol ?? "-"}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            ACCION_COLORS[log.accion] ??
                            "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                          }`}
                        >
                          {ACCION_LABELS[log.accion] ?? log.accion}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-text-secondary dark:text-gray-400">
                        {log.entidad ?? "-"}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            log.exitoso
                              ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
                              : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
                          }`}
                        >
                          {log.exitoso ? "OK" : "Fallo"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-text-secondary dark:text-gray-400">
                        {log.ip ?? "-"}
                      </td>
                    </tr>
                  ))}
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
