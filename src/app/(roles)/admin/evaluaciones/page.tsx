import { ClipboardList, Eye, Plus, Trash2 } from "lucide-react";

import { listarPeriodosDashboard } from "@/actions/admin-metricas";
import { listarAsignaturasAdmin } from "@/actions/asignaturas";
import {
  agregarPreguntaFormAction,
  crearEvaluacionFormAction,
  crearPlantillaEncuestaFormAction,
  despublicarEvaluacionFormAction,
  eliminarEvaluacionFormAction,
  listarEvaluacionesByAsignatura,
  obtenerResultadosEvaluacion,
  publicarEvaluacionFormAction,
} from "@/actions/evaluaciones";
import { AsignaturaFilterSelect } from "@/components/shared/AsignaturaFilterSelect";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { formatearRut } from "@/lib/rut";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  evaluacion_created: { tone: "success", text: "Evaluación creada correctamente." },
  evaluacion_published: { tone: "success", text: "Evaluación publicada correctamente." },
  evaluacion_unpublished: { tone: "success", text: "Evaluación deshabilitada correctamente." },
  already_published: { tone: "success", text: "La evaluación ya estaba publicada." },
  already_unpublished: { tone: "success", text: "La evaluación ya estaba deshabilitada." },
  evaluacion_deleted: { tone: "success", text: "Evaluación eliminada correctamente." },
  already_deleted: { tone: "success", text: "La evaluación ya había sido eliminada." },
  pregunta_created: { tone: "success", text: "Pregunta agregada correctamente." },
  template_docente_otec_created: {
    tone: "success",
    text: "Plantilla de Evaluación Docente y OTEC creada en borrador.",
  },
  template_estilos_created: {
    tone: "success",
    text: "Plantilla de Test de Estilos de Aprendizaje creada en borrador.",
  },
  template_exists: {
    tone: "error",
    text: "Esa plantilla ya existe en la asignatura seleccionada.",
  },
  template_create_failed: {
    tone: "error",
    text: "No fue posible crear la plantilla de encuesta.",
  },
  asignatura_closed: {
    tone: "error",
    text: "La asignatura está archivada o finalizada y no acepta nuevas encuestas.",
  },
  asignatura_not_found: {
    tone: "error",
    text: "No se encontró la asignatura seleccionada.",
  },
  error: {
    tone: "error",
    text: "No fue posible completar la acción. Revisa los datos e intenta nuevamente.",
  },
};

const TIPO_LABELS: Record<string, string> = {
  formulario: "Formulario",
  tarea: "Tarea",
  examen: "Examen",
  proyecto: "Proyecto",
};

type AdminEvaluacionesPageProps = {
  searchParams?: Promise<{
    state?: string;
    periodoId?: string;
    asignaturaId?: string;
    evaluacionId?: string;
  }>;
};

const formatRut = (rut: string | null): string => {
  if (!rut) return "-";
  return rut.startsWith("EXT-") ? `Ext: ${rut.replace(/^EXT-/, "")}` : formatearRut(rut);
};

export const metadata = {
  title: "Evaluaciones",
};

