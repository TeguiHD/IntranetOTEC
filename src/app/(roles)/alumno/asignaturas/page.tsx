import { obtenerResumenAsistenciaAlumno } from "@/actions/asistencia";
import { PieChart } from "@/components/shared/PieChart";

const COLORS = {
  presente: "#10B981",
  ausente: "#EF4444",
  tardanza: "#F59E0B",
  justificado: "#8B3A9E",
};

export default async function AlumnoAsignaturasPage() {
  const resumenAsistencia = await obtenerResumenAsistenciaAlumno();

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
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
