import Link from "next/link";

import {
  AlertTriangle,
  CalendarRange,
  GraduationCap,
  Lock,
  PlaySquare,
  ShieldAlert,
} from "lucide-react";

import { eliminarPeriodoAcademicoFormAction, listarPeriodosAdmin } from "@/actions/periodos";
import { RouteStateToast, type RouteStateToastMap } from "@/components/shared/RouteStateToast";

import { ConfirmDeleteButton } from "./ConfirmDeleteButton";

export const metadata = { title: "Periodos académicos" };

const ESTADO_TONE: Record<string, string> = {
  activo: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  planificado: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  cerrado: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const STATUS_MAP: RouteStateToastMap = {
  periodo_deleted: { tone: "success", text: "Periodo eliminado (soft-delete cascada aplicada)." },
  already_deleted: { tone: "info", text: "El periodo ya había sido eliminado." },
  error_periodo_protegido: {
    tone: "error",
    text: "El periodo está protegido y no puede eliminarse.",
  },
  error_periodo_not_found: { tone: "error", text: "Periodo no encontrado." },
  error: { tone: "error", text: "No fue posible eliminar el periodo." },
};

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(`${iso}T00:00:00`),
  );

type PageProps = { searchParams?: Promise<{ state?: string }> };

export default async function AdminPeriodosPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const periodos = await listarPeriodosAdmin();

  return (
    <section className="space-y-5">
      <RouteStateToast state={params.state} map={STATUS_MAP} />

      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Periodos académicos
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Gestiona los periodos activos. Eliminar uno aplica soft-delete en cascada a sus
            secciones, clases y matrículas (reversible vía SQL).
          </p>
        </div>
        <Link
          href="/admin/academico"
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-text-primary transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <CalendarRange className="h-4 w-4" />
          Ver vista académica
        </Link>
      </header>

      {periodos.length === 0 ? (
        <article className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-text-secondary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
          No hay periodos activos.
        </article>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {periodos.map((p) => {
            const tone = ESTADO_TONE[p.estado] ?? ESTADO_TONE.cerrado;
            const tieneDatos =
              p.totalAsignaturas > 0 || p.totalMatriculasActivas > 0 || p.totalClases > 0;
            return (
              <li
                key={p.id}
                className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-bold text-text-primary dark:text-white sm:text-lg">
                        {p.codigo}
                      </h2>
                      <span
                        className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold uppercase ${tone}`}
                      >
                        {p.estado}
                      </span>
                      {p.protegido ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
                          <Lock className="h-3 w-3" />
                          Protegido
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-text-secondary dark:text-gray-400">
                      {p.nombre}
                    </p>
                    <p className="mt-1 text-[11px] text-text-muted dark:text-gray-500">
                      {fmtDate(p.fechaInicio)} → {fmtDate(p.fechaFin)}
                    </p>
                  </div>
                </div>

                <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-gray-50 p-2 dark:bg-gray-800/60">
                    <dt className="text-[10px] uppercase text-text-secondary dark:text-gray-400">
                      <span className="inline-flex items-center gap-1">
                        <CalendarRange className="h-3 w-3" />
                        Secciones
                      </span>
                    </dt>
                    <dd className="mt-0.5 text-base font-bold text-text-primary dark:text-white">
                      {p.totalAsignaturas}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-2 dark:bg-gray-800/60">
                    <dt className="text-[10px] uppercase text-text-secondary dark:text-gray-400">
                      <span className="inline-flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" />
                        Matrículas
                      </span>
                    </dt>
                    <dd className="mt-0.5 text-base font-bold text-text-primary dark:text-white">
                      {p.totalMatriculasActivas}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-2 dark:bg-gray-800/60">
                    <dt className="text-[10px] uppercase text-text-secondary dark:text-gray-400">
                      <span className="inline-flex items-center gap-1">
                        <PlaySquare className="h-3 w-3" />
                        Clases
                      </span>
                    </dt>
                    <dd className="mt-0.5 text-base font-bold text-text-primary dark:text-white">
                      {p.totalClases}
                    </dd>
                  </div>
                </dl>

                {p.protegido ? (
                  <p className="mt-3 flex items-start gap-2 rounded-xl bg-primary/5 p-2.5 text-[11px] text-primary dark:bg-primary/10 dark:text-primary-light">
                    <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Periodo protegido por código. Editar
                    <code className="rounded bg-primary/10 px-1 font-mono dark:bg-primary/30">
                      PERIODOS_CODIGOS_PROTEGIDOS
                    </code>
                    en <code className="font-mono">src/actions/periodos.ts</code> para liberar.
                  </p>
                ) : (
                  <form action={eliminarPeriodoAcademicoFormAction} className="mt-3">
                    <input type="hidden" name="id" value={p.id} />
                    <ConfirmDeleteButton
                      label={`Eliminar ${p.codigo}`}
                      confirmMessage={
                        tieneDatos
                          ? `¿Eliminar periodo ${p.codigo}? Se aplicará soft-delete en cascada a ${p.totalAsignaturas} secciones, ${p.totalMatriculasActivas} matrículas y ${p.totalClases} clases. Acción reversible vía SQL.`
                          : `¿Eliminar periodo ${p.codigo}? Sin datos asociados.`
                      }
                    />
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <aside className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-900/30 dark:text-amber-200 sm:p-5">
        <p className="flex items-start gap-2 font-semibold">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Marcha blanca
        </p>
        <p className="mt-1 text-xs leading-relaxed">
          Antes de eliminar periodos en producción, realiza un{" "}
          <code className="font-mono">pg_dump</code> y revisa los conteos por sección. La acción es
          soft-delete reversible con{" "}
          <code className="font-mono">UPDATE … SET eliminado_at = NULL</code>.
        </p>
      </aside>
    </section>
  );
}
