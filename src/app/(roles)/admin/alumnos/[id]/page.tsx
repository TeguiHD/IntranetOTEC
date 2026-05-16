import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ArrowLeft,
  Award,
  BookOpen,
  CalendarRange,
  ClipboardCheck,
  ExternalLink,
  GraduationCap,
  Mail,
  PencilLine,
  ShieldOff,
  UserCog,
  Wallet,
} from "lucide-react";

import { obtenerHistorialAlumnoAdmin } from "@/actions/alumno-historial";
import { formatearIdentificador } from "@/lib/rut";

export const metadata = { title: "Ficha alumno" };

const ESTADO_TONE: Record<string, string> = {
  activo: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
  borrador: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  finalizado: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
  archivado: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
};
const PAGO_TONE: Record<string, string> = {
  pagado: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
  pendiente: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  mora: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200",
};

const fmtDate = (v: Date | null) =>
  v
    ? new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(v)
    : "—";

type PageProps = { params: Promise<{ id: string }> };

export default async function AlumnoFichaPage({ params }: PageProps) {
  const { id } = await params;
  const data = await obtenerHistorialAlumnoAdmin(id);
  if (!data) notFound();

  const { alumno, matriculas, totales } = data;
  const nombre = `${alumno.nombre} ${alumno.apellido}`.trim();

  const porPeriodo = new Map<string, typeof matriculas>();
  for (const m of matriculas) {
    const k = `${m.periodoCodigo} · ${m.periodoNombre}`;
    const arr = porPeriodo.get(k) ?? [];
    arr.push(m);
    porPeriodo.set(k, arr);
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/admin/alumnos"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 px-3 text-sm font-semibold text-text-secondary transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
      </div>

      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light">
              <GraduationCap className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
                {nombre}
              </h1>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary dark:text-gray-400">
                {alumno.rut ? <span>RUT {formatearIdentificador(alumno.rut)}</span> : null}
                {alumno.email ? (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {alumno.email}
                  </span>
                ) : null}
              </p>
            </div>
          </div>
          {alumno.eliminadoAt ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-200">
              <ShieldOff className="h-3.5 w-3.5" />
              Baja definitiva
            </span>
          ) : alumno.activo ? (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
              Activo
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              Inactivo
            </span>
          )}
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Matrículas" value={totales.matriculas} />
          <Stat label="Activas" value={totales.matriculasActivas} tone="emerald" />
          <Stat label="Cursos distintos" value={totales.cursosDistintos} />
          <Stat label="Periodos" value={totales.periodosDistintos} />
          <Stat label="Certificados" value={totales.certificados} />
        </dl>
      </article>

      {matriculas.length === 0 ? (
        <article className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-text-secondary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
          Este alumno no tiene matrículas registradas.
        </article>
      ) : (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
            Cursos en los que está inscrito
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
                  {items.length} matrícula{items.length === 1 ? "" : "s"}
                </span>
              </header>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((m) => {
                  const estadoTone = ESTADO_TONE[m.estadoAsignatura ?? "borrador"] ?? ESTADO_TONE.borrador;
                  const pagoTone = PAGO_TONE[m.estadoPago ?? "pendiente"] ?? PAGO_TONE.pendiente;
                  const deleted = m.asignaturaEliminada || m.periodoEliminado;
                  return (
                    <li
                      key={m.matriculaId}
                      className={`px-5 py-3 ${deleted ? "opacity-60" : ""}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-text-primary dark:text-gray-100">
                              {m.cursoNombre}
                            </p>
                            <span className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold uppercase ${estadoTone}`}>
                              {m.estadoAsignatura ?? "borrador"}
                            </span>
                            {!m.matriculaActiva ? (
                              <span className="inline-flex h-5 items-center rounded-full bg-gray-200 px-2 text-[10px] font-semibold uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                inactiva
                              </span>
                            ) : null}
                            {deleted ? (
                              <span className="inline-flex h-5 items-center rounded-full bg-red-100 px-2 text-[10px] font-semibold uppercase text-red-700 dark:bg-red-900/40 dark:text-red-200">
                                {m.periodoEliminado ? "periodo eliminado" : "eliminada"}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-[11px] text-text-secondary dark:text-gray-400">
                            <BookOpen className="mr-1 inline h-3 w-3" />
                            Sección: {m.asignaturaNombre} · Turno {m.turno}
                            {m.docenteNombre ? ` · ${m.docenteNombre}` : " · sin docente"}
                          </p>
                          <p className="mt-1 inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-muted dark:text-gray-500">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${pagoTone}`}>
                              <Wallet className="h-3 w-3" />
                              {m.estadoPago ?? "—"}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <ClipboardCheck className="h-3 w-3" />
                              asistencia {m.asistenciaPct == null ? "—" : `${m.asistenciaPct}%`}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <PencilLine className="h-3 w-3" />
                              promedio {m.promedioNotas == null ? "—" : m.promedioNotas.toFixed(1)}
                            </span>
                            {m.totalCertificados > 0 ? (
                              <span className="inline-flex items-center gap-1 text-primary">
                                <Award className="h-3 w-3" />
                                {m.totalCertificados} certificado{m.totalCertificados === 1 ? "" : "s"}
                              </span>
                            ) : null}
                            <span>· inscrito {fmtDate(m.fechaInscripcion)}</span>
                          </p>
                        </div>
                        {!deleted ? (
                          <Link
                            href={`/admin/secciones/${m.asignaturaId}`}
                            className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-gray-200 px-3 text-xs font-semibold text-text-secondary transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Ver sección
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
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "emerald" }) {
  return (
    <div
      className={`rounded-xl p-3 ${
        tone === "emerald"
          ? "bg-emerald-50 dark:bg-emerald-950/40"
          : "bg-gray-50 dark:bg-gray-800/60"
      }`}
    >
      <p
        className={`text-[10px] uppercase ${
          tone === "emerald"
            ? "text-emerald-800 dark:text-emerald-200"
            : "text-text-secondary dark:text-gray-400"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-0.5 text-xl font-bold ${
          tone === "emerald"
            ? "text-emerald-700 dark:text-emerald-200"
            : "text-text-primary dark:text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
