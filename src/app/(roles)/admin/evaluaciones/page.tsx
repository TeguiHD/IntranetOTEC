import { CheckCircle2, ClipboardList, Eye, FileUp, ListChecks, Plus, ShieldCheck, ShieldOff, Trash2, BarChart2 } from "lucide-react";

import { listarPeriodosDashboard } from "@/actions/admin-metricas";
import { listarAsignaturasAdmin } from "@/actions/asignaturas";
import {
  agregarPreguntaFormAction,
  calificarRespuestaEvaluacionFormAction,
  crearEvaluacionFormAction,
  crearPlantillaEncuestaFormAction,
  despublicarEvaluacionFormAction,
  eliminarEvaluacionFormAction,
  importarPruebaLocalFormAction,
  listarAuditoriaEvaluacion,
  listarEvaluacionesByAsignatura,
  listarEventosSupervisionByEvaluacion,
  listarIntentosRecuperablesEvaluacion,
  listarParticipacionEvaluacion,
  listarPreguntasByEvaluacion,
  listarPruebasLocalesAction,
  listarRespuestasParaCalificar,
  obtenerResultadosEvaluacion,
  publicarEvaluacionFormAction,
  toggleModoSupervisionFormAction,
  toggleMostrarResultadosFormAction,
  type IntentoRecuperableItem,
  type EvaluacionParticipacionItem,
  type RespuestaPendienteItem,
} from "@/actions/evaluaciones";
import { AuditTimeline } from "@/components/evaluaciones/AuditTimeline";
import { EvaluacionParticipacionPanel } from "@/components/evaluaciones/EvaluacionParticipacionPanel";
import { RehabilitarIntentoActions } from "@/components/evaluaciones/RehabilitarIntentoActions";
import { AsignaturaFilterSelect } from "@/components/shared/AsignaturaFilterSelect";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { describeEvaluationWriteLock } from "@/lib/academic-state";
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
  local_test_imported: { tone: "success", text: "Prueba importada en borrador. Revísala antes de publicar." },
  test_exists: { tone: "error", text: "Esa prueba ya existe en la asignatura seleccionada." },
  empty_test: { tone: "error", text: "No se reconocieron preguntas en el archivo seleccionado." },
  invalid_file: { tone: "error", text: "No fue posible leer el archivo de prueba seleccionado." },
  local_test_import_failed: { tone: "error", text: "No fue posible importar la prueba local." },
  supervision_enabled: { tone: "success", text: "Modo supervisión activado para la evaluación." },
  supervision_disabled: { tone: "success", text: "Modo supervisión desactivado para la evaluación." },
  supervision_toggle_failed: { tone: "error", text: "No fue posible cambiar el modo supervisión." },
  mostrar_resultados_updated: { tone: "success", text: "Visibilidad de resultados actualizada." },
  intento_reanudado: { tone: "success", text: "Intento reanudado con un nuevo temporizador completo." },
  intento_anulado_nuevo: { tone: "success", text: "Intento anulado. El alumno podrá comenzar desde cero." },
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

