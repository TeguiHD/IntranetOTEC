import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ArrowLeft,
  BookOpen,
  CalendarRange,
  ClipboardCheck,
  ExternalLink,
  GraduationCap,
  Mail,
  PlaySquare,
  ShieldOff,
  UserCog,
} from "lucide-react";

import { obtenerHistorialDocenteAdmin } from "@/actions/docentes-historial";
import { formatearIdentificador } from "@/lib/rut";

export const metadata = { title: "Ficha docente" };

const ESTADO_TONE: Record<string, string> = {
  activo: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
  borrador: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  finalizado: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
  archivado: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
};

const fmtDate = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(
        new Date(`${iso}T00:00:00`),
      )
    : "—";

type PageProps = { params: Promise<{ id: string }> };

export default async function DocenteFichaPage({ params }: PageProps) {
  const { id } = await params;
  const data = await obtenerHistorialDocenteAdmin(id);
  if (!data) notFound();

  const { docente, asignaturas, totales } = data;
  const nombreCompleto = `${docente.nombre} ${docente.apellido}`.trim();

  // agrupar por periodo
  const porPeriodo = new Map<string, typeof asignaturas>();
  for (const a of asignaturas) {
    const key = `${a.periodoCodigo} · ${a.periodoNombre}`;
    const arr = porPeriodo.get(key) ?? [];
    arr.push(a);
    porPeriodo.set(key, arr);
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/admin/docentes"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 px-3 text-sm font-semibold text-text-secondary transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al listado
        </Link>
      </div>

      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light">
              <UserCog className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
                {nombreCompleto}
              </h1>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary dark:text-gray-400">
                {docente.rut ? <span>RUT {formatearIdentificador(docente.rut)}</span> : null}
                {docente.email ? (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {docente.email}
                  </span>
                ) : null}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {docente.eliminadoAt ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-200">
                <ShieldOff className="h-3.5 w-3.5" />
                Baja definitiva
              </span>
            ) : docente.activo ? (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                Activo
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                Inactivo
              </span>
            )}
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60">
            <dt className="text-[10px] uppercase text-text-secondary dark:text-gray-400">Periodos</dt>
            <dd className="mt-0.5 text-xl font-bold text-text-primary dark:text-white">
              {totales.periodosImpartidos}
            </dd>
          </div>
          <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60">
            <dt className="text-[10px] uppercase text-text-secondary dark:text-gray-400">Cursos</dt>
            <dd className="mt-0.5 text-xl font-bold text-text-primary dark:text-white">
              {totales.cursosImpartidos}
            </dd>
          </div>
          <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60">
            <dt className="text-[10px] uppercase text-text-secondary dark:text-gray-400">
              Secciones (total)
            </dt>
            <dd className="mt-0.5 text-xl font-bold text-text-primary dark:text-white">
              {totales.secciones}
            </dd>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/40">
            <dt className="text-[10px] uppercase text-emerald-800 dark:text-emerald-200">
              Activas
            </dt>
            <dd className="mt-0.5 text-xl font-bold text-emerald-700 dark:text-emerald-200">
              {totales.seccionesActivas}
            </dd>
          </div>
          <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60">
            <dt className="text-[10px] uppercase text-text-secondary dark:text-gray-400">
              Matrículas
            </dt>
            <dd className="mt-0.5 text-xl font-bold text-text-primary dark:text-white">
              {totales.matriculasHistoricas}
            </dd>
          </div>
          <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60">
            <dt className="text-[10px] uppercase text-text-secondary dark:text-gray-400">Clases</dt>
            <dd className="mt-0.5 text-xl font-bold text-text-primary dark:text-white">
              {totales.clasesHistoricas}
            </dd>
          </div>
        </dl>
      </article>

      {asignaturas.length === 0 ? (
        <article className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-text-secondary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
          Este docente aún no tiene asignaciones registradas.
        </article>
      ) : (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
            Historial de secciones impartidas
          </h2>

          {Array.from(porPeriodo.entries()).map(([periodoLabel, items]) => (
            <article
              key={periodoLabel}
              className="rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-3 dark:border-gray-800">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                  <CalendarRange className="h-3.5 w-3.5" />
                  {periodoLabel}
                </p>
                <span className="text-[11px] text-text-muted dark:text-gray-500">
                  {items.length} sección{items.length === 1 ? "" : "es"}
                </span>
              </header>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((a) => {
                  const estadoTone = ESTADO_TONE[a.estado ?? "borrador"] ?? ESTADO_TONE.borrador;
                  const deleted = a.asignaturaEliminada || a.periodoEliminado;
                  return (
                    <li
                      key={a.asignaturaId}
                      className={`px-5 py-3 ${deleted ? "opacity-60" : ""}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-text-primary dark:text-gray-100">
                              {a.asignaturaNombre}
                            </p>
                            <span
                              className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold uppercase ${estadoTone}`}
                            >
                              {a.estado ?? "borrador"}
                            </span>
                            {deleted ? (
                              <span className="inline-flex h-5 items-center rounded-full bg-red-100 px-2 text-[10px] font-semibold uppercase text-red-700 dark:bg-red-900/40 dark:text-red-200">
                                {a.periodoEliminado ? "periodo eliminado" : "eliminada"}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-[11px] text-text-secondary dark:text-gray-400">
                            <BookOpen className="mr-1 inline h-3 w-3" />
                            {a.cursoNombre}
                            {a.cursoCodigo ? ` · ${a.cursoCodigo}` : ""} · Turno {a.turno} ·{" "}
                            {fmtDate(a.fechaInicio)} → {fmtDate(a.fechaFin)}
                          </p>
                          <p className="mt-1 inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-muted dark:text-gray-500">
                            <span className="inline-flex items-center gap-1">
                              <GraduationCap className="h-3 w-3" />
                              {a.totalMatriculas} matrícula{a.totalMatriculas === 1 ? "" : "s"}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <PlaySquare className="h-3 w-3" />
                              {a.totalClases} clase{a.totalClases === 1 ? "" : "s"}
                            </span>
                          </p>
                        </div>
                        {!deleted ? (
                          <Link
                            href={`/admin/secciones/${a.asignaturaId}`}
                            className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-gray-200 px-3 text-xs font-semibold text-text-secondary transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Ficha
                          </Link>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </article>
          ))}
        </div>
      )}

      <aside className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 text-xs text-text-secondary dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-400">
        <p className="inline-flex items-center gap-1.5 font-semibold">
          <ClipboardCheck className="h-3.5 w-3.5" />
          Historial completo
        </p>
        <p className="mt-1 leading-relaxed">
          Incluye secciones de periodos eliminados (con etiqueta visual). Las secciones marcadas
          como eliminadas no pueden abrirse, pero quedan en el registro académico del docente.
        </p>
      </aside>
    </section>
  );
}
