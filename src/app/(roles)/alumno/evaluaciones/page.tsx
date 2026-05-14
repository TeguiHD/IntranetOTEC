import { listarEvaluacionesAlumno } from "@/actions/evaluaciones";

import { EvaluacionesListClient } from "./EvaluacionesListClient";

export const metadata = {
  title: "Mis Evaluaciones",
};

export default async function AlumnoEvaluacionesPage() {
  let evaluaciones;

  try {
    evaluaciones = await listarEvaluacionesAlumno();
  } catch {
    return (
      <section className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold uppercase text-text-primary dark:text-white">
            Mis Evaluaciones
          </h1>
        </header>
        <article className="rounded-xl border border-danger/30 bg-danger/5 p-6 dark:border-danger/40 dark:bg-danger/10">
          <p className="text-sm font-medium text-danger">
            No fue posible cargar las evaluaciones. Intenta recargar la página.
          </p>
        </article>
      </section>
    );
  }

  const pendientesCount = evaluaciones.filter(
    (ev) => ev.estadoVentana === "disponible" && !ev.respondidaPorAlumno,
  ).length;
  const enviadasCount = evaluaciones.filter(
    (ev) => ev.respondidaPorAlumno && !ev.notaAlumno,
  ).length;
  const revisadasCount = evaluaciones.filter((ev) => ev.notaAlumno !== null).length;
  const vencidasCount = evaluaciones.filter(
    (ev) => ev.estadoVentana === "vencida",
  ).length;

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold uppercase text-text-primary dark:text-white">
          Mis Evaluaciones
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-300">
          Evaluaciones disponibles en tus cursos matriculados.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <article className="rounded-xl border border-amber-200 bg-gradient-to-b from-amber-50 to-amber-100/40 p-4 shadow-sm dark:border-amber-900/40 dark:from-amber-950/30 dark:to-amber-900/10">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-200">
            Pendientes
          </p>
          <p className="mt-2 text-2xl font-bold text-amber-900 dark:text-amber-100">{pendientesCount}</p>
          <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-200/80">
            Aún no respondidas.
          </p>
        </article>
        <article className="rounded-xl border border-blue-200 bg-gradient-to-b from-blue-50 to-blue-100/40 p-4 shadow-sm dark:border-blue-900/40 dark:from-blue-950/30 dark:to-blue-900/10">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-200">
            Enviadas
          </p>
          <p className="mt-2 text-2xl font-bold text-blue-900 dark:text-blue-100">{enviadasCount}</p>
          <p className="mt-1 text-xs text-blue-700/80 dark:text-blue-200/80">
            Esperando revisión.
          </p>
        </article>
        <article className="rounded-xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-emerald-100/40 p-4 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/30 dark:to-emerald-900/10">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-200">
            Revisadas
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-900 dark:text-emerald-100">{revisadasCount}</p>
          <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-200/80">
            Con nota registrada.
          </p>
        </article>
        <article className="rounded-xl border border-gray-200 bg-gradient-to-b from-gray-50 to-gray-100/40 p-4 shadow-sm dark:border-gray-700 dark:from-gray-900 dark:to-gray-900/60">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
            Vencidas
          </p>
          <p className="mt-2 text-2xl font-bold text-text-primary dark:text-white">{vencidasCount}</p>
          <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
            Historial cerrado.
          </p>
        </article>
      </div>

      <EvaluacionesListClient evaluaciones={evaluaciones} />
    </section>
  );
}
