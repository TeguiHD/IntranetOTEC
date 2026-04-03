import { obtenerHorarioDocente } from "@/actions/horarios";
import { WeeklyScheduleGrid } from "@/components/shared/WeeklyScheduleGrid";

export const metadata = { title: "Mi Horario" };

export default async function DocenteHorarioPage() {
  const bloques = await obtenerHorarioDocente();

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
          Mi Horario
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
          Patrón semanal de clases de tus secciones activas.
        </p>
      </header>

      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <WeeklyScheduleGrid bloques={bloques} />
      </article>
    </section>
  );
}
