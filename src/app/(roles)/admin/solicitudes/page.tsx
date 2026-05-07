import { Search } from "lucide-react";

import {
  countSolicitudesDocumentosAdmin,
  listarSolicitudesDocumentosAdmin,
  resumenSolicitudesAdmin,
} from "@/actions/solicitudes-documentos";
import { Pagination } from "@/components/shared/Pagination";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { SolicitudesView } from "./SolicitudesView";

const PAGE_SIZE = 30;

const TIPO_VALUES = ["credencial", "alumno_regular", "tarjeta_beneficio"] as const;
const ESTADO_VALUES = ["pendiente", "aprobada", "rechazada"] as const;

type Tipo = (typeof TIPO_VALUES)[number];
type Estado = (typeof ESTADO_VALUES)[number];

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  solicitud_aprobada: { tone: "success", text: "Solicitud aprobada correctamente." },
  solicitud_rechazada: { tone: "success", text: "Solicitud rechazada correctamente." },
  solicitudes_limpiadas: { tone: "success", text: "Solicitudes resueltas eliminadas correctamente." },
  already_resolved: { tone: "error", text: "La solicitud ya fue resuelta anteriormente." },
  not_found: { tone: "error", text: "Solicitud no encontrada." },
  invalid_input: { tone: "error", text: "Datos inválidos." },
  forbidden: { tone: "error", text: "No autorizado para esta acción." },
  error: { tone: "error", text: "No fue posible completar la acción." },
};

type AdminSolicitudesPageProps = {
  searchParams?: Promise<{
    state?: string;
    q?: string;
    tipo?: string;
    estado?: string;
    page?: string;
  }>;
};

export const metadata = {
  title: "Solicitudes",
};

const inputClass =
  "h-11 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";

const selectClass =
  "h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-text-primary focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";

export default async function AdminSolicitudesPage({ searchParams }: AdminSolicitudesPageProps) {
  const params = await (searchParams ?? Promise.resolve({} as { state?: string; q?: string; tipo?: string; estado?: string; page?: string }));
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const tipoRaw = typeof params.tipo === "string" ? params.tipo : "";
  const tipo = (TIPO_VALUES as readonly string[]).includes(tipoRaw) ? (tipoRaw as Tipo) : undefined;
  const estadoRaw = typeof params.estado === "string" ? params.estado : "";
  const estado = (ESTADO_VALUES as readonly string[]).includes(estadoRaw)
    ? (estadoRaw as Estado)
    : undefined;

  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const offset = (currentPage - 1) * PAGE_SIZE;

  const filterCommon = { q: q || undefined, tipo, estado };

  const [solicitudes, totalCount, resumen] = await Promise.all([
    listarSolicitudesDocumentosAdmin({ ...filterCommon, limit: PAGE_SIZE, offset }),
    countSolicitudesDocumentosAdmin(filterCommon),
    resumenSolicitudesAdmin(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function buildHref(page: number) {
    const usp = new URLSearchParams();
    if (q) usp.set("q", q);
    if (tipo) usp.set("tipo", tipo);
    if (estado) usp.set("estado", estado);
    if (page > 1) usp.set("page", String(page));
    const qs = usp.toString();
    return qs ? `/admin/solicitudes?${qs}` : "/admin/solicitudes";
  }

  return (
    <section className="space-y-5">
      <RouteStateToast state={params.state} map={STATUS_MAP} />

      <header>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
          Solicitudes de Documentos
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
          Gestiona las solicitudes de credencial, certificado de alumno regular y tarjeta de
          beneficio. Las solicitudes de alumno regular son evaluadas automáticamente.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Total" value={resumen.total} tone="neutral" />
        <SummaryCard label="Pendientes" value={resumen.pendientes} tone="amber" />
        <SummaryCard label="Aprobadas" value={resumen.aprobadas} tone="emerald" />
        <SummaryCard
          label="Auto-evaluadas"
          value={resumen.autoEvaluadas}
          tone="primary"
          hint="Procesadas por reglas"
        />
      </div>

      <form
        method="GET"
        className="grid gap-3 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-[1fr_180px_180px_auto]"
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            name="q"
            type="text"
            inputMode="search"
            defaultValue={q}
            placeholder="Buscar por nombre o RUT del alumno…"
            className={inputClass}
          />
        </div>
        <select name="tipo" defaultValue={tipo ?? ""} className={selectClass} aria-label="Tipo de documento">
          <option value="">Todos los tipos</option>
          <option value="credencial">Credencial</option>
          <option value="alumno_regular">Alumno regular</option>
          <option value="tarjeta_beneficio">Tarjeta beneficio</option>
        </select>
        <select name="estado" defaultValue={estado ?? ""} className={selectClass} aria-label="Estado">
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="aprobada">Aprobada</option>
          <option value="rechazada">Rechazada</option>
        </select>
        <button
          type="submit"
          className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
        >
          Filtrar
        </button>
      </form>

      <SolicitudesView solicitudes={solicitudes} />

      {totalCount > 0 ? (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          buildHref={buildHref}
        />
      ) : null}
    </section>
  );
}

const TONE_CLASS: Record<string, string> = {
  neutral: "border-gray-200/80 bg-white text-text-primary dark:border-gray-800 dark:bg-gray-900 dark:text-white",
  amber: "border-amber-200/80 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100",
  emerald: "border-emerald-200/80 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100",
  primary: "border-primary/30 bg-primary/5 text-primary dark:border-primary/40 dark:bg-primary/10",
};

function SummaryCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: number;
  tone: keyof typeof TONE_CLASS;
  hint?: string;
}) {
  return (
    <article className={`rounded-2xl border p-4 shadow-sm ${TONE_CLASS[tone]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value.toLocaleString("es-CL")}</p>
      {hint ? <p className="mt-0.5 text-[11px] opacity-70">{hint}</p> : null}
    </article>
  );
}
