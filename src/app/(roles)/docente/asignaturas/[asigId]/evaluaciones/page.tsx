import { and, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";

import { listarEvaluacionesByAsignatura } from "@/actions/evaluaciones";
import { getDb } from "@/db";
import { asignaturas } from "@/db/schema";

type PageProps = {
  params: Promise<{ asigId: string }>;
};

export default async function DocenteEvaluacionesPage({ params }: PageProps) {
  const { asigId } = await params;
  const db = getDb();

  const [asig] = await db
    .select({ nombre: asignaturas.nombre })
    .from(asignaturas)
    .where(and(eq(asignaturas.id, asigId), isNull(asignaturas.eliminadoAt)))
    .limit(1);

  if (!asig) notFound();

  const evals = await listarEvaluacionesByAsignatura(asigId);

  const TIPO_LABELS: Record<string, string> = {
    tarea: "Tarea",
    proyecto: "Proyecto",
    examen: "Examen",
    formulario: "Formulario",
    prueba: "Prueba",
  };

  return (
    <section className="space-y-5">
      <header>
        <p className="text-sm text-text-secondary dark:text-gray-400">{asig.nombre}</p>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
          Evaluaciones
        </h1>
      </header>

      <article className="rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {evals.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-secondary dark:text-gray-400">
            No hay evaluaciones registradas para esta sección.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Fecha límite</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {evals.map((e) => (
                  <tr key={e.id} className="hover:bg-primary/[0.02] dark:hover:bg-primary/5">
                    <td className="px-4 py-3 font-medium text-text-primary dark:text-gray-100">{e.titulo}</td>
                    <td className="px-4 py-3 text-text-secondary dark:text-gray-400">
                      {TIPO_LABELS[e.tipo] ?? e.tipo}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted dark:text-gray-500">
                      {e.fechaLimite
                        ? new Date(e.fechaLimite).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" })
                        : "Sin límite"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(e.tipo === "tarea" || e.tipo === "proyecto") && (
                        <a
                          href={`/docente/asignaturas/${asigId}/evaluaciones/${e.id}/entregas`}
                          className="rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 dark:text-primary-light dark:border-primary-light/30 dark:hover:bg-primary/20"
                        >
                          Ver Entregas
                        </a>
                      )}
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
