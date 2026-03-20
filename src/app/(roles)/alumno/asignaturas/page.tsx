import { obtenerResumenAsistenciaAlumno } from "@/actions/asistencia";
import { listarMaterialPorAsignatura } from "@/actions/material";
import { PieChart } from "@/components/shared/PieChart";

const COLORS = {
  presente: "#10B981",
  ausente: "#EF4444",
  tardanza: "#F59E0B",
  justificado: "#8B3A9E",
};

export const metadata = {
  title: "Mis Cursos",
};

export default async function AlumnoAsignaturasPage() {
  let resumenAsistencia;
  const materialesPorAsig = new Map<string, { id: string; nombre: string; tamanioBytes: number | null; claseTitulo: string }[]>();

  try {
    resumenAsistencia = await obtenerResumenAsistenciaAlumno();

    // Load materials for all enrolled asignaturas in parallel
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

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold uppercase text-text-primary dark:text-white">
          Mis Cursos
        </h1>
        <p className="text-sm text-text-secondary dark:text-gray-300">
          Revisa tu asistencia por asignatura.
        </p>
      </header>

      {resumenAsistencia.length === 0 ? (
        <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm text-text-secondary dark:text-gray-300">
            Aún no tienes asignaturas matriculadas o no hay registros de asistencia.
          </p>
        </article>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {resumenAsistencia.map((asig) => (
            <article
              key={asig.asignaturaId}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <PieChart
                title={asig.asignaturaNombre}
                slices={[
                  { label: "Presente", value: asig.presente, color: COLORS.presente },
                  { label: "Ausente", value: asig.ausente, color: COLORS.ausente },
                  { label: "Tardanza", value: asig.tardanza, color: COLORS.tardanza },
                  { label: "Justificado", value: asig.justificado, color: COLORS.justificado },
                ]}
              />
              <div className="mt-3 text-center">
                <p className="text-xs text-text-secondary dark:text-gray-400">
                  Total de registros: {asig.total}
                </p>
              </div>

              {(() => {
                const mats = materialesPorAsig.get(asig.asignaturaId);
                if (!mats || mats.length === 0) return null;
                return (
                  <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                    <h3 className="mb-2 text-sm font-semibold text-text-primary dark:text-gray-100">
                      Material disponible
                    </h3>
                    <ul className="space-y-1.5">
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
                );
              })()}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
