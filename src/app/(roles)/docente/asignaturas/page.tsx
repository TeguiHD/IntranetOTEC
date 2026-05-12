import { listarResumenAsignaturasDocente } from "@/actions/docente-calendario";
import { obtenerHorarioDocente } from "@/actions/horarios";
import { CalendarioSemanalDocente } from "@/components/docente/CalendarioSemanalDocente";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { normalizarTextoVisible } from "@/lib/displayText";
import { formatearRut } from "@/lib/rut";

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  asistencia_created: { tone: "success", text: "Asistencia registrada correctamente." },
  asistencia_updated: { tone: "success", text: "Asistencia actualizada correctamente." },
  material_uploaded: { tone: "success", text: "Material subido correctamente." },
  material_deleted: { tone: "success", text: "Material eliminado." },
  forbidden: { tone: "error", text: "No autorizado para operar sobre esta asignatura." },
  error: { tone: "error", text: "No fue posible completar la acción solicitada." },
};

const formatRut = (rut: string | null): string =>
  rut ? (rut.startsWith("EXT-") ? `Ext: ${rut.replace(/^EXT-/, "")}` : formatearRut(rut)) : "—";

export const metadata = {
  title: "Mis Asignaturas",
};

export default async function DocenteAsignaturasPage({
  searchParams,
}: {
  searchParams?: Promise<{ state?: string }>;
}) {
  const params = await (searchParams ?? Promise.resolve({} as { state?: string }));
  const [bloques, resumen] = await Promise.all([
    obtenerHorarioDocente(),
    listarResumenAsignaturasDocente(),
  ]);

  return (
    <section className="space-y-8">
      <RouteStateToast state={params.state} map={STATUS_MAP} />

      <div className="space-y-5">
        <header>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Mis Asignaturas
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Toca cualquier bloque para pasar asistencia, subir material o activar pruebas.
          </p>
        </header>

        <CalendarioSemanalDocente bloques={bloques} />
      </div>

      {/* Resumen de alumnos por asignatura */}
      {resumen.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-bold uppercase tracking-wide text-text-primary dark:text-white">
            Mis Alumnos
          </h2>

          {resumen.map((asig) => (
            <details
              key={asig.asignaturaId}
              className="group rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <summary className="flex cursor-pointer select-none items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary dark:text-white">
                    {normalizarTextoVisible(asig.asignaturaNombre)}
                  </p>
                  <p className="mt-0.5 text-xs text-text-secondary dark:text-gray-400">
                    {asig.alumnos.length} alumno{asig.alumnos.length !== 1 ? "s" : ""} · {asig.totalClases} clase{asig.totalClases !== 1 ? "s" : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-primary group-open:hidden">
                  Ver
                </span>
                <span className="shrink-0 text-xs font-semibold text-text-secondary dark:text-gray-400 hidden group-open:inline">
                  Cerrar
                </span>
              </summary>

              <div className="border-t border-gray-100 dark:border-gray-800">
                {asig.alumnos.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-text-secondary dark:text-gray-400">
                    Sin alumnos matriculados.
                  </p>
                ) : (
                  <>
                    {/* Desktop */}
                    <div className="hidden overflow-x-auto md:block">
                      <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                        <thead>
                          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                            <th className="px-5 py-3">Alumno</th>
                            <th className="px-5 py-3">RUT</th>
                            <th className="px-5 py-3 text-center">Presentes</th>
                            <th className="px-5 py-3 text-center">Ausentes</th>
                            <th className="px-5 py-3 text-center">Tardanzas</th>
                            <th className="px-5 py-3 text-center">% Asist.</th>
                            <th className="px-5 py-3 text-center">Nota Prom.</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                          {asig.alumnos.map((al) => {
                            const pctColor =
                              al.pctAsistencia === null
                                ? "text-text-secondary"
                                : al.pctAsistencia >= 75
                                ? "text-emerald-600 dark:text-emerald-400"
                                : al.pctAsistencia >= 50
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-red-600 dark:text-red-400";
                            const notaColor =
                              al.notaPromedio === null
                                ? "text-text-secondary"
                                : al.notaPromedio >= 4
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-600 dark:text-red-400";
                            return (
                              <tr key={al.matriculaId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                                <td className="px-5 py-3 font-medium text-text-primary dark:text-white">
                                  {al.apellido}, {al.nombre}
                                </td>
                                <td className="px-5 py-3 text-xs text-text-secondary dark:text-gray-400">
                                  {formatRut(al.rut)}
                                </td>
                                <td className="px-5 py-3 text-center text-emerald-600 dark:text-emerald-400">{al.presentes}</td>
                                <td className="px-5 py-3 text-center text-red-500 dark:text-red-400">{al.ausentes}</td>
                                <td className="px-5 py-3 text-center text-amber-600 dark:text-amber-400">{al.tardanzas}</td>
                                <td className={`px-5 py-3 text-center text-xs font-bold ${pctColor}`}>
                                  {al.pctAsistencia !== null ? `${al.pctAsistencia}%` : "—"}
                                </td>
                                <td className={`px-5 py-3 text-center text-xs font-bold ${notaColor}`}>
                                  {al.notaPromedio !== null ? al.notaPromedio.toFixed(1) : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile */}
                    <ul className="divide-y divide-gray-100 md:hidden dark:divide-gray-800">
                      {asig.alumnos.map((al) => {
                        const pctColor =
                          al.pctAsistencia === null
                            ? "text-text-secondary"
                            : al.pctAsistencia >= 75
                            ? "text-emerald-600"
                            : al.pctAsistencia >= 50
                            ? "text-amber-600"
                            : "text-red-600";
                        return (
                          <li key={al.matriculaId} className="flex flex-col gap-1.5 px-5 py-3">
                            <p className="text-sm font-semibold text-text-primary dark:text-white">
                              {al.apellido}, {al.nombre}
                            </p>
                            <p className="text-xs text-text-secondary dark:text-gray-400">{formatRut(al.rut)}</p>
                            <div className="flex flex-wrap gap-3 text-xs">
                              <span className="text-emerald-600 dark:text-emerald-400">{al.presentes}P</span>
                              <span className="text-red-500 dark:text-red-400">{al.ausentes}A</span>
                              <span className="text-amber-600 dark:text-amber-400">{al.tardanzas}T</span>
                              <span className={`font-bold ${pctColor}`}>
                                {al.pctAsistencia !== null ? `${al.pctAsistencia}% asist.` : "Sin asistencia"}
                              </span>
                              {al.notaPromedio !== null && (
                                <span className={`font-bold ${al.notaPromedio >= 4 ? "text-emerald-600" : "text-red-600"}`}>
                                  Nota: {al.notaPromedio.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
