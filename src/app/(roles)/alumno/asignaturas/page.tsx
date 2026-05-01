import Link from "next/link";

import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FileText,
  UserCog,
} from "lucide-react";

import { obtenerResumenAsistenciaAlumno } from "@/actions/asistencia";
import { obtenerDashboardAlumno } from "@/actions/alumno-dashboard";
import { listarAnunciosAsignatura } from "@/actions/anuncios";
import { listarMaterialPorAsignatura } from "@/actions/material";
import { AnunciosBoard } from "@/components/shared/AnunciosBoard";
import { ChatAsignatura } from "@/components/shared/ChatAsignatura";
import { calcularNotaFinalPonderada } from "@/lib/notas-utils";

export const metadata = {
  title: "Mis Cursos",
};

const COURSE_COLORS = [
  { bg: "from-blue-500 to-blue-600",   icon: "text-blue-100" },
  { bg: "from-violet-500 to-violet-600", icon: "text-violet-100" },
  { bg: "from-emerald-500 to-emerald-600", icon: "text-emerald-100" },
  { bg: "from-amber-500 to-amber-600", icon: "text-amber-100" },
  { bg: "from-pink-500 to-pink-600",   icon: "text-pink-100" },
  { bg: "from-teal-500 to-teal-600",   icon: "text-teal-100" },
  { bg: "from-indigo-500 to-indigo-600", icon: "text-indigo-100" },
  { bg: "from-rose-500 to-rose-600",   icon: "text-rose-100" },
];

function asistenciaColor(pct: number): string {
  if (pct >= 75) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function asistenciaBg(pct: number): string {
  if (pct >= 75) return "bg-emerald-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-red-500";
}

type EstadoCurso = "aprobado" | "reprobado" | "en_curso" | "sin_datos";

function calcularEstadoCurso(
  notaFinal: number | null,
  asistenciaPct: number | null,
  cursoActivo: boolean,
): EstadoCurso {
  if (cursoActivo) return "en_curso";
  if (notaFinal === null || asistenciaPct === null) return "sin_datos";
  return notaFinal >= 4.0 && asistenciaPct >= 75 ? "aprobado" : "reprobado";
}

function formatFecha(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value + "T12:00:00");
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "short", day: "numeric", month: "short",
  }).format(d);
}

