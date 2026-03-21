import { listarNotasAlumno } from "@/actions/alumno-notas";

const NOTA_COLOR = (nota: string) =>
  Number(nota) >= 4.0 ? "text-success" : "text-danger";

function formatFecha(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value + "T12:00:00");
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export const metadata = {
  title: "Mis Notas",
};

export default async function AlumnoNotasPage() {
  const notas = await listarNotasAlumno();

  // Group by asignatura
  const grouped = new Map<string, { nombre: string; items: typeof notas }>();
  for (const nota of notas) {
    const existing = grouped.get(nota.asignaturaId);
    if (existing) {
      existing.items.push(nota);
    } else {
      grouped.set(nota.asignaturaId, { nombre: nota.asignaturaNombre, items: [nota] });
    }
  }

  // Calculate average
  const allNotes = notas.map((n) => Number(n.nota)).filter(Number.isFinite);
  const promedio = allNotes.length > 0 ? allNotes.reduce((a, b) => a + b, 0) / allNotes.length : null;

  return (
    <section className="space-y-5">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark p-5 shadow-lg shadow-primary/15 sm:p-6">
        <h1 className="text-xl font-bold uppercase text-white sm:text-2xl">Mis Notas</h1>
        <p className="mt-1 text-sm text-white/80">
          Revisa tus calificaciones registradas por los docentes.
        </p>
      </div>

      {/* Summary */}
      {promedio !== null && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-gray-100 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
            <p className="text-2xl font-bold text-primary">{notas.length}</p>
            <p className="text-xs text-text-secondary dark:text-gray-400">Notas Totales</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
            <p className={`text-2xl font-bold ${promedio >= 4.0 ? "text-success" : "text-danger"}`}>
              {promedio.toFixed(1)}
            </p>
            <p className="text-xs text-text-secondary dark:text-gray-400">Promedio General</p>
          </div>
        </div>
      )}

      {notas.length === 0 ? (
        <article className="rounded-2xl border border-gray-200/80 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-text-secondary dark:text-gray-400">
            Aún no tienes notas registradas.
          </p>
        </article>
      ) : (
        Array.from(grouped.entries()).map(([asigId, group]) => {
          const groupNotes = group.items.map((n) => Number(n.nota)).filter(Number.isFinite);
          const groupAvg = groupNotes.length > 0 ? groupNotes.reduce((a, b) => a + b, 0) / groupNotes.length : null;

          return (
            <article key={asigId} className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
                    {group.nombre}
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
                    {group.items.length} nota{group.items.length !== 1 ? "s" : ""}
                  </p>
                </div>
                {groupAvg !== null && (
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${groupAvg >= 4.0 ? "text-success" : "text-danger"}`}>
                      {groupAvg.toFixed(1)}
                    </p>
                    <p className="text-xs text-text-secondary dark:text-gray-400">Promedio</p>
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-2">
                {group.items.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-gray-800/50"
                  >
                    <div>
                      <p className="text-sm text-text-secondary dark:text-gray-400">
                        {formatFecha(n.fechaRegistro)}
                      </p>
                    </div>
                    <span className={`text-lg font-bold ${NOTA_COLOR(n.nota)}`}>{n.nota}</span>
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
