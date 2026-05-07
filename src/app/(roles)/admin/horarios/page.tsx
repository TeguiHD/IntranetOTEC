import { and, eq, isNull } from "drizzle-orm";

import { listarPeriodosDashboard } from "@/actions/admin-metricas";
import { getDb } from "@/db";
import { asignaturas, bloquesHorario, periodosAcademicos, usuarios } from "@/db/schema";
import { AsignaturaFilterSelect } from "@/components/shared/AsignaturaFilterSelect";
import { WeeklyScheduleGrid } from "@/components/shared/WeeklyScheduleGrid";

export const metadata = { title: "Horarios" };

type PageProps = {
  searchParams?: Promise<{ periodoId?: string; asignaturaId?: string }>;
};

export default async function AdminHorariosPage({ searchParams }: PageProps) {
  const params = await (searchParams ?? Promise.resolve({ periodoId: undefined, asignaturaId: undefined }));

  const db = getDb();
  const periodos = await listarPeriodosDashboard();
  const requestedPeriodoId = typeof params.periodoId === "string" ? params.periodoId.trim() : "";
  const defaultPeriodoId = periodos.find((p) => p.estado === "activo")?.id ?? periodos[0]?.id ?? "";
  const selectedPeriodoId =
    requestedPeriodoId && periodos.some((p) => p.id === requestedPeriodoId)
      ? requestedPeriodoId
      : defaultPeriodoId;

  // Cargar secciones del periodo seleccionado para el selector
  const seccionesWhere = selectedPeriodoId
    ? and(
        isNull(asignaturas.eliminadoAt),
        eq(asignaturas.periodoId, selectedPeriodoId),
      )
    : isNull(asignaturas.eliminadoAt);

  const secciones = await db
    .select({
      id: asignaturas.id,
      nombre: asignaturas.nombre,
      codigo: asignaturas.codigo,
      estado: asignaturas.estado,
      docenteNombre: usuarios.nombre,
      docenteApellido: usuarios.apellido,
      periodoNombre: periodosAcademicos.nombre,
    })
    .from(asignaturas)
    .leftJoin(usuarios, eq(asignaturas.docenteId, usuarios.id))
    .leftJoin(periodosAcademicos, eq(asignaturas.periodoId, periodosAcademicos.id))
    .where(seccionesWhere)
    .orderBy(asignaturas.nombre);

  // Si se seleccionó una sección, cargar sus bloques
  const requestedAsignaturaId = typeof params.asignaturaId === "string" ? params.asignaturaId : undefined;
  const asignaturaSelId =
    requestedAsignaturaId && secciones.some((s) => s.id === requestedAsignaturaId)
      ? requestedAsignaturaId
      : secciones[0]?.id;
  let bloques: {
    id: string;
    asignaturaNombre: string;
    diaSemana: number;
    horaInicio: string;
    horaFin: string;
    sala: string | null;
  }[] = [];

  if (asignaturaSelId) {
    const rows = await db
      .select({
        id: bloquesHorario.id,
        asignaturaNombre: asignaturas.nombre,
        diaSemana: bloquesHorario.diaSemana,
        horaInicio: bloquesHorario.horaInicio,
        horaFin: bloquesHorario.horaFin,
        sala: bloquesHorario.sala,
      })
      .from(bloquesHorario)
      .innerJoin(asignaturas, eq(bloquesHorario.asignaturaId, asignaturas.id))
      .where(
        and(
          eq(bloquesHorario.asignaturaId, asignaturaSelId),
          isNull(bloquesHorario.eliminadoAt),
        ),
      );
    bloques = rows;
  }

  const seccionSel = secciones.find((s) => s.id === asignaturaSelId);

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
          Horarios
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
          Visualiza los bloques horarios por sección.
        </p>
      </header>

      {/* Selector de sección */}
      <form method="get" className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <label htmlFor="admin-horario-periodo" className="mb-1.5 block text-sm font-medium text-text-primary dark:text-gray-200">
              Periodo
            </label>
            <select
              id="admin-horario-periodo"
              name="periodoId"
              defaultValue={selectedPeriodoId}
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              {periodos.length === 0 ? (
                <option value="">Sin periodos</option>
              ) : (
                periodos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))
              )}
            </select>
          </div>

          <div className="min-w-0">
            <label htmlFor="admin-horario-asig" className="mb-1.5 block text-sm font-medium text-text-primary dark:text-gray-200">
              Seccion
            </label>
            <AsignaturaFilterSelect
              options={secciones.map((s) => ({ id: s.id, nombre: s.nombre, codigo: s.codigo }))}
              defaultValue={asignaturaSelId}
              name="asignaturaId"
              placeholder="Buscar seccion..."
              autoSubmit={false}
            />
          </div>

          <button
            type="submit"
            className="h-11 w-full rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 text-sm font-semibold text-white shadow-md transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:shadow-lg sm:w-auto"
          >
            Ver
          </button>
        </div>
      </form>

      {secciones.length === 0 && (
        <article className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-sm text-text-secondary shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
          No hay secciones disponibles para el periodo seleccionado.
        </article>
      )}

      {/* Grilla horaria */}
      {asignaturaSelId && (
        <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <WeeklyScheduleGrid
            bloques={bloques}
            titulo={seccionSel ? `${seccionSel.nombre}${seccionSel.periodoNombre ? ` — ${seccionSel.periodoNombre}` : ""}` : undefined}
          />
          {bloques.length === 0 && (
            <p className="mt-4 text-sm text-text-secondary dark:text-gray-400">
              Esta sección no tiene bloques horarios definidos.{" "}
              <a href="/admin/asignaturas" className="text-primary underline-offset-2 hover:underline dark:text-primary-light">
                Ir a Secciones
              </a>{" "}
              para agregarlos.
            </p>
          )}
        </article>
      )}
    </section>
  );
}
