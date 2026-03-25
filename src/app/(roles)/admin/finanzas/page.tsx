import {
  crearFinanzaAction,
  eliminarFinanzaAction,
  listarFinanzasAction,
  resumenFinanzasAction,
} from "@/actions/finanzas";
import { RouteStateToast } from "@/components/shared/RouteStateToast";

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  finanza_created: { tone: "success", text: "Transacción registrada correctamente." },
  finanza_updated: { tone: "success", text: "Transacción actualizada." },
  finanza_deleted: { tone: "success", text: "Transacción eliminada." },
  error: { tone: "error", text: "No fue posible completar la acción. Revisa los datos e intenta nuevamente." },
};

const PAGE_SIZE = 25;

type AdminFinanzasPageProps = {
  searchParams?: Promise<{
    state?: string;
    page?: string;
    tipo?: string;
    q?: string;
  }>;
};

function formatMonto(value: string | null): string {
  if (!value) return "$0";
  const num = Number(value);
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(num);
}

function formatFecha(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value + "T12:00:00");
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export const metadata = {
  title: "Finanzas — Admin",
};

export default async function AdminFinanzasPage({ searchParams }: AdminFinanzasPageProps) {
  const params = await (searchParams ?? Promise.resolve({} as { state?: string; page?: string; tipo?: string; q?: string }));
  const currentPage = Math.max(1, Number(params.page ?? "1") || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;
  const tipoFilter =
    params.tipo === "ingreso" || params.tipo === "gasto"
      ? params.tipo
      : undefined;
  const q = typeof params.q === "string" ? params.q.trim() : undefined;

  const [transacciones, resumen] = await Promise.all([
    listarFinanzasAction(
      { limit: PAGE_SIZE, offset },
      { tipo: tipoFilter, search: q || undefined },
    ),
    resumenFinanzasAction(),
  ]);

  const formatResumen = (value: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(value);

  return (
    <section className="space-y-5">
      <RouteStateToast state={params.state} map={STATUS_MAP} />

      <header>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-gray-100 sm:text-2xl">
          Finanzas
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-300">
          Registros de ingresos y gastos del OTEC.
        </p>
      </header>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted dark:text-gray-500">Total Ingresos</p>
          <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
            {formatResumen(resumen.totalIngresos)}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted dark:text-gray-500">Total Gastos</p>
          <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
            {formatResumen(resumen.totalGastos)}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted dark:text-gray-500">Balance</p>
          <p
            className={`mt-1 text-2xl font-bold ${
              resumen.balance >= 0
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {formatResumen(resumen.balance)}
          </p>
        </div>
      </div>

      {/* Inline create form */}
      <form
        action={async (formData) => {
          "use server";
          const monto = Number(formData.get("monto"));
          await crearFinanzaAction({
            tipo: (formData.get("tipo") as "ingreso" | "gasto") ?? "ingreso",
            monto: Number.isFinite(monto) ? monto : 0,
            descripcion: String(formData.get("descripcion") ?? ""),
            categoria: String(formData.get("categoria") ?? "") || undefined,
            fecha: String(formData.get("fecha") ?? ""),
          });
        }}
        className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6"
      >
        <h2 className="mb-4 text-base font-semibold text-text-primary dark:text-white">
          Registrar transacción
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-gray-400" htmlFor="fin-tipo">
              Tipo
            </label>
            <select
              id="fin-tipo"
              name="tipo"
              className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="ingreso">Ingreso</option>
              <option value="gasto">Gasto</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-gray-400" htmlFor="fin-monto">
              Monto (CLP)
            </label>
            <input
              id="fin-monto"
              name="monto"
              type="number"
              min="1"
              step="1"
              required
              placeholder="50000"
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-gray-400" htmlFor="fin-fecha">
              Fecha
            </label>
            <input
              id="fin-fecha"
              name="fecha"
              type="date"
              required
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-gray-400" htmlFor="fin-descripcion">
              Descripción
            </label>
            <input
              id="fin-descripcion"
              name="descripcion"
              type="text"
              required
              minLength={3}
              maxLength={300}
              placeholder="Ej: Matrícula alumno / Arriendo sala..."
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-gray-400" htmlFor="fin-categoria">
              Categoría (opcional)
            </label>
            <input
              id="fin-categoria"
              name="categoria"
              type="text"
              maxLength={80}
              placeholder="Ej: Matrícula, Infraestructura..."
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            className="h-11 rounded-xl bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98]"
          >
            Registrar
          </button>
        </div>
      </form>

      {/* Filter bar */}
      <form method="GET" className="flex flex-wrap gap-3">
        <select
          name="tipo"
          defaultValue={tipoFilter ?? ""}
          className="h-10 appearance-none rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary focus:border-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="">Todos los tipos</option>
          <option value="ingreso">Solo ingresos</option>
          <option value="gasto">Solo gastos</option>
        </select>
        <input
          name="q"
          type="text"
          defaultValue={q}
          placeholder="Buscar descripción o categoría..."
          className="h-10 flex-1 rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
        <button
          type="submit"
          className="h-10 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
        >
          Filtrar
        </button>
        {(tipoFilter || q) && (
          <a
            href="/admin/finanzas"
            className="flex h-10 items-center rounded-xl border border-gray-200 px-4 text-sm font-medium text-text-secondary hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Limpiar
          </a>
        )}
      </form>

      {/* Transactions table */}
      <article className="rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {transacciones.length === 0 ? (
          <p className="p-8 text-center text-sm text-text-secondary dark:text-gray-400">
            No hay transacciones registradas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted dark:text-gray-500">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted dark:text-gray-500">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted dark:text-gray-500">Descripción</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted dark:text-gray-500">Categoría</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted dark:text-gray-500">Monto</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted dark:text-gray-500">Acción</th>
                </tr>
              </thead>
              <tbody>
                {transacciones.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 dark:border-gray-800/50 dark:hover:bg-gray-800/30"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-text-secondary dark:text-gray-400">
                      {formatFecha(t.fecha)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                          t.tipo === "ingreso"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {t.tipo}
                      </span>
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-text-primary dark:text-white">
                      {t.descripcion}
                    </td>
                    <td className="px-4 py-3 text-text-secondary dark:text-gray-400">
                      {t.categoria ?? "—"}
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums ${
                        t.tipo === "ingreso"
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {t.tipo === "gasto" ? "−" : "+"}{formatMonto(t.monto)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form
                        action={async () => {
                          "use server";
                          await eliminarFinanzaAction(t.id);
                        }}
                      >
                        <button
                          type="submit"
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-danger hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          Eliminar
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}
