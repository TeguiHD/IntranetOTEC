import { and, asc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";

import { listarPeriodosDashboard } from "@/actions/admin-metricas";
import { PeriodoCursoSeccionPicker } from "@/components/shared/PeriodoCursoSeccionPicker";
import { getDb } from "@/db";
import {
  asignaturas,
  asistencia,
  clases,
  evaluaciones,
  matriculas,
  usuarios,
} from "@/db/schema";

import { AdminAgendaBoard } from "./AdminAgendaBoard";

type PageProps = {
  searchParams?: Promise<{
    periodoId?: string;
    asignaturaId?: string;
    docenteId?: string;
    mes?: string;
    anio?: string;
    fecha?: string;
  }>;
};

type AgendaEvent = {
  id: string;
  tipo: "clase" | "evaluacion";
  titulo: string;
  asignaturaNombre: string;
  fecha: string;
  hora?: string | null;
  color: string;
};

type AgendaClase = {
  id: string;
  asignaturaId: string;
  asignaturaNombre: string;
  titulo: string;
  numeroSesion: number | null;
  fecha: string;
  horaInicio: string | null;
  horaFin: string | null;
  publicada: boolean;
  docenteNombre: string | null;
  docenteApellido: string | null;
  alumnosMatriculados: number;
  asistenciaPorcentaje: number | null;
  evaluacionesDelDia: number;
};

const COLOR_PALETTE = [
  "#8B3A9E",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EC4899",
  "#6366F1",
  "#06B6D4",
  "#0EA5E9",
];

const MONTH_OPTIONS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const parseNumberInRange = (
  value: string | undefined,
  min: number,
  max: number,
  fallback: number,
): number => {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return fallback;
  }

  return parsed;
};

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

const toTime = (date: Date): string =>
  new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

const isIsoDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);

export const metadata = {
  title: "Agenda Academica",
};

