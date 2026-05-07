import { AlertTriangle, ShieldCheck } from "lucide-react";
import { and, eq, isNull, sql } from "drizzle-orm";

import {
  listarAsignaturasAdmin,
  type AsignaturaBusqueda,
} from "@/actions/asignaturas";
import {
  countMatriculasAdmin,
  listarMatriculasAdmin,
  matricularAlumnoFormAction,
} from "@/actions/matriculas";
import { Pagination } from "@/components/shared/Pagination";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { getDb } from "@/db";
import {
  asignaturas as asignaturasTable,
  matriculas as matriculasTable,
  periodosAcademicos,
} from "@/db/schema";
import { formatearIdentificador } from "@/lib/rut";
import { AlumnoCombobox } from "./AlumnoCombobox";
import { AsignaturaCombobox } from "./AsignaturaCombobox";
import { DesmatricularButton } from "./DesmatricularButton";
import { EditMatriculaButton } from "./EditMatriculaButton";
import { EliminarMatriculaButton } from "./EliminarMatriculaButton";
import { ExportCsvButton } from "./ExportCsvButton";
import { ReactivarMatriculaButton } from "./ReactivarMatriculaButton";

const PAGE_SIZE = 20;

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  matricula_created: { tone: "success", text: "Matrícula creada correctamente." },
  matricula_updated: { tone: "success", text: "Matrícula actualizada/reactivada correctamente." },
  matricula_edited: { tone: "success", text: "Matrícula editada correctamente." },
  matricula_deactivated: { tone: "success", text: "Matrícula desactivada correctamente." },
  matricula_reactivated: { tone: "success", text: "Matrícula reactivada correctamente." },
  matricula_deleted: { tone: "success", text: "Matrícula eliminada correctamente." },
  already_inactive: { tone: "success", text: "La matrícula ya estaba inactiva." },
  already_active: { tone: "success", text: "La matrícula ya estaba activa." },
  already_deleted: { tone: "success", text: "La matrícula ya estaba eliminada." },
  error: { tone: "error", text: "No fue posible completar la acción. Revisa los datos e intenta nuevamente." },
};

type AdminMatriculasPageProps = {
  searchParams?: Promise<{
    state?: string;
    asignaturaId?: string;
    page?: string;
  }>;
};

const estaPagado = (estadoPago: string | null | undefined): boolean =>
  estadoPago === "pagado" || estadoPago === "becado";

const formatCurrency = (value: string | null): string => {
  if (!value) return "-";

  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return value;
  }

  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: numeric % 1 === 0 ? 0 : 2,
  }).format(numeric);
};

const ESTADO_PAGO_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  mora: "Mora",
  becado: "Becado",
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ContextoMatricula = {
  asignaturaEstado: "borrador" | "activo" | "finalizado" | "archivado" | null;
  maxAlumnos: number | null;
  periodoNombre: string | null;
  periodoEstado: "planificado" | "activo" | "cerrado" | null;
  activos: number;
};

type Advertencia = { severity: "block" | "warn" | "info"; mensaje: string };

function buildAdvertencias(ctx: ContextoMatricula): Advertencia[] {
  const out: Advertencia[] = [];

  if (ctx.periodoEstado && ctx.periodoEstado !== "activo") {
    out.push({
      severity: "block",
      mensaje:
        ctx.periodoEstado === "cerrado"
          ? `Periodo cerrado: no se pueden crear nuevas matrículas en "${ctx.periodoNombre ?? ""}".`
          : `Periodo aún en estado planificado: confirma su activación antes de matricular.`,
    });
  }

  if (ctx.asignaturaEstado === "archivado" || ctx.asignaturaEstado === "finalizado") {
    out.push({
      severity: "block",
      mensaje:
        ctx.asignaturaEstado === "archivado"
          ? "La sección está archivada. No se permiten nuevas matrículas."
          : "La sección está finalizada. Las matrículas nuevas requieren reabrir la sección.",
    });
  }

  if (ctx.asignaturaEstado === "borrador") {
    out.push({
      severity: "warn",
      mensaje: "La sección está en borrador. Considera publicarla antes de matricular.",
    });
  }

  if (ctx.maxAlumnos && ctx.maxAlumnos > 0) {
    if (ctx.activos >= ctx.maxAlumnos) {
      out.push({
        severity: "block",
        mensaje: `Cupo lleno: ${ctx.activos}/${ctx.maxAlumnos} alumnos activos.`,
      });
    } else if (ctx.activos / ctx.maxAlumnos >= 0.9) {
      out.push({
        severity: "warn",
        mensaje: `Cupo casi lleno: ${ctx.activos}/${ctx.maxAlumnos}.`,
      });
    }
  }

  return out;
}