const PREGUNTA_LABELS: Record<string, string> = {
  opcion_multiple: "Selección múltiple",
  verdadero_falso: "Verdadero/Falso",
  respuesta_corta: "Respuesta corta",
  desarrollo: "Desarrollo",
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
  const selectedPeriodo = periodos.find((periodo) => periodo.id === selectedPeriodoId) ?? null;

  const evaluaciones = selectedAsignaturaId
    ? await listarEvaluacionesByAsignatura(selectedAsignaturaId)
    : [];
  const pruebasLocales = selectedAsignaturaId ? await listarPruebasLocalesAction() : [];

  const selectedEvaluacionIdRaw =
    typeof params?.evaluacionId === "string" ? params.evaluacionId : undefined;
  const selectedEvaluacionId =
    selectedEvaluacionIdRaw && evaluaciones.some((ev) => ev.id === selectedEvaluacionIdRaw)
      ? selectedEvaluacionIdRaw
      : evaluaciones[0]?.id;

  const resultados = selectedEvaluacionId
    ? await obtenerResultadosEvaluacion(selectedEvaluacionId)
    : [];
  const respuestasPendientes: RespuestaPendienteItem[] = selectedEvaluacionId
    ? await listarRespuestasParaCalificar(selectedEvaluacionId)
    : [];
  const intentosRecuperables: IntentoRecuperableItem[] = selectedEvaluacionId
    ? await listarIntentosRecuperablesEvaluacion(selectedEvaluacionId)
    : [];
  const participacionEvaluacion: EvaluacionParticipacionItem[] = selectedEvaluacionId
    ? await listarParticipacionEvaluacion(selectedEvaluacionId)
    : [];
  const preguntasSeleccionadas = selectedEvaluacionId
    ? await listarPreguntasByEvaluacion(selectedEvaluacionId)
    : [];
  const eventosSupervision = selectedEvaluacionId
    ? await listarEventosSupervisionByEvaluacion(selectedEvaluacionId)
    : [];
  const auditoriaEventos = selectedEvaluacionId
    ? await listarAuditoriaEvaluacion(selectedEvaluacionId)
    : [];
  const selectedEvaluacion = evaluaciones.find((ev) => ev.id === selectedEvaluacionId) ?? null;
  const draftCount = evaluaciones.filter((evaluacion) => !evaluacion.publicada).length;
  const publishedCount = evaluaciones.filter((evaluacion) => evaluacion.publicada).length;
  const supervisedCount = evaluaciones.filter((evaluacion) => evaluacion.modoSupervision).length;
  const writeLockMessage = describeEvaluationWriteLock({
    periodoEstado: selectedPeriodo?.estado,
    asignaturaEstado: selectedAsignatura?.estado,
  });

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
        <div className="grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
              Borradores
            </p>
            <p className="mt-2 text-2xl font-bold text-text-primary dark:text-white">{draftCount}</p>
            <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
              Evaluaciones aún no publicadas para la sección filtrada.
            </p>
          </article>
          <article className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
              Publicadas
            </p>
            <p className="mt-2 text-2xl font-bold text-text-primary dark:text-white">{publishedCount}</p>
            <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
              Disponibles para responder según fechas y matrícula.
            </p>
          </article>
          <article className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
              Supervisadas
            </p>
            <p className="mt-2 text-2xl font-bold text-text-primary dark:text-white">{supervisedCount}</p>
            <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
              Con trazabilidad de eventos de integridad activada.
            </p>
          </article>
        </div>
      )}

      {selectedAsignaturaId && writeLockMessage && (
        <article className="rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-semibold">
            {selectedAsignatura?.nombre ?? "Sección seleccionada"}
          </p>
          <p className="mt-1 text-amber-800/90 dark:text-amber-100/80">{writeLockMessage}</p>
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                name="fechaInicio"
                type="datetime-local"
                aria-label="Fecha de inicio"
                className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
              <input
                name="fechaLimite"
                type="datetime-local"
                aria-label="Fecha límite"
                className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
              <input
                name="tiempoMinutos"
                type="number"
                min="1"
                max="600"
                placeholder="Tiempo disponible (min)"
                className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
              <input
                name="intentosMax"
                type="number"
                min="1"
                max="5"
                defaultValue="1"
                placeholder="Intentos máximos"
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

      {selectedAsignaturaId && (
        <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light">
                <FileUp className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-text-primary dark:text-white">
                  Importar prueba desde banco local
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-text-secondary dark:text-gray-400">
                  Convierte los archivos de PRUEBAS en exámenes estructurados. Se crean en borrador para revisar pauta, fechas y publicación.
                </p>
              </div>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {pruebasLocales.length} archivo{pruebasLocales.length !== 1 ? "s" : ""}
            </span>
          </div>

          {pruebasLocales.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-5 text-sm text-text-secondary dark:border-gray-700 dark:text-gray-400">
              No se encontraron pruebas .txt en la carpeta PRUEBAS.
            </div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="grid gap-3 sm:grid-cols-2">
                {pruebasLocales.slice(0, 6).map((prueba) => (
                  <div key={prueba.id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                    <p className="line-clamp-2 text-sm font-semibold text-text-primary dark:text-gray-100">
                      {prueba.titulo}
                    </p>
                    <p className="mt-1 truncate text-xs text-text-secondary dark:text-gray-400">
                      {prueba.archivo}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        {prueba.totalPreguntas} preguntas
                      </span>
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {prueba.resumen.opcionMultiple} selección
                      </span>
                      <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        {prueba.resumen.verdaderoFalso} V/F
                      </span>
                      {prueba.resumen.desarrollo > 0 && (
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                          {prueba.resumen.desarrollo} desarrollo
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <form action={importarPruebaLocalFormAction} className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
                <input type="hidden" name="periodoId" value={selectedPeriodoId} />
                <label className="block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                  Prueba
                </label>
                <select
                  name="archivo"
                  required
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                >
                  {pruebasLocales.map((prueba) => (
                    <option key={prueba.id} value={prueba.archivo}>
                      {prueba.titulo} ({prueba.totalPreguntas})
                    </option>
                  ))}
                </select>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    name="fechaInicio"
                    type="datetime-local"
                    aria-label="Fecha de inicio"
                    className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  />
                  <input
                    name="fechaLimite"
                    type="datetime-local"
                    aria-label="Fecha límite"
                    className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  />
                  <input
                    name="tiempoMinutos"
                    type="number"
                    min="1"
                    max="600"
                    placeholder="Tiempo min."
                    className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  />
                  <input
                    name="intentosMax"
                    type="number"
                    min="1"
                    max="5"
                    defaultValue="1"
                    placeholder="Intentos"
                    className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  />
                </div>
                <input
                  name="ponderacion"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="Ponderación %"
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98]"
                >
                  <FileUp className="h-4 w-4" />
                  Importar en borrador
                </button>
              </form>
            </div>
          )}
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
                    <form action={toggleModoSupervisionFormAction}>
                      <input type="hidden" name="evaluacionId" value={ev.id} />
                      <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
                      <input type="hidden" name="periodoId" value={selectedPeriodoId} />
                      <input type="hidden" name="enabled" value={ev.modoSupervision ? "false" : "true"} />
                      <button
                        type="submit"
                        className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          ev.modoSupervision
                            ? "border-cyan-300 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 dark:border-cyan-700/60 dark:bg-cyan-900/20 dark:text-cyan-300"
                            : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {ev.modoSupervision ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
                        {ev.modoSupervision ? "Supervisada" : "Activar supervisión"}
                      </button>
                    </form>
                    <form action={toggleMostrarResultadosFormAction}>
                      <input type="hidden" name="evaluacionId" value={ev.id} />
                      <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
                      <input type="hidden" name="periodoId" value={selectedPeriodoId} />
                      <input type="hidden" name="currentValue" value={String(ev.mostrarResultados ?? false)} />
                      <button
                        type="submit"
                        className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          ev.mostrarResultados
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700/60 dark:bg-emerald-900/20 dark:text-emerald-300"
                            : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        <BarChart2 className="h-3.5 w-3.5" />
                        {ev.mostrarResultados ? "Resultados visibles" : "Mostrar resultados"}
                      </button>
                    </form>
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
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
                Maquetador de prueba
              </h2>
              <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
                {selectedEvaluacion?.titulo ?? "Evaluación seleccionada"} · arma la pauta, puntajes y preguntas antes de publicar.
              </p>
            </div>
            {selectedAsignatura?.codigo && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {selectedAsignatura.codigo}
              </span>
            )}
          </div>

          <form action={agregarPreguntaFormAction} className="mb-6 grid gap-4 rounded-xl border border-dashed border-primary/30 bg-primary/[0.03] p-4 dark:border-primary/40 dark:bg-primary/10">
            <input type="hidden" name="evaluacionId" value={selectedEvaluacionId} />
            <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
            <input type="hidden" name="periodoId" value={selectedPeriodoId} />
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-text-primary dark:text-white">
                Agregar pregunta
              </h3>
            </div>
            <textarea
              name="enunciado"
              rows={2}
              placeholder="Enunciado de la pregunta..."
              required
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
            <div className="grid gap-3 md:grid-cols-[1.2fr_120px_120px_140px]">
              <select
                name="tipo"
                defaultValue="opcion_multiple"
                className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="opcion_multiple">Opción múltiple</option>
                <option value="verdadero_falso">Verdadero/Falso</option>
                <option value="desarrollo">Desarrollo</option>
                <option value="respuesta_corta">Respuesta corta</option>
              </select>
              <input name="puntaje" type="number" min="0" step="0.01" defaultValue="1" placeholder="Puntaje" className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-800" />
              <input name="orden" type="number" min="1" placeholder="Orden" className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-800" />
              <select name="correcta" defaultValue="" className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                <option value="">Sin pauta</option>
                <option value="0">Correcta A / Verdadero</option>
                <option value="1">Correcta B / Falso</option>
                <option value="2">Correcta C</option>
                <option value="3">Correcta D</option>
              </select>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              {["A", "B", "C", "D"].map((label) => (
                <input
                  key={label}
                  name="opcion"
                  placeholder={`Alternativa ${label}`}
                  className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              ))}
            </div>
            <div className="flex flex-col gap-3 text-xs text-text-secondary dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Para V/F usa pauta A = Verdadero o B = Falso. Desarrollo y respuesta corta quedan para revisión manual.
              </p>
              <button
                type="submit"
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
              >
                Agregar pregunta
              </button>
            </div>
          </form>

          <div className="mb-6 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <div>
                <h3 className="text-sm font-semibold text-text-primary dark:text-white">
                  Pauta y estructura
                </h3>
                <p className="text-xs text-text-secondary dark:text-gray-400">
                  {preguntasSeleccionadas.length} pregunta{preguntasSeleccionadas.length !== 1 ? "s" : ""} en esta evaluación.
                </p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {selectedEvaluacion?.publicada ? "Publicada" : "Borrador"}
              </span>
            </div>
            {preguntasSeleccionadas.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-text-secondary dark:text-gray-400">
                Aún no hay preguntas maquetadas para esta evaluación.
              </p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {preguntasSeleccionadas.map((pregunta, index) => {
                  const opciones = pregunta.opciones as { opciones?: string[]; correcta?: number | string } | null;
                  const correcta =
                    pregunta.tipo === "opcion_multiple" && typeof opciones?.correcta === "number"
                      ? String.fromCharCode(65 + opciones.correcta)
                      : pregunta.tipo === "verdadero_falso" && typeof opciones?.correcta === "string"
                        ? opciones.correcta === "true" ? "Verdadero" : "Falso"
                        : null;

                  return (
                    <div key={pregunta.id} className="p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary dark:text-gray-100">
                            {pregunta.orden ?? index + 1}. {pregunta.enunciado}
                          </p>
                          <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                            {PREGUNTA_LABELS[pregunta.tipo] ?? pregunta.tipo} · {pregunta.puntaje ?? "1"} punto{pregunta.puntaje === "1" ? "" : "s"}
                          </p>
                        </div>
                        {correcta ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {correcta}
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                            Sin pauta
                          </span>
                        )}
                      </div>
                      {opciones?.opciones && opciones.opciones.length > 0 && (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {opciones.opciones.map((opcion, optionIndex) => (
                            <div key={`${pregunta.id}-${optionIndex}`} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-text-secondary dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-300">
                              <span className="font-semibold text-text-primary dark:text-white">
                                {String.fromCharCode(65 + optionIndex)}.
                              </span>{" "}
                              {opcion}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6">
            <EvaluacionParticipacionPanel participacion={participacionEvaluacion} />
          </div>

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

          {respuestasPendientes.length > 0 && (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-900/20">
              <h3 className="mb-3 text-sm font-semibold text-amber-900 dark:text-amber-300">
                Corrección manual ({respuestasPendientes.filter((r) => !r.notaActual).length} pendientes)
              </h3>
              <div className="space-y-4">
                {respuestasPendientes.map((item) => (
                  <div key={item.respuestaId} className="rounded-lg border border-amber-100 bg-white p-4 dark:border-amber-900/30 dark:bg-gray-900">
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                      {item.alumnoApellido}, {item.alumnoNombre} — {item.alumnoRut}
                    </p>
                    <p className="mt-1 text-sm font-medium text-text-primary dark:text-white">{item.enunciado}</p>
                    <blockquote className="mt-2 rounded-md border-l-4 border-amber-300 bg-amber-50/50 px-3 py-2 text-sm text-text-primary dark:border-amber-700 dark:bg-amber-900/30 dark:text-gray-200">
                      {item.respuesta ?? <em className="text-text-secondary">Sin respuesta</em>}
                    </blockquote>
                    {item.notaActual ? (
                      <p className="mt-2 text-xs text-green-700 dark:text-green-400">
                        Nota: <strong>{item.notaActual}</strong>
                      </p>
                    ) : null}
                    <form action={calificarRespuestaEvaluacionFormAction} className="mt-3 flex flex-wrap items-end gap-3">
                      <input type="hidden" name="evaluacionId" value={selectedEvaluacionId ?? ""} />
                      <input type="hidden" name="matriculaId" value={item.matriculaId} />
                      <input type="hidden" name="asignaturaId" value={selectedAsignaturaId ?? ""} />
                      <input type="hidden" name="periodoId" value={selectedPeriodoId ?? ""} />
                      <input type="hidden" name="redirectTo" value={`/admin/evaluaciones?periodoId=${selectedPeriodoId ?? ""}&asignaturaId=${selectedAsignaturaId ?? ""}&evaluacionId=${selectedEvaluacionId ?? ""}`} />
                      <div>
                        <label className="block text-xs font-medium text-text-secondary dark:text-gray-400">
                          Nota (1.0–7.0)
                        </label>
                        <input
                          type="number"
                          name="nota"
                          min="1"
                          max="7"
                          step="0.1"
                          defaultValue={item.notaActual ?? ""}
                          required
                          className="mt-1 w-24 rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-text-secondary dark:text-gray-400">
                          Observación (opcional)
                        </label>
                        <input
                          type="text"
                          name="observacion"
                          maxLength={500}
                          placeholder="Retroalimentación para el alumno..."
                          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      <button
                        type="submit"
                        className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-dark"
                      >
                        {item.notaActual ? "Actualizar" : "Registrar nota"}
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          )}

          {intentosRecuperables.length > 0 && (
            <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800/40 dark:bg-blue-900/20">
              <h3 className="mb-3 text-sm font-semibold text-blue-900 dark:text-blue-300">
                Rehabilitar acceso — intentos de alumnos
              </h3>
              <p className="mb-4 text-xs text-blue-700 dark:text-blue-400">
                Reanuda un intento con temporizador completo o anúlalo para que el alumno empiece de cero.
              </p>
              <div className="divide-y divide-blue-100 dark:divide-blue-900/40">
                {intentosRecuperables.map((item) => {
                  const estadoBadge = {
                    activo: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
                    expirado: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
                    enviado: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
                    anulado: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
                  }[item.estado];
                  const estadoLabel = {
                    activo: "En curso",
                    expirado: "Expirado",
                    enviado: "Enviado",
                    anulado: "Anulado",
                  }[item.estado];

                  return (
                    <div key={item.intentoId} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-primary dark:text-white">
                          {item.alumnoApellido}, {item.alumnoNombre}
                          {item.alumnoRut ? (
                            <span className="ml-2 text-xs text-text-secondary dark:text-gray-400">
                              ({formatRut(item.alumnoRut)})
                            </span>
                          ) : null}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-secondary dark:text-gray-400">
                          <span>Intento #{item.intento}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${estadoBadge}`}>
                            {estadoLabel}
                          </span>
                          {item.prorrogadaAt ? (
                            <span className="italic">
                              Reanudado el {new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(item.prorrogadaAt)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {item.estado !== "enviado" ? (
                        <RehabilitarIntentoActions
                          evaluacionId={selectedEvaluacionId ?? ""}
                          matriculaId={item.matriculaId}
                          intentoId={item.intentoId}
                          asignaturaId={selectedAsignaturaId ?? ""}
                          periodoId={selectedPeriodoId ?? ""}
                          redirectTo={`/admin/evaluaciones?periodoId=${selectedPeriodoId ?? ""}&asignaturaId=${selectedAsignaturaId ?? ""}&evaluacionId=${selectedEvaluacionId ?? ""}`}
                          disabled={item.estado === "anulado"}
                          alumnoLabel={`${item.alumnoNombre ?? ""} ${item.alumnoApellido ?? ""}`.trim() || "este alumno"}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-6 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <div className="flex items-center gap-2">
                {selectedEvaluacion?.modoSupervision ? (
                  <ShieldCheck className="h-4 w-4 text-cyan-500" />
                ) : (
                  <ShieldOff className="h-4 w-4 text-gray-400" />
                )}
                <div>
                  <h3 className="text-sm font-semibold text-text-primary dark:text-white">
                    Historial de supervisión
                  </h3>
                  <p className="text-xs text-text-secondary dark:text-gray-400">
                    Registra salida de pestaña, copia/pega, foco perdido y tiempo aproximado por pregunta.
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {eventosSupervision.length} evento{eventosSupervision.length !== 1 ? "s" : ""}
              </span>
            </div>
            {!selectedEvaluacion?.modoSupervision ? (
              <p className="px-4 py-5 text-sm text-text-secondary dark:text-gray-400">
                Activa supervisión en la tarjeta de la evaluación para empezar a registrar eventos. La captura de pantalla no es detectable de forma confiable desde navegador; solo se registra intento de tecla PrintScreen cuando el sistema lo informa.
              </p>
            ) : eventosSupervision.length === 0 ? (
              <p className="px-4 py-5 text-sm text-text-secondary dark:text-gray-400">
                Sin eventos registrados todavía.
              </p>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                {eventosSupervision.slice(-50).reverse().map((evento) => (
                  <div key={evento.id} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[1fr_auto]">
                    <div>
                      <p className="font-medium text-text-primary dark:text-gray-100">
                        {evento.tipo.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-text-secondary dark:text-gray-400">
                        {evento.alumnoNombre ? `${evento.alumnoNombre} ${evento.alumnoApellido ?? ""}`.trim() : "Alumno"} · {evento.alumnoRut ? formatRut(evento.alumnoRut) : "sin RUT"}
                      </p>
                      {evento.payload ? (
                        <p className="mt-1 break-all text-xs text-text-muted dark:text-gray-500">
                          {typeof evento.payload === "object" && evento.payload !== null && "data" in evento.payload
                            ? String((evento.payload as { data?: unknown }).data)
                            : JSON.stringify(evento.payload)}
                        </p>
                      ) : null}
                    </div>
                    <time className="text-xs text-text-secondary dark:text-gray-400">
                      {evento.createdAt ? new Date(evento.createdAt).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" }) : "-"}
                    </time>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6">
            <AuditTimeline eventos={auditoriaEventos} />
          </div>
        </article>
      )}
    </section>
  );
}