export default async function AdminEvaluacionesPage({
  searchParams,
}: AdminEvaluacionesPageProps) {
  const params = await (searchParams ??
    Promise.resolve({} as { state?: string; periodoId?: string; asignaturaId?: string; evaluacionId?: string }));

  const requestedPeriodoId = typeof params?.periodoId === "string" ? params.periodoId.trim() : "";
  const periodos = await listarPeriodosDashboard();
  const defaultPeriodoId = periodos.find((p) => p.estado === "activo")?.id ?? periodos[0]?.id ?? "";
  const selectedPeriodoId =
    requestedPeriodoId && periodos.some((p) => p.id === requestedPeriodoId)
      ? requestedPeriodoId
      : defaultPeriodoId;

  const asignaturas = await listarAsignaturasAdmin(
    { limit: 1000, offset: 0 },
    { incluirArchivadas: false, periodoId: selectedPeriodoId || undefined },
  );

  const selectedAsignaturaIdRaw =
    typeof params?.asignaturaId === "string" ? params.asignaturaId : undefined;
  const selectedAsignaturaId =
    selectedAsignaturaIdRaw && UUID_REGEX.test(selectedAsignaturaIdRaw) && asignaturas.some((a) => a.id === selectedAsignaturaIdRaw)
      ? selectedAsignaturaIdRaw
      : asignaturas[0]?.id;

  const selectedAsignatura =
    asignaturas.find((a) => a.id === selectedAsignaturaId) ?? null;

  const evaluaciones = selectedAsignaturaId
    ? await listarEvaluacionesByAsignatura(selectedAsignaturaId)
    : [];

  const selectedEvaluacionIdRaw =
    typeof params?.evaluacionId === "string" ? params.evaluacionId : undefined;
  const selectedEvaluacionId =
    selectedEvaluacionIdRaw && evaluaciones.some((ev) => ev.id === selectedEvaluacionIdRaw)
      ? selectedEvaluacionIdRaw
      : evaluaciones[0]?.id;

  const resultados = selectedEvaluacionId
    ? await obtenerResultadosEvaluacion(selectedEvaluacionId)
    : [];

  return (
    <section className="space-y-5">
      <RouteStateToast state={params?.state} map={STATUS_MAP} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <header>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Evaluaciones
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Crea evaluaciones, agrega preguntas y revisa respuestas simplificadas por alumno.
          </p>
        </header>
      </div>

      <form
        method="GET"
        className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[220px_1fr_auto]">
          <div className="space-y-1.5">
            <label
              htmlFor="eval-periodo"
              className="block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400"
            >
              Periodo
            </label>
            <select
              id="eval-periodo"
              name="periodoId"
              defaultValue={selectedPeriodoId}
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              {periodos.length === 0 ? (
                <option value="">Sin periodos</option>
              ) : (
                periodos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="eval-asig"
              className="block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400"
            >
              Seccion
            </label>
            <AsignaturaFilterSelect
              options={asignaturas.map((a) => ({ id: a.id, nombre: a.nombre, codigo: a.codigo }))}
              defaultValue={selectedAsignaturaId}
              name="asignaturaId"
              placeholder="Buscar seccion..."
              autoSubmit={false}
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="h-11 w-full rounded-xl bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98] sm:w-auto"
            >
              Filtrar
            </button>
          </div>
        </div>
      </form>

      {asignaturas.length === 0 && (
        <article className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-sm text-text-secondary shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
          No hay secciones disponibles para el periodo seleccionado.
        </article>
      )}

      {selectedAsignaturaId && (
        <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-text-primary dark:text-white">
              Plantillas Rápidas de Encuesta
            </h2>
          </div>
          <p className="text-sm text-text-secondary dark:text-gray-400">
            Crea formularios predefinidos con escala numerica en cuadrados para respuesta del alumno.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <form action={crearPlantillaEncuestaFormAction} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
              <input type="hidden" name="periodoId" value={selectedPeriodoId} />
              <input type="hidden" name="plantilla" value="docente_otec" />
              <h3 className="text-sm font-semibold text-text-primary dark:text-white">
                Evaluación Docente y OTEC
              </h3>
              <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                Escala 1 a 7. Incluye afirmaciones de desempeño docente y soporte institucional.
              </p>
              <button
                type="submit"
                className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
              >
                Crear plantilla 1-7
              </button>
            </form>

            <form action={crearPlantillaEncuestaFormAction} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
              <input type="hidden" name="periodoId" value={selectedPeriodoId} />
              <input type="hidden" name="plantilla" value="estilos_aprendizaje" />
              <h3 className="text-sm font-semibold text-text-primary dark:text-white">
                Test de Estilos de Aprendizaje
              </h3>
              <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                Escala 1 a 5. Incluye bloques visual, auditivo, kinestesico y lectura/escritura.
              </p>
              <button
                type="submit"
                className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
              >
                Crear plantilla 1-5
              </button>
            </form>
          </div>
        </article>
      )}

      {selectedAsignaturaId && (
        <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-text-primary dark:text-white">
              Nueva Evaluación
            </h2>
          </div>
          <form action={crearEvaluacionFormAction} className="space-y-4">
            <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
            <input type="hidden" name="periodoId" value={selectedPeriodoId} />
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                name="titulo"
                placeholder="Título de la evaluación"
                required
                className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
              <select
                name="tipo"
                defaultValue="formulario"
                className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="formulario">Formulario</option>
                <option value="tarea">Tarea</option>
                <option value="examen">Examen</option>
                <option value="proyecto">Proyecto</option>
              </select>
              <input
                name="ponderacion"
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="Ponderación %"
                className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
              <input
                name="fechaLimite"
                type="datetime-local"
                className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            <textarea
              name="instrucciones"
              rows={3}
              placeholder="Instrucciones para el alumno..."
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                Crear Evaluación
              </button>
            </div>
          </form>
        </article>
      )}

      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
            Evaluaciones registradas
          </h2>
        </div>

        {evaluaciones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <ClipboardList className="h-7 w-7 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="mt-3 text-sm font-medium text-text-primary dark:text-white">
              No hay evaluaciones para esta asignatura
            </p>
            <p className="mt-1 max-w-xs text-xs text-text-secondary dark:text-gray-400">
              Usa el formulario &quot;Nueva Evaluación&quot; o las plantillas rápidas de arriba para comenzar.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {evaluaciones.map((ev) => (
              <div
                key={ev.id}
                className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-text-primary dark:text-gray-100">
                      {ev.titulo}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                      {TIPO_LABELS[ev.tipo] ?? ev.tipo} · {ev.totalPreguntas} pregunta
                      {ev.totalPreguntas !== 1 ? "s" : ""}
                      {ev.ponderacion ? ` · ${ev.ponderacion}%` : ""}
                      {ev.fechaLimite
                        ? ` · ${new Date(ev.fechaLimite).toLocaleDateString("es-CL")}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {ev.publicada ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                        <Eye className="h-3 w-3" />
                        Publicada
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        Borrador
                      </span>
                    )}
                    <a
                      href={`?periodoId=${encodeURIComponent(selectedPeriodoId)}&asignaturaId=${encodeURIComponent(selectedAsignaturaId ?? "")}&evaluacionId=${encodeURIComponent(ev.id)}`}
                      className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                    >
                      Ver resultados
                    </a>
                    {!ev.publicada && (
                      <form action={publicarEvaluacionFormAction}>
                        <input type="hidden" name="evaluacionId" value={ev.id} />
                        <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
                        <input type="hidden" name="periodoId" value={selectedPeriodoId} />
                        <button
                          type="submit"
                          className="rounded-lg border border-success/30 bg-success/5 px-3 py-1.5 text-xs font-medium text-success transition-colors hover:bg-success/10"
                        >
                          Publicar
                        </button>
                      </form>
                    )}
                    {ev.publicada && (
                      <form action={despublicarEvaluacionFormAction}>
                        <input type="hidden" name="evaluacionId" value={ev.id} />
                        <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
                        <input type="hidden" name="periodoId" value={selectedPeriodoId} />
                        <button
                          type="submit"
                          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/30"
                        >
                          Deshabilitar
                        </button>
                      </form>
                    )}
                    <form action={eliminarEvaluacionFormAction}>
                      <input type="hidden" name="evaluacionId" value={ev.id} />
                      <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
                      <input type="hidden" name="periodoId" value={selectedPeriodoId} />
                      <button
                        type="submit"
                        className="flex items-center gap-1 rounded-lg border border-danger/30 bg-danger/5 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>

      {selectedEvaluacionId && (
        <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
                Resultados simplificados
              </h2>
              <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
                Alumno que respondió y nota registrada para la evaluación seleccionada.
              </p>
            </div>
            {selectedAsignatura?.codigo && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {selectedAsignatura.codigo}
              </span>
            )}
          </div>

          <form action={agregarPreguntaFormAction} className="mb-6 grid gap-3 rounded-xl border border-dashed border-gray-300 p-4 dark:border-gray-700">
            <input type="hidden" name="evaluacionId" value={selectedEvaluacionId} />
            <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
            <input type="hidden" name="periodoId" value={selectedPeriodoId} />
            <input
              name="enunciado"
              placeholder="Nueva pregunta"
              required
              className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
            <div className="grid gap-3 md:grid-cols-4">
              <select
                name="tipo"
                defaultValue="respuesta_corta"
                className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="respuesta_corta">Respuesta corta</option>
                <option value="desarrollo">Desarrollo</option>
                <option value="verdadero_falso">Verdadero/Falso</option>
                <option value="opcion_multiple">Opción múltiple</option>
              </select>
              <input name="opcion" placeholder="Opción 1" className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-800" />
              <input name="opcion" placeholder="Opción 2" className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-800" />
              <input name="puntaje" type="number" min="0" step="0.01" placeholder="Puntaje" className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-800" />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
              >
                Agregar pregunta
              </button>
            </div>
          </form>

          {resultados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Eye className="h-8 w-8 text-gray-300 dark:text-gray-600" />
              <p className="mt-2 text-sm font-medium text-text-primary dark:text-white">Sin respuestas todavía</p>
              <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                Los alumnos aún no han respondido esta evaluación.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                    <th className="px-3 py-2.5">Alumno</th>
                    <th className="px-3 py-2.5">RUT</th>
                    <th className="px-3 py-2.5">Nota</th>
                    <th className="px-3 py-2.5">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {resultados.map((row) => (
                    <tr key={row.matriculaId}>
                      <td className="px-3 py-3 font-medium text-text-primary dark:text-gray-100">
                        {row.alumnoNombre} {row.alumnoApellido}
                      </td>
                      <td className="px-3 py-3 text-text-secondary dark:text-gray-400">
                        {formatRut(row.alumnoRut)}
                      </td>
                      <td className="px-3 py-3 text-text-secondary dark:text-gray-400">
                        {row.nota ?? "-"}
                      </td>
                      <td className="px-3 py-3 text-text-secondary dark:text-gray-400">
                        {row.fechaNota
                          ? new Date(row.fechaNota).toLocaleDateString("es-CL")
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      )}
    </section>
  );
}
