import {
  countFinanzasAdmin,
  crearFinanzaFormAction,
  editarFinanzaFormAction,
  eliminarFinanzaFormAction,
  listarFinanzasAdmin,
  resumenFinanzasAdmin,
} from "@/actions/finanzas";
import { Pagination } from "@/components/shared/Pagination";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { ExportFinanzasCsvButton } from "./ExportCsvButton";

const PAGE_SIZE = 20;

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  finanza_created: { tone: "success", text: "Registro financiero creado correctamente." },
  finanza_edited: { tone: "success", text: "Registro financiero editado correctamente." },
  finanza_deleted: { tone: "success", text: "Registro financiero eliminado correctamente." },
  already_deleted: { tone: "success", text: "El registro ya estaba eliminado." },
  error: { tone: "error", text: "No fue posible completar la acción. Revisa los datos e intenta nuevamente." },
};

type AdminFinanzasPageProps = {
  searchParams?: Promise<{
    state?: string;
    page?: string;
    tipo?: string;
  }>;
};

const TIPO_LABELS: Record<string, string> = {
  ingreso: "Ingreso",
  gasto: "Gasto",
};

const formatCLP = (value: string | number): string => {
  const num = typeof value === "string" ? Number.parseFloat(value) : value;

  if (!Number.isFinite(num)) {
    return "$0";
  }

  return num.toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

export default async function AdminFinanzasPage({ searchParams }: AdminFinanzasPageProps) {
  const params = await (searchParams ?? Promise.resolve({} as { state?: string; page?: string; tipo?: string }));
  const currentPage = Math.max(1, Number(params?.page ?? "1") || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const filterTipo =
    params?.tipo === "ingreso" || params?.tipo === "gasto"
      ? params.tipo
      : undefined;

  const [registros, totalCount, resumen] = await Promise.all([
    listarFinanzasAdmin(
      { limit: PAGE_SIZE, offset },
      filterTipo ? { tipo: filterTipo } : undefined,
    ),
    countFinanzasAdmin(filterTipo ? { tipo: filterTipo } : undefined),
    resumenFinanzasAdmin(),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  function buildHref(page: number) {
    const p = new URLSearchParams();

    if (filterTipo) {
      p.set("tipo", filterTipo);
    }

    p.set("page", String(page));
    return `/admin/finanzas?${p.toString()}`;
  }

  return (
    <section className="space-y-5">
      <RouteStateToast state={params?.state} map={STATUS_MAP} />

      <header>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
          Finanzas
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
          Registra ingresos y gastos para controlar el flujo financiero del OTEC.
        </p>
      </header>

      {/* Resumen */}
      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm dark:border-green-900 dark:bg-green-950">
          <p className="text-xs font-medium uppercase tracking-wide text-green-800 dark:text-green-300">
            Total Ingresos
          </p>
          <p className="mt-1 text-2xl font-bold text-green-800 dark:text-green-200">
            {formatCLP(resumen.totalIngresos)}
          </p>
        </article>
        <article className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm dark:border-red-900 dark:bg-red-950">
          <p className="text-xs font-medium uppercase tracking-wide text-red-800 dark:text-red-300">
            Total Gastos
          </p>
          <p className="mt-1 text-2xl font-bold text-red-800 dark:text-red-200">
            {formatCLP(resumen.totalGastos)}
          </p>
        </article>
        <article
          className={`rounded-2xl border p-4 shadow-sm ${
            resumen.balance >= 0
              ? "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950"
              : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950"
          }`}
        >
          <p
            className={`text-xs font-medium uppercase tracking-wide ${
              resumen.balance >= 0
                ? "text-blue-800 dark:text-blue-300"
                : "text-amber-800 dark:text-amber-300"
            }`}
          >
            Balance
          </p>
          <p
            className={`mt-1 text-2xl font-bold ${
              resumen.balance >= 0
                ? "text-blue-800 dark:text-blue-200"
                : "text-amber-800 dark:text-amber-200"
            }`}
          >
            {formatCLP(resumen.balance)}
          </p>
        </article>
      </div>

      {/* Filtro por tipo */}
      <form
        method="GET"
        className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5"
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <label
              htmlFor="filter-tipo"
              className="text-sm font-medium text-text-primary dark:text-gray-200"
            >
              Filtrar por tipo
            </label>
            <select
              id="filter-tipo"
              name="tipo"
              defaultValue={filterTipo ?? ""}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="">Todos</option>
              <option value="ingreso">Ingresos</option>
              <option value="gasto">Gastos</option>
            </select>
          </div>
          <button
            type="submit"
            className="h-12 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:shadow-md active:scale-[0.98]"
          >
            Filtrar
          </button>
        </div>
      </form>

      {/* Formulario nuevo registro */}
      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
          Registrar movimiento
        </h2>

        <form action={crearFinanzaFormAction} className="mt-4 space-y-4">
          <input type="hidden" name="page" value={String(currentPage)} />
          <input type="hidden" name="filterTipo" value={filterTipo ?? ""} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="fin-tipo"
                className="text-sm font-medium text-text-primary dark:text-gray-200"
              >
                Tipo <span className="text-danger">*</span>
              </label>
              <select
                id="fin-tipo"
                name="tipo"
                required
                defaultValue="ingreso"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="ingreso">Ingreso</option>
                <option value="gasto">Gasto</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="fin-monto"
                className="text-sm font-medium text-text-primary dark:text-gray-200"
              >
                Monto (CLP) <span className="text-danger">*</span>
              </label>
              <input
                id="fin-monto"
                name="monto"
                type="number"
                inputMode="numeric"
                min={1}
                step="1"
                required
                placeholder="50000"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label
                htmlFor="fin-descripcion"
                className="text-sm font-medium text-text-primary dark:text-gray-200"
              >
                Descripcion <span className="text-danger">*</span>
              </label>
              <input
                id="fin-descripcion"
                name="descripcion"
                type="text"
                required
                maxLength={500}
                placeholder="Pago mensualidad, compra materiales, etc."
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="fin-categoria"
                className="text-sm font-medium text-text-primary dark:text-gray-200"
              >
                Categoria (opcional)
              </label>
              <input
                id="fin-categoria"
                name="categoria"
                type="text"
                maxLength={120}
                placeholder="Arancel, Material, Servicio..."
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="fin-fecha"
                className="text-sm font-medium text-text-primary dark:text-gray-200"
              >
                Fecha <span className="text-danger">*</span>
              </label>
              <input
                id="fin-fecha"
                name="fecha"
                type="date"
                required
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label
                htmlFor="fin-comprobante"
                className="text-sm font-medium text-text-primary dark:text-gray-200"
              >
                URL comprobante (opcional)
              </label>
              <input
                id="fin-comprobante"
                name="comprobanteUrl"
                type="url"
                maxLength={500}
                placeholder="https://..."
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="h-12 w-full rounded-xl bg-gradient-to-r from-primary to-primary-dark px-6 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-colors hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] sm:w-auto"
          >
            Guardar registro
          </button>
        </form>
      </article>

      {/* Lista de registros */}
      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
              Registros financieros
            </h2>
            {totalCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
                {totalCount}
              </span>
            )}
          </div>
          <ExportFinanzasCsvButton registros={registros} />
        </div>

        {registros.length === 0 ? (
          <p className="mt-4 text-sm text-text-secondary dark:text-gray-400">
            No hay registros financieros{filterTipo ? ` de tipo "${TIPO_LABELS[filterTipo]}"` : ""}.
          </p>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="mt-4 space-y-3 sm:hidden">
              {registros.map((reg) => (
                <div
                  key={reg.id}
                  className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-text-primary dark:text-white">
                        {reg.descripcion}
                      </p>
                      <p className="text-xs text-text-secondary dark:text-gray-400">
                        {reg.fecha} {reg.categoria ? `- ${reg.categoria}` : ""}
                      </p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        reg.tipo === "ingreso"
                          ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
                          : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
                      }`}
                    >
                      {TIPO_LABELS[reg.tipo] ?? reg.tipo}
                    </span>
                  </div>
                  <p
                    className={`mt-2 text-lg font-bold ${
                      reg.tipo === "ingreso"
                        ? "text-green-700 dark:text-green-300"
                        : "text-red-700 dark:text-red-300"
                    }`}
                  >
                    {reg.tipo === "ingreso" ? "+" : "-"}{formatCLP(reg.monto)}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <form action={editarFinanzaFormAction} className="flex-1">
                      <input type="hidden" name="id" value={reg.id} />
                      <input type="hidden" name="filterTipo" value={filterTipo ?? ""} />
                      <input type="hidden" name="page" value={String(currentPage)} />
                      <input type="hidden" name="tipo" value={reg.tipo} />
                      <input type="hidden" name="monto" value={reg.monto} />
                      <input type="hidden" name="descripcion" value={reg.descripcion} />
                      <input type="hidden" name="categoria" value={reg.categoria ?? ""} />
                      <input type="hidden" name="fecha" value={reg.fecha} />
                      <input type="hidden" name="comprobanteUrl" value={reg.comprobanteUrl ?? ""} />
                      {reg.comprobanteUrl && (
                        <a
                          href={reg.comprobanteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-10 items-center rounded-xl border border-gray-200 px-3 text-xs font-medium text-text-primary transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                          Comprobante
                        </a>
                      )}
                    </form>
                    <form action={eliminarFinanzaFormAction} className="flex-1">
                      <input type="hidden" name="id" value={reg.id} />
                      <input type="hidden" name="filterTipo" value={filterTipo ?? ""} />
                      <input type="hidden" name="page" value={String(currentPage)} />
                      <button
                        type="submit"
                        className="h-10 w-full rounded-xl border border-danger/30 text-sm font-medium text-red-700 transition-colors hover:bg-danger/10 dark:text-red-400"
                      >
                        Eliminar
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="mt-4 hidden overflow-x-auto sm:block">
              <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                    <th className="px-3 py-2.5">Fecha</th>
                    <th className="px-3 py-2.5">Tipo</th>
                    <th className="px-3 py-2.5">Monto</th>
                    <th className="px-3 py-2.5">Descripcion</th>
                    <th className="px-3 py-2.5">Categoria</th>
                    <th className="px-3 py-2.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {registros.map((reg) => (
                    <tr
                      key={reg.id}
                      className="transition-colors hover:bg-primary/3 dark:hover:bg-primary/5"
                    >
                      <td className="whitespace-nowrap px-3 py-3 text-text-secondary dark:text-gray-400">
                        {reg.fecha}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            reg.tipo === "ingreso"
                              ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
                              : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
                          }`}
                        >
                          {TIPO_LABELS[reg.tipo] ?? reg.tipo}
                        </span>
                      </td>
                      <td
                        className={`whitespace-nowrap px-3 py-3 font-medium ${
                          reg.tipo === "ingreso"
                            ? "text-green-700 dark:text-green-300"
                            : "text-red-700 dark:text-red-300"
                        }`}
                      >
                        {reg.tipo === "ingreso" ? "+" : "-"}{formatCLP(reg.monto)}
                      </td>
                      <td className="max-w-xs truncate px-3 py-3 text-text-primary dark:text-gray-100">
                        {reg.descripcion}
                      </td>
                      <td className="px-3 py-3 text-text-secondary dark:text-gray-400">
                        {reg.categoria ?? "-"}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {reg.comprobanteUrl && (
                            <a
                              href={reg.comprobanteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                            >
                              Comprobante
                            </a>
                          )}
                          <form action={eliminarFinanzaFormAction} className="inline">
                            <input type="hidden" name="id" value={reg.id} />
                            <input type="hidden" name="filterTipo" value={filterTipo ?? ""} />
                            <input type="hidden" name="page" value={String(currentPage)} />
                            <button
                              type="submit"
                              className="rounded-xl border border-danger/30 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-danger/10 dark:text-red-400"
                            >
                              Eliminar
                            </button>
                          </form>
                        </div>
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
