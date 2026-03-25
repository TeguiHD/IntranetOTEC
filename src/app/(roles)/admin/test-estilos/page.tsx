import { Brain } from "lucide-react";

import { listarResultadosTestEstilos } from "@/actions/encuestas";
import { formatearRut } from "@/lib/rut";

const ESTILO_COLOR: Record<string, string> = {
  visual: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  auditivo: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  kinestesico: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
};

const ESTILO_LABEL: Record<string, string> = {
  visual: "Visual",
  auditivo: "Auditivo",
  kinestesico: "Kinestésico",
};

const formatRut = (rut: string | null): string => {
  if (!rut) return "-";
  return rut.startsWith("EXT-") ? `Ext: ${rut.replace(/^EXT-/, "")}` : formatearRut(rut);
};

export const metadata = { title: "Test de Estilos de Aprendizaje" };

export default async function AdminTestEstilosPage() {
  const resultados = await listarResultadosTestEstilos();

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
          Test de Estilos de Aprendizaje
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
          Resultados del test de estilos de aprendizaje completados por los alumnos (máximo 2 intentos por alumno).
        </p>
      </header>

      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
            Resultados por Alumno
          </h2>
          {resultados.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {resultados.length}
            </span>
          )}
        </div>

        {resultados.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-secondary dark:text-gray-400">
            Aún no hay alumnos que hayan completado el test.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                  <th className="px-3 py-2.5">Alumno</th>
                  <th className="px-3 py-2.5">RUT</th>
                  <th className="px-3 py-2.5">Intento</th>
                  <th className="px-3 py-2.5">Visual</th>
                  <th className="px-3 py-2.5">Auditivo</th>
                  <th className="px-3 py-2.5">Kinestésico</th>
                  <th className="px-3 py-2.5">Estilo preferente</th>
                  <th className="px-3 py-2.5">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {resultados.map((r) => (
                  <tr key={`${r.alumnoRut}-${r.intento}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-3 py-2.5 font-medium text-text-primary dark:text-gray-100">
                      {r.alumnoNombre} {r.alumnoApellido}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-text-secondary dark:text-gray-400">
                      {formatRut(r.alumnoRut)}
                    </td>
                    <td className="px-3 py-2.5 text-center text-text-secondary dark:text-gray-400">
                      {r.intento}
                    </td>
                    <td className="px-3 py-2.5 text-center font-semibold text-blue-700 dark:text-blue-300">
                      {r.puntajeVisual ?? "-"}
                    </td>
                    <td className="px-3 py-2.5 text-center font-semibold text-green-700 dark:text-green-300">
                      {r.puntajeAuditivo ?? "-"}
                    </td>
                    <td className="px-3 py-2.5 text-center font-semibold text-purple-700 dark:text-purple-300">
                      {r.puntajeKinestesico ?? "-"}
                    </td>
                    <td className="px-3 py-2.5">
                      {r.estiloPreferente ? (
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTILO_COLOR[r.estiloPreferente] ?? ""}`}>
                          {ESTILO_LABEL[r.estiloPreferente] ?? r.estiloPreferente}
                        </span>
                      ) : "-"}
                    </td>
                    <td className="px-3 py-2.5 text-text-secondary dark:text-gray-400">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString("es-CL") : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}
