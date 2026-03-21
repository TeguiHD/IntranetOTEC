import { listarNotasAdmin } from "@/actions/admin-notas";
import { formatearRut } from "@/lib/rut";

const NOTA_COLOR = (nota: string) =>
  Number(nota) >= 4.0
    ? "text-success"
    : "text-danger";

function formatFecha(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value + "T12:00:00");
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export const metadata = {
  title: "Notas — Admin",
};

export default async function AdminNotasPage() {
  const notas = await listarNotasAdmin();

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

  return (
    <section className="space-y-5">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark p-5 shadow-lg shadow-primary/15 sm:p-6">
        <h1 className="text-xl font-bold uppercase text-white sm:text-2xl">Notas</h1>
        <p className="mt-1 text-sm text-white/80">
          Registro completo de calificaciones ingresadas por docentes.
        </p>
      </div>

      {notas.length === 0 ? (
        <article className="rounded-2xl border border-gray-200/80 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-text-secondary dark:text-gray-400">
            Aún no hay notas registradas en el sistema.
          </p>
        </article>
      ) : (
        Array.from(grouped.entries()).map(([asigId, group]) => (
          <article key={asigId} className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
            <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
              {group.nombre}
            </h2>
            <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
              {group.items.length} nota{group.items.length !== 1 ? "s" : ""} registrada{group.items.length !== 1 ? "s" : ""}
            </p>

            {/* Mobile: cards */}
            <div className="mt-4 space-y-2 sm:hidden">
              {group.items.map((n) => (
                <div key={n.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-text-primary dark:text-white">
                        {n.alumnoNombre} {n.alumnoApellido}
                      </p>
                      <p className="text-xs text-text-secondary dark:text-gray-400">
                        {n.alumnoRut ? formatearRut(n.alumnoRut) : "-"} · Docente: {n.docenteNombre} {n.docenteApellido}
                      </p>
                    </div>
                    <span className={`text-lg font-bold ${NOTA_COLOR(n.nota)}`}>{n.nota}</span>
                  </div>
                  <p className="mt-1 text-xs text-text-muted dark:text-gray-500">
                    {formatFecha(n.fechaRegistro)}
                  </p>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="mt-4 hidden overflow-x-auto sm:block">
              <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                    <th className="px-3 py-2.5">Alumno</th>
                    <th className="px-3 py-2.5">RUT</th>
                    <th className="px-3 py-2.5">Docente</th>
                    <th className="px-3 py-2.5 text-right">Nota</th>
                    <th className="px-3 py-2.5">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {group.items.map((n) => (
                    <tr key={n.id} className="transition-colors hover:bg-primary/[0.03] dark:hover:bg-primary/5">
                      <td className="px-3 py-3 font-medium text-text-primary dark:text-gray-100">
                        {n.alumnoNombre} {n.alumnoApellido}
                      </td>
                      <td className="px-3 py-3 text-text-secondary dark:text-gray-400">
                        {n.alumnoRut ? formatearRut(n.alumnoRut) : "-"}
                      </td>
                      <td className="px-3 py-3 text-text-secondary dark:text-gray-400">
                        {n.docenteNombre} {n.docenteApellido}
                      </td>
                      <td className={`px-3 py-3 text-right font-bold ${NOTA_COLOR(n.nota)}`}>
                        {n.nota}
                      </td>
                      <td className="px-3 py-3 text-text-secondary dark:text-gray-400">
                        {formatFecha(n.fechaRegistro)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        ))
      )}
    </section>
  );
}