export default async function AlumnoAsignaturasPage() {
  let resumenAsistencia: Awaited<ReturnType<typeof obtenerResumenAsistenciaAlumno>> = [];
  let dashboard: Awaited<ReturnType<typeof obtenerDashboardAlumno>> = null;
  const materialesPorAsig = new Map<string, { id: string; nombre: string; tamanioBytes: number | null; claseTitulo: string }[]>();
  const anunciosPorAsig = new Map<string, Awaited<ReturnType<typeof listarAnunciosAsignatura>>>();

  try {
    [resumenAsistencia, dashboard] = await Promise.all([
      obtenerResumenAsistenciaAlumno(),
      obtenerDashboardAlumno(),
    ]);

    const asigIds = resumenAsistencia.map((a) => a.asignaturaId);
    const materialResults = await Promise.all(
      asigIds.map((id) => listarMaterialPorAsignatura(id)),
    );
    asigIds.forEach((id, i) => {
      if (materialResults[i].length > 0) {
        materialesPorAsig.set(id, materialResults[i].map((m) => ({
          id: m.id, nombre: m.nombre, tamanioBytes: m.tamanioBytes, claseTitulo: m.claseTitulo,
        })));
      }
    });

    if (dashboard?.cursos) {
      await Promise.all(
        dashboard.cursos.map(async (curso) => {
          const a = await listarAnunciosAsignatura(curso.asignaturaId);
          if (a.length > 0) anunciosPorAsig.set(curso.asignaturaId, a);
        }),
      );
    }
  } catch {
    return (
      <section className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold uppercase text-text-primary dark:text-white">
            Mis Cursos
          </h1>
        </header>
        <article className="rounded-xl border border-danger/30 bg-danger/5 p-6 dark:border-danger/40 dark:bg-danger/10">
          <p className="text-sm font-medium text-danger">
            No fue posible cargar tus cursos. Intenta recargar la página.
          </p>
        </article>
      </section>
    );
  }

  // Build lookup: asignaturaId → matriculaId (from dashboard.cursos)
  const matriculaPorAsig = new Map<string, string>();
  const estadoCursoPorAsig = new Map<string, string | null>();
  for (const c of dashboard?.cursos ?? []) {
    matriculaPorAsig.set(c.asignaturaId, c.matriculaId);
    estadoCursoPorAsig.set(c.asignaturaId, c.estado ?? null);
  }

  // Fetch nota final ponderada per matricula
  const notasFinalPorMatricula = new Map<string, number | null>();
  if (dashboard?.cursos) {
    await Promise.all(
      dashboard.cursos.map(async (curso) => {
        const result = await calcularNotaFinalPonderada(curso.matriculaId, curso.asignaturaId);
        notasFinalPorMatricula.set(curso.matriculaId, result.notaFinal);
      }),
    );
  }

  // Build lookup: asignaturaId → próxima clase
  const proximaClasePorAsig = new Map<string, { titulo: string; fecha: string; horaInicio: string | null }>();
  for (const c of dashboard?.proximasClases ?? []) {
    if (!proximaClasePorAsig.has(c.asignaturaId)) {
      proximaClasePorAsig.set(c.asignaturaId, {
        titulo: c.titulo,
        fecha: c.fecha,
        horaInicio: c.horaInicio,
      });
    }
  }

  // Build lookup: asignaturaId → docente
  const docentePorAsig = new Map<string, string | null>();
  for (const c of dashboard?.cursos ?? []) {
    docentePorAsig.set(c.asignaturaId, c.docenteNombre ?? null);
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold uppercase text-text-primary dark:text-white">
          Mis Cursos
        </h1>
        <p className="text-sm text-text-secondary dark:text-gray-300">
          {resumenAsistencia.length > 0
            ? `${resumenAsistencia.length} asignatura${resumenAsistencia.length !== 1 ? "s" : ""} matriculada${resumenAsistencia.length !== 1 ? "s" : ""}`
            : "Sin asignaturas matriculadas"}
        </p>
      </header>

      {resumenAsistencia.length === 0 ? (
        <article className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <BookOpen className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
          <p className="mt-3 text-sm font-medium text-text-secondary dark:text-gray-300">
            Aún no tienes asignaturas matriculadas.
          </p>
        </article>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {resumenAsistencia.map((asig, idx) => {
            const color = COURSE_COLORS[idx % COURSE_COLORS.length];
            const pct = asig.total > 0
              ? Math.round((asig.presente / asig.total) * 100)
              : null;
            const proximaClase = proximaClasePorAsig.get(asig.asignaturaId) ?? null;
            const docente = docentePorAsig.get(asig.asignaturaId) ?? null;
            const mats = materialesPorAsig.get(asig.asignaturaId) ?? [];
            const matriculaId = matriculaPorAsig.get(asig.asignaturaId) ?? null;
            const notaFinal = matriculaId !== null ? (notasFinalPorMatricula.get(matriculaId) ?? null) : null;
            const estadoAsig = estadoCursoPorAsig.get(asig.asignaturaId) ?? null;
            const estadoCurso = calcularEstadoCurso(notaFinal, pct, estadoAsig === "activo");

            return (
              <article
                key={asig.asignaturaId}
                className="flex flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                {/* Header con color */}
                <div className={`bg-gradient-to-br ${color.bg} px-5 py-4`}>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-bold leading-snug text-white">
                      {asig.asignaturaNombre}
                    </h2>
                    <BookOpen className={`mt-0.5 h-5 w-5 shrink-0 ${color.icon}`} strokeWidth={1.5} />
                  </div>

                  {docente && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-white/80">
                      <UserCog className="h-3.5 w-3.5" />
                      {docente}
                    </p>
                  )}
                </div>

                {/* Cuerpo */}
                <div className="flex flex-1 flex-col gap-4 p-4">

                  {/* Asistencia */}
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-text-secondary dark:text-gray-400">
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        Asistencia
                      </span>
                      {pct !== null ? (
                        <span className={`text-sm font-bold ${asistenciaColor(pct)}`}>
                          {pct}%
                        </span>
                      ) : (
                        <span className="text-xs text-text-secondary dark:text-gray-500">Sin registros</span>
                      )}
                    </div>
                    {pct !== null && (
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className={`h-full rounded-full transition-all ${asistenciaBg(pct)}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                    <p className="mt-1 text-[11px] text-text-secondary dark:text-gray-500">
                      {asig.presente}P · {asig.ausente}A · {asig.tardanza}T · {asig.justificado}J
                      &nbsp;({asig.total} clases)
                    </p>
                  </div>

                  {/* Nota final y estado */}
                  <div className="flex items-center justify-between gap-2">
                    {notaFinal !== null ? (
                      <span className="text-xs font-semibold text-text-primary dark:text-gray-100">
                        Nota:{" "}
                        <span className="font-bold">{notaFinal.toFixed(1)}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-text-secondary dark:text-gray-500">Sin nota</span>
                    )}
                    {estadoCurso === "aprobado" && (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                        Aprobado
                      </span>
                    )}
                    {estadoCurso === "reprobado" && (
                      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-400">
                        Reprobado
                      </span>
                    )}
                    {estadoCurso === "en_curso" && (
                      <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                        En curso
                      </span>
                    )}
                  </div>

                  {/* Próxima clase */}
                  {proximaClase && (
                    <div className="rounded-xl border border-gray-100 bg-gray-50/70 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/50">
                      <p className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                        <CalendarDays className="h-3 w-3" />
                        Próxima clase
                      </p>
                      <p className="text-xs font-medium text-text-primary dark:text-gray-100">
                        {proximaClase.titulo}
                      </p>
                      <p className="text-[11px] text-text-secondary dark:text-gray-400">
                        {formatFecha(proximaClase.fecha)}
                        {proximaClase.horaInicio
                          ? ` · ${String(proximaClase.horaInicio).slice(0, 5)}`
                          : ""}
                      </p>
                    </div>
                  )}

                  {/* Materiales */}
                  {mats.length > 0 && (
                    <div>
                      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-text-primary dark:text-gray-100">
                        <FileText className="h-3.5 w-3.5" />
                        Material disponible
                      </p>
                      <ul className="space-y-1">
                        {mats.map((m) => (
                          <li key={m.id} className="flex items-center justify-between gap-2 text-xs">
                            <a
                              href={`/api/files/download/${m.id}`}
                              className="truncate text-primary underline hover:opacity-80 dark:text-primary-light"
                              title={`${m.claseTitulo} — ${m.nombre}`}
                            >
                              {m.nombre}
                            </a>
                            <span className="shrink-0 text-text-secondary dark:text-gray-400">
                              {m.tamanioBytes ? `${(m.tamanioBytes / 1024).toFixed(0)} KB` : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="mt-auto flex flex-wrap gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                    <Link
                      href={`/alumno/asistencias?asignaturaId=${asig.asignaturaId}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                    >
                      Ver asistencia
                    </Link>
                    <Link
                      href={`/alumno/notas?asignaturaId=${asig.asignaturaId}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                    >
                      Ver notas
                    </Link>
                  </div>

                  {/* Chat */}
                  <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
                    <ChatAsignatura
                      asignaturaId={asig.asignaturaId}
                      asignaturaNombre={asig.asignaturaNombre}
                    />
                  </div>

                  {/* Anuncios */}
                  {(anunciosPorAsig.get(asig.asignaturaId)?.length ?? 0) > 0 && (
                    <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
                      <AnunciosBoard
                        anuncios={anunciosPorAsig.get(asig.asignaturaId) ?? []}
                        asignaturaId={asig.asignaturaId}
                        puedeEliminar={false}
                      />
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
