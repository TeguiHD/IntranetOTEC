import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { obtenerRetroalimentacion } from "@/actions/entregas";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { asignaturas, entregas, evaluaciones, matriculas, usuarios } from "@/db/schema";
import { parseAppRole } from "@/lib/authz";

import { FeedbackForm } from "./FeedbackForm";

type PageProps = {
  params: Promise<{ asigId: string; evalId: string; entregaId: string }>;
};

export default async function DocenteEntregaDetallePage({ params }: PageProps) {
  const { asigId, evalId, entregaId } = await params;
  const db = getDb();
  const session = await auth();
  const role = parseAppRole(session?.user?.rol);
  const userId = session?.user?.id ?? null;

  const conditions = [eq(entregas.id, entregaId), eq(entregas.evaluacionId, evalId), eq(evaluaciones.asignaturaId, asigId)];
  if (role === "docente" && userId) {
    conditions.push(eq(asignaturas.docenteId, userId));
  }

  const [entrega] = await db
    .select({
      id: entregas.id,
      intento: entregas.intento,
      archivoUrl: entregas.archivoUrl,
      archivoNombre: entregas.archivoNombre,
      comentarioAlumno: entregas.comentarioAlumno,
      estado: entregas.estado,
      entregadoAt: entregas.entregadoAt,
      alumnoNombre: usuarios.nombre,
      alumnoApellido: usuarios.apellido,
      evalTitulo: evaluaciones.titulo,
      intentosMax: evaluaciones.intentosMax,
    })
    .from(entregas)
    .innerJoin(matriculas, eq(entregas.matriculaId, matriculas.id))
    .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
    .innerJoin(evaluaciones, eq(entregas.evaluacionId, evaluaciones.id))
    .innerJoin(asignaturas, eq(evaluaciones.asignaturaId, asignaturas.id))
    .where(and(...conditions))
    .limit(1);

  if (!entrega) notFound();

  const retroalimentaciones = await obtenerRetroalimentacion(entregaId);

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
          Revisar Entrega
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
          {entrega.evalTitulo} — Intento {entrega.intento}/{entrega.intentosMax ?? 1}
        </p>
      </header>

      {/* Datos de la entrega */}
      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-text-primary dark:text-white">
              {entrega.alumnoNombre} {entrega.alumnoApellido}
            </p>
            {entrega.entregadoAt && (
              <p className="text-xs text-text-muted dark:text-gray-500">
                Entregado: {new Date(entrega.entregadoAt).toLocaleString("es-CL")}
              </p>
            )}
          </div>
        </div>

        {entrega.archivoUrl && (
          <div className="mb-3">
            <a
              href={entrega.archivoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-primary/30 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 dark:text-primary-light"
            >
              📎 {entrega.archivoNombre ?? "Descargar archivo"}
            </a>
          </div>
        )}

        {entrega.comentarioAlumno && (
          <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 dark:border-gray-800 dark:bg-gray-800/40">
            <p className="mb-1 text-xs font-semibold text-text-secondary dark:text-gray-400">Comentario del alumno</p>
            <p className="text-sm text-text-primary dark:text-gray-200">{entrega.comentarioAlumno}</p>
          </div>
        )}
      </article>

      {/* Retroalimentaciones anteriores */}
      {retroalimentaciones.length > 0 && (
        <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <h2 className="mb-3 text-base font-semibold text-text-primary dark:text-white">
            Retroalimentación enviada
          </h2>
          <div className="space-y-3">
            {retroalimentaciones.map((r) => (
              <div key={r.id} className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 dark:border-gray-800 dark:bg-gray-800/40">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <p className="text-xs font-semibold text-text-secondary dark:text-gray-400">
                    {r.docenteNombre} {r.docenteApellido}
                  </p>
                  {r.nota && (
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
                      Nota: {r.nota}
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-primary dark:text-gray-200">{r.comentario}</p>
                <p className="mt-1 text-xs text-text-muted dark:text-gray-500">
                  {r.createdAt ? new Date(r.createdAt).toLocaleString("es-CL") : ""}
                </p>
              </div>
            ))}
          </div>
        </article>
      )}

      {/* Formulario de nueva retroalimentación */}
      {entrega.estado !== "revisado" && (
        <FeedbackForm
          entregaId={entregaId}
          asigId={asigId}
          evalId={evalId}
        />
      )}
    </section>
  );
}
