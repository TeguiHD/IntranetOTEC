import { and, eq, isNull } from "drizzle-orm";
import Link from "next/link";
import { CalendarDays, Clock, ExternalLink, MapPin, Users } from "lucide-react";

import { listarPeriodosDashboard } from "@/actions/admin-metricas";
import { getDb } from "@/db";
import { asignaturas, bloquesHorario, periodosAcademicos, usuarios } from "@/db/schema";
import { PeriodoCursoSeccionPicker } from "@/components/shared/PeriodoCursoSeccionPicker";
import { WeeklyScheduleGrid } from "@/components/shared/WeeklyScheduleGrid";

export const metadata = { title: "Horarios" };

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const diffHours = (inicio: string, fin: string): number => {
  const [ih, im] = inicio.split(":").map(Number);
  const [fh, fm] = fin.split(":").map(Number);
  const start = (ih ?? 0) * 60 + (im ?? 0);
  const end = (fh ?? 0) * 60 + (fm ?? 0);
  return Math.max(0, (end - start) / 60);
};

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
  const bloquesOrdenados = [...bloques].sort((a, b) => {
    if (a.diaSemana !== b.diaSemana) return a.diaSemana - b.diaSemana;
    return a.horaInicio.localeCompare(b.horaInicio);
  });
  const horasSemanales = bloques.reduce(
    (total, bloque) => total + diffHours(bloque.horaInicio, bloque.horaFin),
    0,
  );

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
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <PeriodoCursoSeccionPicker
            asForm={false}
            autoSubmit={false}
            layout="inline"
            periodos={periodos.map((p) => ({
              id: p.id,
              label: p.nombre,
              badge: p.estado,
            }))}
            asignaturas={secciones.map((s) => ({
              id: s.id,
              label: s.nombre,
              badge: s.codigo,
            }))}
            selected={{
              periodoId: selectedPeriodoId,
              asignaturaId: asignaturaSelId,
            }}
            placeholders={{ asignatura: "Buscar seccion..." }}
          />

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

      {asignaturaSelId && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(18rem,1fr)]">
          <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
            <WeeklyScheduleGrid
              bloques={bloques}
              titulo={seccionSel ? `${seccionSel.nombre}${seccionSel.periodoNombre ? ` — ${seccionSel.periodoNombre}` : ""}` : undefined}
            />
            {bloques.length === 0 && (
              <p className="mt-4 text-sm text-text-secondary dark:text-gray-400">
                Esta sección no tiene bloques horarios definidos.{" "}
                <Link href="/admin/asignaturas" className="text-primary underline-offset-2 hover:underline dark:text-primary-light">
                  Ir a Secciones
                </Link>{" "}
                para agregarlos.
              </p>
            )}
          </article>

          <aside className="space-y-4">
            <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                Resumen semanal
              </p>
              <h2 className="mt-1 text-lg font-bold text-text-primary dark:text-white">
                {bloques.length} bloque{bloques.length !== 1 ? "s" : ""}
              </h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 dark:bg-gray-800/60">
                  <span className="flex items-center gap-2 text-text-secondary dark:text-gray-400">
                    <Clock className="h-4 w-4" />
                    Horas/semana
                  </span>
                  <strong className="text-text-primary dark:text-white">{horasSemanales.toFixed(1)}</strong>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 dark:bg-gray-800/60">
                  <span className="flex items-center gap-2 text-text-secondary dark:text-gray-400">
                    <Users className="h-4 w-4" />
                    Docente
                  </span>
                  <strong className="truncate text-right text-text-primary dark:text-white">
                    {seccionSel?.docenteNombre ? `${seccionSel.docenteNombre} ${seccionSel.docenteApellido ?? ""}`.trim() : "Sin asignar"}
                  </strong>
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                <Link
                  href={`/admin/clases?periodoId=${selectedPeriodoId}&asignaturaId=${asignaturaSelId}`}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
                >
                  <CalendarDays className="h-4 w-4" />
                  Gestionar clases
                </Link>
                <Link
                  href={`/admin/secciones/${asignaturaSelId}`}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-primary/25 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 dark:border-primary/40 dark:text-primary-light"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ficha de sección
                </Link>
              </div>
            </article>

            <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                Bloques configurados
              </p>
              <div className="mt-3 space-y-2">
                {bloquesOrdenados.length > 0 ? (
                  bloquesOrdenados.map((bloque) => (
                    <div key={bloque.id} className="rounded-xl border border-gray-100 bg-gray-50/70 px-3 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-800/60">
                      <p className="font-semibold text-text-primary dark:text-white">
                        {DIAS[bloque.diaSemana] ?? `Día ${bloque.diaSemana + 1}`}
                      </p>
                      <p className="mt-0.5 text-xs text-text-secondary dark:text-gray-400">
                        {bloque.horaInicio}–{bloque.horaFin}
                      </p>
                      {bloque.sala ? (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-text-muted dark:text-gray-500">
                          <MapPin className="h-3.5 w-3.5" />
                          {bloque.sala}
                        </p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="rounded-xl border border-dashed border-gray-200 px-3 py-4 text-sm text-text-secondary dark:border-gray-700 dark:text-gray-400">
                    Sin bloques. Configúralos en Secciones para que Clases pueda autogenerar sesiones.
                  </p>
                )}
              </div>
            </article>
          </aside>
        </div>
      )}
    </section>
  );
}