export default async function AdminAgendaPage({ searchParams }: PageProps) {
  const params = await (searchParams
    ?? Promise.resolve({
      periodoId: undefined,
      asignaturaId: undefined,
      docenteId: undefined,
      mes: undefined,
      anio: undefined,
      fecha: undefined,
    }));

  const db = getDb();
  const today = new Date();

  const mes = parseNumberInRange(params.mes, 1, 12, today.getMonth() + 1);
  const anio = parseNumberInRange(params.anio, 2000, 2100, today.getFullYear());
  const yearOptions = Array.from(
    new Set(
      Array.from({ length: 11 }, (_, index) => today.getFullYear() - 5 + index)
        .concat(anio)
        .filter((year) => year >= 2000 && year <= 2100),
    ),
  ).sort((a, b) => a - b);

  const monthStart = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const monthEnd = `${anio}-${String(mes).padStart(2, "0")}-${String(new Date(anio, mes, 0).getDate()).padStart(2, "0")}`;

  const monthStartTimestamp = new Date(Date.UTC(anio, mes - 1, 1, 0, 0, 0));
  const monthEndTimestamp = new Date(Date.UTC(anio, mes, 0, 23, 59, 59));

  const periodos = await listarPeriodosDashboard();

  const requestedPeriodoId =
    typeof params.periodoId === "string" ? params.periodoId.trim() : "";
  const defaultPeriodoId =
    periodos.find((periodo) => periodo.estado === "activo")?.id
    ?? periodos[0]?.id
    ?? "";
  const selectedPeriodoId =
    requestedPeriodoId && periodos.some((periodo) => periodo.id === requestedPeriodoId)
      ? requestedPeriodoId
      : defaultPeriodoId;

  const asignaturasRows = await db
    .select({
      id: asignaturas.id,
      nombre: asignaturas.nombre,
      codigo: asignaturas.codigo,
      docenteId: asignaturas.docenteId,
      docenteNombre: usuarios.nombre,
      docenteApellido: usuarios.apellido,
    })
    .from(asignaturas)
    .leftJoin(usuarios, eq(asignaturas.docenteId, usuarios.id))
    .where(
      and(
        isNull(asignaturas.eliminadoAt),
        selectedPeriodoId ? eq(asignaturas.periodoId, selectedPeriodoId) : undefined,
      ),
    )
    .orderBy(asc(asignaturas.nombre));

  const requestedAsignaturaId =
    typeof params.asignaturaId === "string" ? params.asignaturaId.trim() : "";
  const selectedAsignaturaId =
    requestedAsignaturaId && asignaturasRows.some((item) => item.id === requestedAsignaturaId)
      ? requestedAsignaturaId
      : "";

  const docentes = Array.from(
    new Map(
      asignaturasRows
        .filter((item) => item.docenteId)
        .map((item) => [
          item.docenteId as string,
          {
            id: item.docenteId as string,
            nombre: `${item.docenteNombre ?? ""} ${item.docenteApellido ?? ""}`.trim() || "Sin nombre",
          },
        ]),
    ).values(),
  ).sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }));

  const requestedDocenteId =
    typeof params.docenteId === "string" ? params.docenteId.trim() : "";
  const selectedDocenteId =
    requestedDocenteId && docentes.some((docente) => docente.id === requestedDocenteId)
      ? requestedDocenteId
      : "";

  const classRows = await db
    .select({
      id: clases.id,
      asignaturaId: clases.asignaturaId,
      asignaturaNombre: asignaturas.nombre,
      titulo: clases.titulo,
      numeroSesion: clases.numeroSesion,
      fecha: clases.fecha,
      horaInicio: clases.horaInicio,
      horaFin: clases.horaFin,
      publicada: clases.publicada,
      docenteNombre: usuarios.nombre,
      docenteApellido: usuarios.apellido,
    })
    .from(clases)
    .innerJoin(asignaturas, eq(clases.asignaturaId, asignaturas.id))
    .leftJoin(usuarios, eq(asignaturas.docenteId, usuarios.id))
    .where(
      and(
        isNull(clases.eliminadoAt),
        isNull(asignaturas.eliminadoAt),
        gte(clases.fecha, monthStart),
        lte(clases.fecha, monthEnd),
        selectedPeriodoId ? eq(asignaturas.periodoId, selectedPeriodoId) : undefined,
        selectedAsignaturaId ? eq(clases.asignaturaId, selectedAsignaturaId) : undefined,
        selectedDocenteId ? eq(asignaturas.docenteId, selectedDocenteId) : undefined,
      ),
    )
    .orderBy(asc(clases.fecha), asc(clases.horaInicio), asc(clases.numeroSesion));

  const evaluationRows = await db
    .select({
      id: evaluaciones.id,
      asignaturaId: evaluaciones.asignaturaId,
      asignaturaNombre: asignaturas.nombre,
      titulo: evaluaciones.titulo,
      fechaLimite: evaluaciones.fechaLimite,
    })
    .from(evaluaciones)
    .innerJoin(asignaturas, eq(evaluaciones.asignaturaId, asignaturas.id))
    .where(
      and(
        isNull(evaluaciones.eliminadoAt),
        isNull(asignaturas.eliminadoAt),
        gte(evaluaciones.fechaLimite, monthStartTimestamp),
        lte(evaluaciones.fechaLimite, monthEndTimestamp),
        selectedPeriodoId ? eq(asignaturas.periodoId, selectedPeriodoId) : undefined,
        selectedAsignaturaId ? eq(evaluaciones.asignaturaId, selectedAsignaturaId) : undefined,
        selectedDocenteId ? eq(asignaturas.docenteId, selectedDocenteId) : undefined,
      ),
    )
    .orderBy(asc(evaluaciones.fechaLimite));

  const asignaturaIds = Array.from(
    new Set(classRows.map((row) => row.asignaturaId)),
  );
  const claseIds = classRows.map((row) => row.id);

  const enrollmentRows = asignaturaIds.length > 0
    ? await db
        .select({
          asignaturaId: matriculas.asignaturaId,
          total: sql<number>`COUNT(*)`.mapWith(Number),
        })
        .from(matriculas)
        .where(
          and(
            inArray(matriculas.asignaturaId, asignaturaIds),
            eq(matriculas.activa, true),
            isNull(matriculas.eliminadoAt),
          ),
        )
        .groupBy(matriculas.asignaturaId)
    : [];

  const attendanceRows = claseIds.length > 0
    ? await db
        .select({
          claseId: asistencia.claseId,
          presentes: sql<number>`COUNT(*) FILTER (WHERE ${asistencia.estado} IN ('presente', 'tardanza', 'justificado'))`.mapWith(Number),
        })
        .from(asistencia)
        .where(inArray(asistencia.claseId, claseIds))
        .groupBy(asistencia.claseId)
    : [];

  const enrollmentMap = new Map(
    enrollmentRows.map((row) => [row.asignaturaId, Number(row.total ?? 0)]),
  );
  const attendanceMap = new Map(
    attendanceRows.map((row) => [row.claseId, Number(row.presentes ?? 0)]),
  );

  const evaluationsByDayMap = new Map<string, number>();
  for (const row of evaluationRows) {
    if (!row.fechaLimite) {
      continue;
    }

    const fecha = toIsoDate(new Date(row.fechaLimite));
    const key = `${row.asignaturaId}|${fecha}`;
    evaluationsByDayMap.set(key, (evaluationsByDayMap.get(key) ?? 0) + 1);
  }

  const colorMap = new Map<string, string>();
  const allAsigIds = Array.from(
    new Set([
      ...classRows.map((row) => row.asignaturaId),
      ...evaluationRows.map((row) => row.asignaturaId),
    ]),
  );

  allAsigIds.forEach((asigId, index) => {
    colorMap.set(asigId, COLOR_PALETTE[index % COLOR_PALETTE.length] ?? "#8B3A9E");
  });

  const eventos: AgendaEvent[] = [
    ...classRows.map((row) => ({
      id: row.id,
      tipo: "clase" as const,
      titulo: row.titulo,
      asignaturaNombre: row.asignaturaNombre,
      fecha: row.fecha,
      hora: row.horaInicio,
      color: colorMap.get(row.asignaturaId) ?? "#8B3A9E",
    })),
    ...evaluationRows
      .filter((row) => row.fechaLimite)
      .map((row) => ({
        id: row.id,
        tipo: "evaluacion" as const,
        titulo: row.titulo,
        asignaturaNombre: row.asignaturaNombre,
        fecha: toIsoDate(new Date(row.fechaLimite as Date)),
        hora: toTime(new Date(row.fechaLimite as Date)),
        color: colorMap.get(row.asignaturaId) ?? "#EF4444",
      })),
  ].sort((a, b) => {
    const dateDiff = a.fecha.localeCompare(b.fecha);
    if (dateDiff !== 0) {
      return dateDiff;
    }

    return (a.hora ?? "99:99").localeCompare(b.hora ?? "99:99");
  });

  const clasesAgenda: AgendaClase[] = classRows.map((row) => {
    const totalAlumnos = enrollmentMap.get(row.asignaturaId) ?? 0;
    const presentes = attendanceMap.get(row.id) ?? 0;
    const asistenciaPorcentaje =
      totalAlumnos > 0
        ? Math.round((presentes / totalAlumnos) * 100)
        : null;

    return {
      id: row.id,
      asignaturaId: row.asignaturaId,
      asignaturaNombre: row.asignaturaNombre,
      titulo: row.titulo,
      numeroSesion: row.numeroSesion,
      fecha: row.fecha,
      horaInicio: row.horaInicio,
      horaFin: row.horaFin,
      publicada: Boolean(row.publicada),
      docenteNombre: row.docenteNombre,
      docenteApellido: row.docenteApellido,
      alumnosMatriculados: totalAlumnos,
      asistenciaPorcentaje,
      evaluacionesDelDia: evaluationsByDayMap.get(`${row.asignaturaId}|${row.fecha}`) ?? 0,
    };
  });

  const requestedFecha =
    typeof params.fecha === "string" && isIsoDate(params.fecha)
      ? params.fecha
      : "";

  const todayIso = toIsoDate(today);
  const fechaInicial =
    requestedFecha && requestedFecha >= monthStart && requestedFecha <= monthEnd
      ? requestedFecha
      : todayIso >= monthStart && todayIso <= monthEnd
        ? todayIso
        : clasesAgenda[0]?.fecha
          ?? eventos[0]?.fecha
          ?? monthStart;

  const clasesPublicadas = clasesAgenda.filter((clase) => clase.publicada).length;

  return (
    <section className="space-y-5">
      <header className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark p-5 text-white shadow-lg shadow-primary/15 sm:p-6">
        <h1 className="text-xl font-bold uppercase sm:text-2xl">Agenda academica</h1>
        <p className="mt-1 text-sm text-white/85">
          Vista operacional diaria para administrar clases, responsables, alumnos y estado academico.
        </p>
      </header>

      <article className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
        <form method="GET" className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px_220px_auto]">
          <PeriodoCursoSeccionPicker
            asForm={false}
            autoSubmit={false}
            layout="stack"
            periodos={periodos.map((periodo) => ({
              id: periodo.id,
              label: periodo.nombre,
              badge: periodo.estado,
            }))}
            asignaturas={asignaturasRows.map((item) => ({
              id: item.id,
              label: item.nombre,
              badge: item.codigo,
            }))}
            selected={{
              periodoId: selectedPeriodoId,
              asignaturaId: selectedAsignaturaId,
            }}
            labels={{ asignatura: "Asignatura" }}
            emptyLabels={{ asignatura: "Todas las asignaturas" }}
          />

          <div className="space-y-1.5">
            <label htmlFor="agenda-docente" className="block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
              Docente
            </label>
            <select
              id="agenda-docente"
              name="docenteId"
              defaultValue={selectedDocenteId}
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="">Todos los docentes</option>
              {docentes.map((docente) => (
                <option key={docente.id} value={docente.id}>
                  {docente.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label htmlFor="agenda-mes" className="block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                Mes
              </label>
              <select
                id="agenda-mes"
                name="mes"
                defaultValue={mes}
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                {MONTH_OPTIONS.map((month, index) => (
                  <option key={month} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="agenda-anio" className="block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                Año
              </label>
              <select
                id="agenda-anio"
                name="anio"
                defaultValue={anio}
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="h-11 w-full rounded-xl bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
            >
              Aplicar
            </button>
          </div>
        </form>
      </article>

      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary dark:text-gray-400">Clases del mes</p>
          <p className="mt-1 text-2xl font-bold text-text-primary dark:text-white">{clasesAgenda.length}</p>
        </article>
        <article className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary dark:text-gray-400">Clases publicadas</p>
          <p className="mt-1 text-2xl font-bold text-success">{clasesPublicadas}</p>
        </article>
        <article className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary dark:text-gray-400">Evaluaciones del mes</p>
          <p className="mt-1 text-2xl font-bold text-secondary">{evaluationRows.length}</p>
        </article>
      </div>

      <AdminAgendaBoard
        eventos={eventos}
        clases={clasesAgenda}
        mesInicial={mes}
        anioInicial={anio}
        fechaInicial={fechaInicial}
      />
    </section>
  );
}
