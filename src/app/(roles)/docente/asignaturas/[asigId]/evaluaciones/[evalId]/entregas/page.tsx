import { and, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";

import { listarEntregasParaDocente } from "@/actions/entregas";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { asignaturas, evaluaciones } from "@/db/schema";
import { parseAppRole } from "@/lib/authz";

type PageProps = {
  params: Promise<{ asigId: string; evalId: string }>;
};

export default async function DocenteEntregasPage({ params }: PageProps) {
  const { asigId, evalId } = await params;
  const db = getDb();
  const session = await auth();
  const role = parseAppRole(session?.user?.rol);
  const userId = session?.user?.id ?? null;

  const evalConditions = [
    eq(evaluaciones.id, evalId),
    eq(evaluaciones.asignaturaId, asigId),
    isNull(evaluaciones.eliminadoAt),
  ];

  if (role === "docente" && userId) {
    evalConditions.push(eq(asignaturas.docenteId, userId));
  }

  const [eval_] = await db
    .select({ id: evaluaciones.id, titulo: evaluaciones.titulo, tipo: evaluaciones.tipo })
    .from(evaluaciones)
    .innerJoin(asignaturas, eq(evaluaciones.asignaturaId, asignaturas.id))
    .where(and(...evalConditions))
    .limit(1);

  if (!eval_) notFound();

  const [asig] = await db
    .select({ nombre: asignaturas.nombre })
    .from(asignaturas)
    .where(and(eq(asignaturas.id, asigId), isNull(asignaturas.eliminadoAt)))
    .limit(1);

  const listado = await listarEntregasParaDocente(evalId);

  const ESTADO_LABELS: Record<string, { label: string; cls: string }> = {
    pendiente:           { label: "Pendiente",          cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" },
    revisado:            { label: "Revisado",            cls: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200" },
    requiere_correccion: { label: "Requiere corrección", cls: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" },
  };

  return (
    <section className="space-y-5">
      <header>
        <p className="text-sm text-text-secondary dark:text-gray-400">
          {asig?.nombre ?? asigId}
        </p>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
          Entregas: {eval_.titulo}
        </h1>
      </header>

      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        {listado.length === 0 ? (
          <p className="text-center text-sm text-text-secondary dark:text-gray-400 py-8">
            Aún no hay entregas para esta evaluación.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                  <th className="px-3 py-2.5">Alumno</th>
                  <th className="px-3 py-2.5">Intento</th>
                  <th className="px-3 py-2.5">Estado</th>
                  <th className="px-3 py-2.5">Entregado</th>
                  <th className="px-3 py-2.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {listado.map((e) => {
                  const cfg = e.estado ? ESTADO_LABELS[e.estado] : null;
                  return (
                    <tr key={e.id} className="transition-colors hover:bg-primary/[0.03] dark:hover:bg-primary/5">
                      <td className="px-3 py-3 font-medium text-text-primary dark:text-gray-100">
                        {e.alumnoNombre} {e.alumnoApellido}
                        <br />
                        <span className="text-xs text-text-muted dark:text-gray-500">{e.alumnoRut ?? "—"}</span>
                      </td>
                      <td className="px-3 py-3 text-text-secondary dark:text-gray-400">{e.intento}</td>
                      <td className="px-3 py-3">
                        {cfg ? (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.cls}`}>
                            {cfg.label}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-3 text-xs text-text-muted dark:text-gray-500">
                        {e.entregadoAt
                          ? new Date(e.entregadoAt).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })
                          : "—"}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <a
                          href={`/docente/asignaturas/${asigId}/evaluaciones/${evalId}/entregas/${e.id}`}
                          className="rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 dark:text-primary-light dark:border-primary-light/30 dark:hover:bg-primary/20"
                        >
                          Revisar
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}
