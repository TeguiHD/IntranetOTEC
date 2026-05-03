import {
  listarAsistenciasAlumno,
  listarTarjetasAsistenciaAlumno,
} from "@/actions/alumno-asistencias";

const ESTADO_STYLES: Record<string, string> = {
  presente: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  ausente: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  tardanza: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  justificado: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
};

const ESTADO_LABELS: Record<string, string> = {
  presente: "Presente",
  ausente: "Ausente",
  tardanza: "Tardanza",
  justificado: "Justificado",
};

function formatFecha(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value + "T12:00:00");
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export const metadata = {
  title: "Mi Asistencia",
};

export default async function AlumnoAsistenciasPage() {
  const [asistencias, tarjetas] = await Promise.all([
    listarAsistenciasAlumno(),
    listarTarjetasAsistenciaAlumno(),
  ]);

  // Group by asignatura
  const grouped = new Map<string, { nombre: string; items: typeof asistencias }>();
  for (const row of asistencias) {
    const existing = grouped.get(row.asignaturaId);
    if (existing) {
      existing.items.push(row);
    } else {
      grouped.set(row.asignaturaId, { nombre: row.asignaturaNombre, items: [row] });
    }
  }

  // Stats
  const totalPresente = asistencias.filter((r) => r.estado === "presente").length;
  const porcentaje = asistencias.length > 0 ? Math.round((totalPresente / asistencias.length) * 100) : null;

  return (
    <section className="space-y-5">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark p-5 shadow-lg shadow-primary/15 sm:p-6">
        <h1 className="text-xl font-bold uppercase text-white sm:text-2xl">Mi Asistencia</h1>
        <p className="mt-1 text-sm text-white/80">
          Revisa tu registro de asistencia por clase.
        </p>
      </div>

      {/* Summary */}
      {porcentaje !== null && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-100 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
            <p className="text-2xl font-bold text-primary">{asistencias.length}</p>
            <p className="text-xs text-text-secondary dark:text-gray-400">Total Registros</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
            <p className="text-2xl font-bold text-success">{totalPresente}</p>
            <p className="text-xs text-text-secondary dark:text-gray-400">Presente</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
            <p className={`text-2xl font-bold ${porcentaje >= 75 ? "text-success" : porcentaje >= 50 ? "text-amber-600 dark:text-amber-400" : "text-danger"}`}>
              {porcentaje}%
            </p>
            <p className="text-xs text-text-secondary dark:text-gray-400">Asistencia</p>
          </div>
        </div>
      )}

      {tarjetas.length > 0 && (
        <section className="grid gap-4 lg:grid-cols-2">
          {tarjetas.map((tarjeta) => {
            const marcadas = tarjeta.sesiones.filter((s) => s.estado !== null).length;
            return (
              <article key={tarjeta.matriculaId} className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-text-primary dark:text-white">
                      Tarjeta de asistencia
                    </h2>
                    <p className="mt-0.5 text-sm text-text-secondary dark:text-gray-400">
                      {tarjeta.asignaturaNombre}
                    </p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    {marcadas}/8
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {Array.from({ length: 8 }).map((_, index) => {
                    const sesion = tarjeta.sesiones[index];
                    const asistio =
                      sesion?.estado === "presente" ||
                      sesion?.estado === "tardanza" ||
                      sesion?.estado === "justificado";
                    const claseColor = !sesion
                      ? "border-gray-200 bg-gray-50 text-text-muted dark:border-gray-800 dark:bg-gray-800 dark:text-gray-500"
                      : asistio
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : sesion.estado === "ausente"
                          ? "border-red-500 bg-red-500 text-white"
                          : "border-gray-300 bg-white text-text-secondary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400";
                    return (
                      <div
                        key={index}
                        title={sesion ? `${sesion.titulo} - ${ESTADO_LABELS[sesion.estado ?? ""] ?? "Pendiente"}` : "Sin clase programada"}
                        className={`flex aspect-square min-h-14 items-center justify-center rounded-xl border text-sm font-bold shadow-sm ${claseColor}`}
                      >
                        {index + 1}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-text-secondary dark:text-gray-400">
                  <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Asiste</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500" />No asiste</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-gray-300" />Pendiente</span>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {asistencias.length === 0 ? (
        <article className="rounded-2xl border border-gray-200/80 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-text-secondary dark:text-gray-400">
            Aún no tienes registros de asistencia.
          </p>
        </article>
      ) : (
        Array.from(grouped.entries()).map(([asigId, group]) => {
          const gPresente = group.items.filter((r) => r.estado === "presente").length;
          const gPct = group.items.length > 0 ? Math.round((gPresente / group.items.length) * 100) : null;

          return (
            <article key={asigId} className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
                    {group.nombre}
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
                    {group.items.length} registro{group.items.length !== 1 ? "s" : ""}
                  </p>
                </div>
                {gPct !== null && (
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${gPct >= 75 ? "text-success" : gPct >= 50 ? "text-amber-600 dark:text-amber-400" : "text-danger"}`}>
                      {gPct}%
                    </p>
                    <p className="text-xs text-text-secondary dark:text-gray-400">Asistencia</p>
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-2">
                {group.items.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-gray-800/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-text-primary dark:text-white">
                        {row.claseTitulo}
                      </p>
                      <p className="text-xs text-text-secondary dark:text-gray-400">
                        Sesión {row.numeroSesion} · {formatFecha(row.claseFecha)}
                      </p>
                    </div>
                    <span className={`ml-3 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_STYLES[row.estado ?? ""] ?? ""}`}>
                      {ESTADO_LABELS[row.estado ?? ""] ?? row.estado ?? "-"}
                    </span>
                  </div>
                ))}
              </div>
            </article>
          );
        })
      )}
    </section>
  );
}
