import { BookOpen, CalendarDays, CheckCircle2, Users } from "lucide-react";

import { listarHistorialClasesDocente } from "@/actions/docente-calendario";
import { normalizarTextoVisible } from "@/lib/displayText";

export const metadata = { title: "Mis Clases" };

function formatFecha(fecha: string): string {
  const d = new Date(fecha + "T12:00:00");
  return d.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" });
}

function PctBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-text-secondary dark:text-gray-500">—</span>;
  const color =
    pct >= 75 ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950"
    : pct >= 50 ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950"
    : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${color}`}>
      {pct}%
    </span>
  );
}

export default async function DocenteHorarioPage() {
  const historial = await listarHistorialClasesDocente();

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
          Mis Clases
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
          Historial de sesiones realizadas con estadísticas de asistencia.
        </p>
      </header>

      {historial.length === 0 ? (
        <article className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <CalendarDays className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
          <h2 className="mt-3 text-base font-semibold text-text-primary dark:text-white">
            Sin clases registradas
          </h2>
          <p className="mx-auto mt-2 max-w-xs text-sm text-text-secondary dark:text-gray-400">
            Inicia una sesión desde Mis Asignaturas para que aparezca aquí.
          </p>
        </article>
      ) : (
        <div className="space-y-4">
          {historial.map((asig) => (
            <details
              key={asig.asignaturaId}
              className="group rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
              open
            >
              <summary className="flex cursor-pointer select-none items-center gap-3 px-5 py-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <BookOpen className="h-4 w-4 text-primary" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text-primary dark:text-white">
                    {normalizarTextoVisible(asig.asignaturaNombre)}
                  </p>
                  <p className="mt-0.5 text-xs text-text-secondary dark:text-gray-400">
                    {asig.totalClases} sesión{asig.totalClases !== 1 ? "es" : ""} realizad{asig.totalClases !== 1 ? "as" : "a"}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-primary group-open:hidden">Ver</span>
                <span className="hidden shrink-0 text-xs font-semibold text-text-secondary dark:text-gray-400 group-open:inline">Cerrar</span>
              </summary>

              <div className="border-t border-gray-100 dark:border-gray-800">
                {/* Desktop */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                    <thead>
                      <tr className="text-left text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                        <th className="px-5 py-3">Sesión</th>
                        <th className="px-5 py-3">Fecha</th>
                        <th className="px-5 py-3">Horario</th>
                        <th className="px-5 py-3 text-center">
                          <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />Alumnos</span>
                        </th>
                        <th className="px-5 py-3 text-center text-emerald-600 dark:text-emerald-400">P</th>
                        <th className="px-5 py-3 text-center text-red-500 dark:text-red-400">A</th>
                        <th className="px-5 py-3 text-center text-amber-600 dark:text-amber-400">T</th>
                        <th className="px-5 py-3 text-center">% Asist.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                      {asig.clases.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                          <td className="px-5 py-3 font-medium text-text-primary dark:text-white">
                            <span className="flex items-center gap-2">
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                              #{c.numeroSesion}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-text-secondary dark:text-gray-400">
                            {formatFecha(c.fecha)}
                          </td>
                          <td className="px-5 py-3 text-xs text-text-secondary dark:text-gray-400">
                            {c.horaInicio ? `${c.horaInicio}${c.horaFin ? `–${c.horaFin}` : ""}` : "—"}
                            {c.sala ? ` · ${c.sala}` : ""}
                          </td>
                          <td className="px-5 py-3 text-center">{c.totalAlumnos}</td>
                          <td className="px-5 py-3 text-center text-emerald-600 dark:text-emerald-400">{c.presentes}</td>
                          <td className="px-5 py-3 text-center text-red-500 dark:text-red-400">{c.ausentes}</td>
                          <td className="px-5 py-3 text-center text-amber-600 dark:text-amber-400">{c.tardanzas}</td>
                          <td className="px-5 py-3 text-center">
                            <PctBadge pct={c.pctAsistencia} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile */}
                <ul className="divide-y divide-gray-100 md:hidden dark:divide-gray-800">
                  {asig.clases.map((c) => (
                    <li key={c.id} className="flex items-start gap-3 px-5 py-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                        {c.numeroSesion}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text-primary dark:text-white">
                          {formatFecha(c.fecha)}
                          {c.horaInicio && (
                            <span className="ml-2 text-xs text-text-secondary dark:text-gray-400">
                              {c.horaInicio}{c.horaFin ? `–${c.horaFin}` : ""}
                            </span>
                          )}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-emerald-600 dark:text-emerald-400">{c.presentes}P</span>
                          <span className="text-red-500 dark:text-red-400">{c.ausentes}A</span>
                          <span className="text-amber-600 dark:text-amber-400">{c.tardanzas}T</span>
                          <PctBadge pct={c.pctAsistencia} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