export const metadata = {
  title: "Matrículas",
};

export default async function AdminMatriculasPage({ searchParams }: AdminMatriculasPageProps) {
  const params = await (searchParams ?? Promise.resolve({} as { state?: string; asignaturaId?: string; page?: string }));
  const currentPage = Math.max(1, Number(params.page ?? "1") || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const asignaturas = await listarAsignaturasAdmin(
    { limit: 100, offset: 0 },
    { incluirArchivadas: false },
  );

  const selectedAsignaturaIdRaw =
    typeof params.asignaturaId === "string" ? params.asignaturaId : undefined;
  const selectedAsignaturaId =
    selectedAsignaturaIdRaw && UUID_REGEX.test(selectedAsignaturaIdRaw)
      ? selectedAsignaturaIdRaw
      : asignaturas[0]?.id;

  const selectedAsignaturaCombobox: AsignaturaBusqueda | null = selectedAsignaturaId
    ? (() => {
        const selected = asignaturas.find((item) => item.id === selectedAsignaturaId);

        if (!selected) {
          return null;
        }

        return {
          id: selected.id,
          nombre: selected.nombre,
          codigo: selected.codigo,
          estado: selected.estado,
        };
      })()
    : null;

  const [matriculas, totalCount] = selectedAsignaturaId
    ? await Promise.all([
        listarMatriculasAdmin(
          { limit: PAGE_SIZE, offset },
          { asignaturaId: selectedAsignaturaId, incluirInactivas: true },
        ),
        countMatriculasAdmin({ asignaturaId: selectedAsignaturaId, incluirInactivas: true }),
      ])
    : [[], 0];

  const contexto = selectedAsignaturaId
    ? await getDb()
        .select({
          asignaturaEstado: asignaturasTable.estado,
          maxAlumnos: asignaturasTable.maxAlumnos,
          periodoNombre: periodosAcademicos.nombre,
          periodoEstado: periodosAcademicos.estado,
          activos: sql<number>`coalesce((
            select count(*)::int from ${matriculasTable}
            where ${matriculasTable.asignaturaId} = ${asignaturasTable.id}
              and ${matriculasTable.activa} = true
              and ${matriculasTable.eliminadoAt} is null
          ), 0)`,
        })
        .from(asignaturasTable)
        .innerJoin(periodosAcademicos, eq(asignaturasTable.periodoId, periodosAcademicos.id))
        .where(and(eq(asignaturasTable.id, selectedAsignaturaId), isNull(asignaturasTable.eliminadoAt)))
        .limit(1)
        .then((rows) => rows[0] ?? null)
    : null;

  const advertencias = contexto ? buildAdvertencias(contexto) : [];
  const bloqueado = advertencias.some((a) => a.severity === "block");

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  function buildHref(page: number) {
    const urlParams = new URLSearchParams();
    if (selectedAsignaturaId) urlParams.set("asignaturaId", selectedAsignaturaId);
    urlParams.set("page", String(page));
    return `/admin/matriculas?${urlParams.toString()}`;
  }

  return (
    <section className="space-y-5">
      <RouteStateToast state={params.state} map={STATUS_MAP} />

      <header>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
          Matrículas
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
          Matricula alumnos por asignatura y controla el estado de pago.
        </p>
      </header>

      {advertencias.length > 0 ? (
        <article
          className={`rounded-2xl border p-4 text-sm shadow-sm ${
            bloqueado
              ? "border-red-300 bg-red-50 text-red-900 dark:border-red-800/60 dark:bg-red-950/30 dark:text-red-100"
              : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100"
          }`}
        >
          <div className="flex items-start gap-3">
            {bloqueado ? (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            ) : (
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            )}
            <div className="space-y-1">
              <p className="font-semibold uppercase tracking-wide text-xs">
                {bloqueado ? "No se puede matricular en esta sección" : "Atención antes de matricular"}
              </p>
              <ul className="list-disc space-y-1 pl-5">
                {advertencias.map((a, idx) => (
                  <li key={idx}>{a.mensaje}</li>
                ))}
              </ul>
              {contexto ? (
                <p className="mt-2 text-xs opacity-80">
                  Periodo: {contexto.periodoNombre ?? "—"} · estado {contexto.periodoEstado ?? "—"} · sección{" "}
                  {contexto.asignaturaEstado ?? "—"} · cupo {contexto.activos}
                  {contexto.maxAlumnos ? `/${contexto.maxAlumnos}` : ""}.
                </p>
              ) : null}
            </div>
          </div>
        </article>
      ) : null}

      {/* Combined filter + create form */}
      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <form action={matricularAlumnoFormAction} className="space-y-4">
          <input type="hidden" name="page" value={String(currentPage)} />

          <div className="grid gap-4 sm:grid-cols-2">
            <AsignaturaCombobox
              name="asignaturaId"
              label="Asignatura"
              required={asignaturas.length > 0}
              defaultAsignatura={selectedAsignaturaCombobox}
            />
            <AlumnoCombobox />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="mat-estado" className="text-sm font-medium text-text-primary dark:text-gray-200">
                Estado de pago <span className="text-danger">*</span>
              </label>
              <select
                id="mat-estado"
                name="estadoPago"
                required
                defaultValue="pendiente"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="pendiente">Pendiente</option>
                <option value="pagado">Pagado</option>
                <option value="mora">Mora</option>
                <option value="becado">Becado</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="mat-monto" className="text-sm font-medium text-text-primary dark:text-gray-200">
                Monto (opcional)
              </label>
              <input
                id="mat-monto"
                name="montoArancel"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder="0.00"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={bloqueado}
                className="h-12 w-full rounded-xl bg-gradient-to-r from-primary to-primary-dark px-6 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-colors hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
                title={bloqueado ? "Resuelve las advertencias antes de matricular" : undefined}
              >
                {bloqueado ? "Bloqueado" : "Guardar matrícula"}
              </button>
            </div>
          </div>
        </form>
      </article>

      {/* Lista matrículas */}
      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
              Matrículas registradas
            </h2>
            {totalCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
                {totalCount}
              </span>
            )}
          </div>
          <ExportCsvButton matriculas={matriculas} />
        </div>

        {matriculas.length === 0 ? (
          <p className="mt-4 text-sm text-text-secondary dark:text-gray-400">
            No hay matrículas registradas para esta asignatura.
          </p>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="mt-4 space-y-3 sm:hidden">
              {matriculas.map((matricula) => (
                <div
                  key={matricula.id}
                  className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-text-primary dark:text-white">
                        {matricula.alumnoNombre} {matricula.alumnoApellido}
                      </p>
                      <p className="text-xs text-text-secondary dark:text-gray-400">
                        {formatearIdentificador(matricula.alumnoRut)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        matricula.activa
                          ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
                          : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
                      }`}
                    >
                      {matricula.activa ? "Activa" : "Inactiva"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        estaPagado(matricula.estadoPago)
                          ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                      }`}
                    >
                      {ESTADO_PAGO_LABELS[matricula.estadoPago ?? ""] ?? matricula.estadoPago}
                    </span>
                    {matricula.montoArancel && (
                      <span className="text-xs text-text-secondary dark:text-gray-400">
                        {formatCurrency(matricula.montoArancel)}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    {matricula.activa ? (
                      <>
                        <EditMatriculaButton
                          matriculaId={matricula.id}
                          alumnoNombre={`${matricula.alumnoNombre} ${matricula.alumnoApellido}`}
                          estadoPago={matricula.estadoPago}
                          montoArancel={matricula.montoArancel}
                          asignaturaId={selectedAsignaturaId ?? ""}
                          currentPage={currentPage}
                        />
                        <DesmatricularButton
                          matriculaId={matricula.id}
                          alumnoNombre={`${matricula.alumnoNombre} ${matricula.alumnoApellido}`}
                          asignaturaId={selectedAsignaturaId ?? ""}
                          currentPage={currentPage}
                          className="h-10 flex-1 rounded-xl border border-danger/30 text-sm font-medium text-red-700 transition-colors hover:bg-danger/10 dark:text-red-400"
                        />
                      </>
                    ) : (
                      <>
                        <ReactivarMatriculaButton
                          matriculaId={matricula.id}
                          alumnoNombre={`${matricula.alumnoNombre} ${matricula.alumnoApellido}`}
                          asignaturaId={selectedAsignaturaId ?? ""}
                          currentPage={currentPage}
                          className="h-10 flex-1 rounded-xl border border-success/30 text-sm font-medium text-green-700 transition-colors hover:bg-success/10 dark:text-green-400"
                        />
                        <EliminarMatriculaButton
                          matriculaId={matricula.id}
                          alumnoNombre={`${matricula.alumnoNombre} ${matricula.alumnoApellido}`}
                          asignaturaId={selectedAsignaturaId ?? ""}
                          currentPage={currentPage}
                          className="h-10 flex-1 rounded-xl border border-danger/30 text-sm font-medium text-red-700 transition-colors hover:bg-danger/10 dark:text-red-400"
                        />
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="mt-4 hidden overflow-x-auto sm:block">
              <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                    <th className="px-3 py-2.5">Alumno</th>
                    <th className="px-3 py-2.5">Estado pago</th>
                    <th className="px-3 py-2.5">Monto</th>
                    <th className="px-3 py-2.5">Estado</th>
                    <th className="px-3 py-2.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {matriculas.map((matricula) => (
                    <tr
                      key={matricula.id}
                      className="transition-colors hover:bg-primary/3 dark:hover:bg-primary/5"
                    >
                      <td className="px-3 py-3">
                        <p className="font-medium text-text-primary dark:text-gray-100">
                          {matricula.alumnoNombre} {matricula.alumnoApellido}
                        </p>
                        <p className="text-xs text-text-secondary dark:text-gray-400">
                          {formatearIdentificador(matricula.alumnoRut)}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            estaPagado(matricula.estadoPago)
                              ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                          }`}
                        >
                          {ESTADO_PAGO_LABELS[matricula.estadoPago ?? ""] ?? matricula.estadoPago}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-text-secondary dark:text-gray-400">
                        {formatCurrency(matricula.montoArancel)}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            matricula.activa
                              ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
                              : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
                          }`}
                        >
                          {matricula.activa ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        {matricula.activa ? (
                          <div className="flex items-center justify-end gap-2">
                            <EditMatriculaButton
                              matriculaId={matricula.id}
                              alumnoNombre={`${matricula.alumnoNombre} ${matricula.alumnoApellido}`}
                              estadoPago={matricula.estadoPago}
                              montoArancel={matricula.montoArancel}
                              asignaturaId={selectedAsignaturaId ?? ""}
                              currentPage={currentPage}
                            />
                            <DesmatricularButton
                              matriculaId={matricula.id}
                              alumnoNombre={`${matricula.alumnoNombre} ${matricula.alumnoApellido}`}
                              asignaturaId={selectedAsignaturaId ?? ""}
                              currentPage={currentPage}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <ReactivarMatriculaButton
                              matriculaId={matricula.id}
                              alumnoNombre={`${matricula.alumnoNombre} ${matricula.alumnoApellido}`}
                              asignaturaId={selectedAsignaturaId ?? ""}
                              currentPage={currentPage}
                            />
                            <EliminarMatriculaButton
                              matriculaId={matricula.id}
                              alumnoNombre={`${matricula.alumnoNombre} ${matricula.alumnoApellido}`}
                              asignaturaId={selectedAsignaturaId ?? ""}
                              currentPage={currentPage}
                            />
                          </div>
                        )}
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
              totalCount={totalCount}
            />
          </>
        )}
      </article>
    </section>
  );
}
