import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Calendar, CheckCircle2, GraduationCap, MessageSquare, User, XCircle } from "lucide-react";

import { obtenerDetalleAlumnoAdmin } from "@/actions/usuarios";
import { formatearRut } from "@/lib/rut";

type AlumnoDetailPageProps = {
  params: Promise<{ alumnoId: string }>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCredential(rut: string | null): string {
  if (!rut) return "-";
  if (rut.startsWith("EXT-")) return rut.replace("EXT-", "Ext: ");
  return formatearRut(rut);
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const ESTADO_ASIG_LABELS: Record<string, string> = {
  borrador: "Borrador",
  activo: "Activo",
  finalizado: "Finalizado",
  archivado: "Archivado",
};

const ESTADO_ASIG_COLORS: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  activo: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  finalizado: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  archivado: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
};

const ESTADO_PAGO_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  mora: "En mora",
  becado: "Becado",
};

const ESTADO_PAGO_COLORS: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  pagado: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  mora: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  becado: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
};

const TIPO_EVAL_LABELS: Record<string, string> = {
  formulario: "Formulario",
  tarea: "Tarea",
  examen: "Examen",
  proyecto: "Proyecto",
};

// ─── Sections ─────────────────────────────────────────────────────────────────

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <header className="flex items-center gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary-light">
          {icon}
        </span>
        <h2 className="text-base font-semibold text-text-primary dark:text-white">{title}</h2>
      </header>
      <div className="p-5">{children}</div>
    </article>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="py-4 text-center text-sm text-text-secondary dark:text-gray-400">{message}</p>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminAlumnoDetailPage({ params }: AlumnoDetailPageProps) {
  const { alumnoId } = await params;
  const result = await obtenerDetalleAlumnoAdmin(alumnoId);

  if (!result.ok) {
    if (result.code === "not_found") notFound();
    return (
      <section className="flex flex-col items-center justify-center py-20 text-center">
        <XCircle className="mb-3 h-12 w-12 text-danger" strokeWidth={1.5} />
        <p className="text-base font-semibold text-text-primary dark:text-white">
          No fue posible cargar el perfil del alumno.
        </p>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">{result.message}</p>
        <Link
          href="/admin/alumnos"
          className="mt-5 inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-primary hover:text-primary dark:border-gray-700 dark:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Alumnos
        </Link>
      </section>
    );
  }

  const { alumno, matriculas, notas, asistencias, observaciones } = result;

  const nombreCompleto = `${alumno.nombre} ${alumno.apellido}`;

  return (
    <section className="space-y-6">
      {/* Back link + heading */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/admin/alumnos"
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-primary dark:text-gray-400 dark:hover:text-primary-light"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Alumnos
          </Link>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            {nombreCompleto}
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Historial completo del alumno
          </p>
        </div>
      </div>

      {/* 1. Personal info */}
      <SectionCard icon={<User className="h-4 w-4" />} title="Información personal">
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "Nombre", value: alumno.nombre },
            { label: "Apellido", value: alumno.apellido },
            { label: "RUT / Credencial", value: formatCredential(alumno.rut) },
            { label: "Correo electrónico", value: alumno.email ?? "-" },
            {
              label: "Estado",
              value: (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    alumno.activo
                      ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                  }`}
                >
                  {alumno.activo ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  {alumno.activo ? "Activo" : "Inactivo"}
                </span>
              ),
            },
            { label: "Fecha de registro", value: formatDate(alumno.fechaCreacion) },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs font-medium uppercase tracking-wide text-text-secondary dark:text-gray-400">
                {label}
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-text-primary dark:text-gray-100">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </SectionCard>

      {/* 2. Matriculas */}
      <SectionCard icon={<GraduationCap className="h-4 w-4" />} title={`Matrículas (${matriculas.length})`}>
        {matriculas.length === 0 ? (
          <EmptyState message="El alumno no tiene matrículas registradas." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                  <th className="pb-2.5 pr-4">Asignatura</th>
                  <th className="pb-2.5 pr-4">Estado curso</th>
                  <th className="pb-2.5 pr-4">Estado pago</th>
                  <th className="pb-2.5 pr-4">Activa</th>
                  <th className="pb-2.5">Fecha matrícula</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {matriculas.map((m) => (
                  <tr key={m.matriculaId} className="transition-colors hover:bg-primary/[0.03] dark:hover:bg-primary/5">
                    <td className="py-2.5 pr-4 font-medium text-text-primary dark:text-gray-100">
                      {m.asignaturaNombre}
                    </td>
                    <td className="py-2.5 pr-4">
                      {m.estadoAsignatura ? (
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTADO_ASIG_COLORS[m.estadoAsignatura] ?? ""}`}>
                          {ESTADO_ASIG_LABELS[m.estadoAsignatura] ?? m.estadoAsignatura}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-2.5 pr-4">
                      {m.estadoPago ? (
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTADO_PAGO_COLORS[m.estadoPago] ?? ""}`}>
                          {ESTADO_PAGO_LABELS[m.estadoPago] ?? m.estadoPago}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-text-secondary dark:text-gray-400">
                      {m.activa ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400 dark:text-gray-600" />
                      )}
                    </td>
                    <td className="py-2.5 text-text-secondary dark:text-gray-400">
                      {formatDate(m.fechaMatricula)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* 3. Notas */}
      <SectionCard icon={<BookOpen className="h-4 w-4" />} title={`Notas (${notas.length})`}>
        {notas.length === 0 ? (
          <EmptyState message="El alumno no tiene notas registradas." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                  <th className="pb-2.5 pr-4">Asignatura</th>
                  <th className="pb-2.5 pr-4">Evaluación</th>
                  <th className="pb-2.5 pr-4">Tipo</th>
                  <th className="pb-2.5 pr-4">Nota</th>
                  <th className="pb-2.5">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {notas.map((n) => (
                  <tr key={n.notaId} className="transition-colors hover:bg-primary/[0.03] dark:hover:bg-primary/5">
                    <td className="py-2.5 pr-4 font-medium text-text-primary dark:text-gray-100">
                      {n.asignaturaNombre}
                    </td>
                    <td className="py-2.5 pr-4 text-text-secondary dark:text-gray-400">
                      {n.evaluacionTitulo}
                    </td>
                    <td className="py-2.5 pr-4 text-text-secondary dark:text-gray-400">
                      {n.tipoEval ? (TIPO_EVAL_LABELS[n.tipoEval] ?? n.tipoEval) : "-"}
                    </td>
                    <td className="py-2.5 pr-4">
                      {n.nota !== null && n.nota !== undefined ? (
                        <span className="font-semibold text-text-primary dark:text-white">
                          {n.nota}
                        </span>
                      ) : (
                        <span className="text-text-secondary dark:text-gray-400">Sin nota</span>
                      )}
                    </td>
                    <td className="py-2.5 text-text-secondary dark:text-gray-400">
                      {formatDate(n.fechaNota)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* 4. Asistencias */}
      <SectionCard icon={<Calendar className="h-4 w-4" />} title="Asistencias por asignatura">
        {asistencias.length === 0 ? (
          <EmptyState message="No se han registrado asistencias para este alumno." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                  <th className="pb-2.5 pr-4">Asignatura</th>
                  <th className="pb-2.5 pr-4 text-center">
                    <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400">
                      Presente
                    </span>
                  </th>
                  <th className="pb-2.5 pr-4 text-center">
                    <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                      Ausente
                    </span>
                  </th>
                  <th className="pb-2.5 pr-4 text-center">
                    <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                      Tardanza
                    </span>
                  </th>
                  <th className="pb-2.5 text-center">
                    <span className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-400">
                      Justificado
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {asistencias.map((a) => {
                  const total = a.presente + a.ausente + a.tardanza + a.justificado;
                  const pct = total > 0 ? Math.round((a.presente / total) * 100) : null;
                  return (
                    <tr key={a.asignaturaId} className="transition-colors hover:bg-primary/[0.03] dark:hover:bg-primary/5">
                      <td className="py-2.5 pr-4 font-medium text-text-primary dark:text-gray-100">
                        {a.asignaturaNombre}
                        {pct !== null && (
                          <span className="ml-2 text-xs text-text-secondary dark:text-gray-400">
                            ({pct}% asistencia)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-center font-semibold text-green-700 dark:text-green-400">
                        {a.presente}
                      </td>
                      <td className="py-2.5 pr-4 text-center font-semibold text-red-600 dark:text-red-400">
                        {a.ausente}
                      </td>
                      <td className="py-2.5 pr-4 text-center font-semibold text-amber-700 dark:text-amber-400">
                        {a.tardanza}
                      </td>
                      <td className="py-2.5 text-center font-semibold text-blue-700 dark:text-blue-400">
                        {a.justificado}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* 5. Observaciones */}
      <SectionCard icon={<MessageSquare className="h-4 w-4" />} title={`Observaciones (${observaciones.length})`}>
        {observaciones.length === 0 ? (
          <EmptyState message="No hay observaciones registradas para este alumno." />
        ) : (
          <ul className="space-y-3">
            {observaciones.map((obs) => (
              <li
                key={obs.observacionId}
                className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/40"
              >
                <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary dark:bg-primary/15 dark:text-primary-light">
                    {obs.asignaturaNombre}
                  </span>
                  <span className="text-xs text-text-secondary dark:text-gray-400">
                    {obs.docenteNombre}
                  </span>
                  <span className="text-xs text-text-secondary dark:text-gray-400">
                    {formatDate(obs.fechaRegistro)}
                  </span>
                </div>
                <p className="text-sm text-text-primary dark:text-gray-100">{obs.observacion}</p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </section>
  );
}
