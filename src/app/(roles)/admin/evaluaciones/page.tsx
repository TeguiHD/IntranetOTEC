import Link from "next/link";

import { BarChart2, CheckCircle2, ClipboardList, Eye, FileUp, ListChecks, Plus, Search, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";

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
  type PreguntaItem,
  type RespuestaPendienteItem,
} from "@/actions/evaluaciones";
import { AuditTimeline } from "@/components/evaluaciones/AuditTimeline";
import { EvaluacionParticipacionPanel } from "@/components/evaluaciones/EvaluacionParticipacionPanel";
import { RehabilitarIntentoActions } from "@/components/evaluaciones/RehabilitarIntentoActions";
import { EntityFilterSelect } from "@/components/shared/EntityFilterSelect";
import { PeriodoCursoSeccionPicker } from "@/components/shared/PeriodoCursoSeccionPicker";
import { Pagination } from "@/components/shared/Pagination";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { describeEvaluationWriteLock } from "@/lib/academic-state";
import { formatearRut } from "@/lib/rut";

const EVALUACIONES_PAGE_SIZE = 12;
const BANCO_PAGE_SIZE = 8;

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

const TABS = [
  { id: "evaluaciones", label: "Evaluaciones" },
  { id: "banco", label: "Banco Local" },
  { id: "maquetador", label: "Maquetador" },
  { id: "resultados", label: "Resultados" },
  { id: "supervision", label: "Supervisión" },
] as const;

type EvaluacionesTab = (typeof TABS)[number]["id"];

type AdminEvaluacionesPageProps = {
  searchParams?: Promise<{
    state?: string;
    periodoId?: string;
    asignaturaId?: string;
    evaluacionId?: string;
    tab?: string;
    evalQ?: string;
    evalEstado?: string;
    evalPage?: string;
    bankQ?: string;
    bankTipo?: string;
    bankPage?: string;
  }>;
};

const formatRut = (rut: string | null): string => {
  if (!rut) return "-";
  return rut.startsWith("EXT-") ? `Ext: ${rut.replace(/^EXT-/, "")}` : formatearRut(rut);
};

const normalizePage = (value: string | undefined): number =>
  Math.max(1, Number.parseInt(value ?? "1", 10) || 1);

const includesNormalized = (value: string | null | undefined, query: string): boolean =>
  (value ?? "").toLowerCase().includes(query.toLowerCase());

const buildEvaluacionesHref = (input: {
  periodoId?: string;
  asignaturaId?: string;
  evaluacionId?: string;
  tab?: EvaluacionesTab;
  evalQ?: string;
  evalEstado?: string;
  evalPage?: number;
  bankQ?: string;
  bankTipo?: string;
  bankPage?: number;
}) => {
  const query = new URLSearchParams();
  if (input.periodoId) query.set("periodoId", input.periodoId);
  if (input.asignaturaId) query.set("asignaturaId", input.asignaturaId);
  if (input.evaluacionId) query.set("evaluacionId", input.evaluacionId);
  if (input.tab && input.tab !== "evaluaciones") query.set("tab", input.tab);
  if (input.evalQ) query.set("evalQ", input.evalQ);
  if (input.evalEstado && input.evalEstado !== "todos") query.set("evalEstado", input.evalEstado);
  if (input.evalPage && input.evalPage > 1) query.set("evalPage", String(input.evalPage));
  if (input.bankQ) query.set("bankQ", input.bankQ);
  if (input.bankTipo && input.bankTipo !== "todos") query.set("bankTipo", input.bankTipo);
  if (input.bankPage && input.bankPage > 1) query.set("bankPage", String(input.bankPage));
  return `/admin/evaluaciones?${query.toString()}`;
};

const formatDate = (date: Date | null): string =>
  date ? new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(date) : "-";

const getCorrectaLabel = (pregunta: Pick<PreguntaItem, "tipo" | "opciones">): string | null => {
  const opciones = pregunta.opciones as { correcta?: number | string } | null;
  if (pregunta.tipo === "opcion_multiple" && typeof opciones?.correcta === "number") {
    return String.fromCharCode(65 + opciones.correcta);
  }
  if (pregunta.tipo === "verdadero_falso" && typeof opciones?.correcta === "string") {
    return opciones.correcta === "true" ? "Verdadero" : "Falso";
  }
  return null;
};

const isObjectiveQuestion = (tipo: PreguntaItem["tipo"]): boolean =>
  tipo === "opcion_multiple" || tipo === "verdadero_falso";

const parsePuntaje = (value: string | null): number => {
  const parsed = Number.parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

export const metadata = {
  title: "Evaluaciones",
};

export default async function AdminEvaluacionesPage({
  searchParams,
}: AdminEvaluacionesPageProps) {
  const params = await (searchParams ??
    Promise.resolve({} as NonNullable<Awaited<AdminEvaluacionesPageProps["searchParams"]>>));
  const requestedTab = typeof params?.tab === "string" ? params.tab : "evaluaciones";
  const activeTab: EvaluacionesTab = TABS.some((tab) => tab.id === requestedTab)
    ? (requestedTab as EvaluacionesTab)
    : "evaluaciones";
  const evalQ = typeof params?.evalQ === "string" ? params.evalQ.trim() : "";
  const evalEstado = typeof params?.evalEstado === "string" ? params.evalEstado.trim() : "todos";
  const evalPage = normalizePage(params?.evalPage);
  const bankQ = typeof params?.bankQ === "string" ? params.bankQ.trim() : "";
  const bankTipo = typeof params?.bankTipo === "string" ? params.bankTipo.trim() : "todos";
  const bankPage = normalizePage(params?.bankPage);

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
  const filteredEvaluaciones = evaluaciones.filter((evaluacion) => {
    const matchesQuery =
      !evalQ ||
      includesNormalized(evaluacion.titulo, evalQ) ||
      includesNormalized(TIPO_LABELS[evaluacion.tipo] ?? evaluacion.tipo, evalQ);
    const matchesEstado =
      evalEstado === "todos" ||
      (evalEstado === "borrador" && !evaluacion.publicada) ||
      (evalEstado === "publicada" && Boolean(evaluacion.publicada)) ||
      (evalEstado === "supervisada" && Boolean(evaluacion.modoSupervision)) ||
      (evalEstado === "resultados" && Boolean(evaluacion.mostrarResultados));
    return matchesQuery && matchesEstado;
  });
  const evalTotalPages = Math.max(1, Math.ceil(filteredEvaluaciones.length / EVALUACIONES_PAGE_SIZE));
  const safeEvalPage = Math.min(evalPage, evalTotalPages);
  const paginatedEvaluaciones = filteredEvaluaciones.slice(
    (safeEvalPage - 1) * EVALUACIONES_PAGE_SIZE,
    safeEvalPage * EVALUACIONES_PAGE_SIZE,
  );
  const filteredPruebasLocales = pruebasLocales.filter((prueba) => {
    const matchesQuery =
      !bankQ ||
      includesNormalized(prueba.titulo, bankQ) ||
      includesNormalized(prueba.archivo, bankQ);
    const matchesTipo =
      bankTipo === "todos" ||
      (bankTipo === "seleccion" && prueba.resumen.opcionMultiple > 0) ||
      (bankTipo === "vf" && prueba.resumen.verdaderoFalso > 0) ||
      (bankTipo === "desarrollo" && prueba.resumen.desarrollo > 0);
    return matchesQuery && matchesTipo;
  });
  const bankTotalPages = Math.max(1, Math.ceil(filteredPruebasLocales.length / BANCO_PAGE_SIZE));
  const safeBankPage = Math.min(bankPage, bankTotalPages);
  const paginatedPruebasLocales = filteredPruebasLocales.slice(
    (safeBankPage - 1) * BANCO_PAGE_SIZE,
    safeBankPage * BANCO_PAGE_SIZE,
  );
  const selectedPruebaLocal = paginatedPruebasLocales[0] ?? filteredPruebasLocales[0] ?? null;
  const writeLockMessage = describeEvaluationWriteLock({
    periodoEstado: selectedPeriodo?.estado,
    asignaturaEstado: selectedAsignatura?.estado,
  });
  const baseRouteState = {
    periodoId: selectedPeriodoId,
    asignaturaId: selectedAsignaturaId,
    evaluacionId: selectedEvaluacionId,
    evalQ,
    evalEstado,
    evalPage: safeEvalPage,
    bankQ,
    bankTipo,
    bankPage: safeBankPage,
  };
  const currentEvaluacionesHref = buildEvaluacionesHref({ ...baseRouteState, tab: "evaluaciones" });
  const currentBancoHref = buildEvaluacionesHref({ ...baseRouteState, tab: "banco" });
  const currentMaquetadorHref = buildEvaluacionesHref({ ...baseRouteState, tab: "maquetador" });
  const currentResultadosHref = buildEvaluacionesHref({ ...baseRouteState, tab: "resultados" });
  const objectiveQuestions = preguntasSeleccionadas.filter((pregunta) => isObjectiveQuestion(pregunta.tipo));
  const preguntasSinPauta = objectiveQuestions.filter((pregunta) => !getCorrectaLabel(pregunta));
  const preguntasSinPuntaje = preguntasSeleccionadas.filter((pregunta) => parsePuntaje(pregunta.puntaje) <= 0);
  const puntajeTotal = preguntasSeleccionadas.reduce(
    (total, pregunta) => total + parsePuntaje(pregunta.puntaje),
    0,
  );
  const manualQuestions = preguntasSeleccionadas.filter((pregunta) => !isObjectiveQuestion(pregunta.tipo));
  const publicationChecks = [
    {
      label: "Preguntas",
      ok: preguntasSeleccionadas.length > 0,
      detail: `${preguntasSeleccionadas.length} cargada${preguntasSeleccionadas.length === 1 ? "" : "s"}`,
    },
    {
      label: "Pauta objetiva",
      ok: preguntasSinPauta.length === 0,
      detail: preguntasSinPauta.length === 0 ? "Sin pendientes" : `${preguntasSinPauta.length} sin pauta`,
    },
    {
      label: "Puntajes",
      ok: preguntasSinPuntaje.length === 0 && preguntasSeleccionadas.length > 0,
      detail: `${puntajeTotal.toLocaleString("es-CL", { maximumFractionDigits: 2 })} pts`,
    },
    {
      label: "Ventana",
      ok: Boolean(selectedEvaluacion?.fechaInicio && selectedEvaluacion?.fechaLimite),
      detail: selectedEvaluacion?.fechaLimite ? `Límite ${formatDate(selectedEvaluacion.fechaLimite)}` : "Sin fecha límite",
    },
    {
      label: "Tiempo",
      ok: Boolean(selectedEvaluacion?.duracionMinutos),
      detail: selectedEvaluacion?.duracionMinutos ? `${selectedEvaluacion.duracionMinutos} min` : "Sin temporizador",
    },
  ];

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
        <input type="hidden" name="tab" value={activeTab} />
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <PeriodoCursoSeccionPicker
            asForm={false}
            autoSubmit={false}
            layout="inline"
            periodos={periodos.map((periodo) => ({
              id: periodo.id,
              label: periodo.nombre,
              description: periodo.estado,
              badge: periodo.estado,
            }))}
            asignaturas={asignaturas.map((a) => ({
              id: a.id,
              label: a.nombre,
              badge: a.codigo,
            }))}
            selected={{
              periodoId: selectedPeriodoId,
              asignaturaId: selectedAsignaturaId,
            }}
            placeholders={{ asignatura: "Buscar sección…" }}
          />
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
        <nav
          aria-label="Flujo de evaluaciones"
          className="flex gap-2 overflow-x-auto rounded-2xl border border-gray-200/80 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          {TABS.map((tab) => (
            <Link
              key={tab.id}
              href={buildEvaluacionesHref({ ...baseRouteState, tab: tab.id })}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:bg-gray-100 hover:text-text-primary dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      )}

      {selectedAsignaturaId && evaluaciones.length > 0 && (activeTab === "maquetador" || activeTab === "resultados" || activeTab === "supervision") && (
        <form
          method="GET"
          className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <input type="hidden" name="periodoId" value={selectedPeriodoId} />
          <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
          <input type="hidden" name="tab" value={activeTab} />
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                Evaluación de trabajo
              </label>
              <EntityFilterSelect
                name="evaluacionId"
                defaultValue={selectedEvaluacionId}
                placeholder="Seleccionar evaluación"
                searchPlaceholder="Buscar por título, tipo o estado…"
                countLabel="evaluaciones"
                options={evaluaciones.map((evaluacion) => ({
                  id: evaluacion.id,
                  label: evaluacion.titulo,
                  description: `${TIPO_LABELS[evaluacion.tipo] ?? evaluacion.tipo} · ${evaluacion.totalPreguntas} pregunta${evaluacion.totalPreguntas === 1 ? "" : "s"}`,
                  badge: evaluacion.publicada ? "publicada" : "borrador",
                }))}
              />
            </div>
            <button
              type="submit"
              className="h-11 rounded-xl border border-primary/40 bg-primary/5 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 dark:border-primary-light/40 dark:text-primary-light"
            >
              Abrir
            </button>
          </div>
        </form>
      )}

      {selectedAsignaturaId && activeTab === "evaluaciones" && (
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
              <input type="hidden" name="redirectTo" value={currentEvaluacionesHref} />
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
              <input type="hidden" name="redirectTo" value={currentEvaluacionesHref} />
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

      {selectedAsignaturaId && activeTab === "evaluaciones" && (
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
            <input type="hidden" name="redirectTo" value={currentEvaluacionesHref} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <input
                name="titulo"
                placeholder="Título de la evaluación"
                required
                className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" inputMode="text"
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
                className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" inputMode="numeric"
              />
              <input
                name="fechaInicio"
                type="datetime-local"
                aria-label="Fecha de inicio"
                className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" inputMode="text"
              />
              <input
                name="fechaLimite"
                type="datetime-local"
                aria-label="Fecha límite"
                className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" inputMode="text"
              />
              <input
                name="tiempoMinutos"
                type="number"
                min="1"
                max="600"
                placeholder="Tiempo disponible (min)"
                className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" inputMode="numeric"
              />
              <input
                name="intentosMax"
                type="number"
                min="1"
                max="5"
                defaultValue="1"
                placeholder="Intentos máximos"
                className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" inputMode="numeric"
              />
            </div>
            <textarea
              name="instrucciones"
              rows={3}
              placeholder="Instrucciones para el alumno…"
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

      {selectedAsignaturaId && activeTab === "banco" && (
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
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
              <div className="space-y-4">
                <form method="GET" className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50 md:grid-cols-[minmax(0,1fr)_220px_auto]">
                  <input type="hidden" name="periodoId" value={selectedPeriodoId} />
                  <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
                  <input type="hidden" name="tab" value="banco" />
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      name="bankQ"
                      defaultValue={bankQ}
                      placeholder="Buscar por nombre de prueba o archivo…"
                      className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" inputMode="search"
                    />
                  </div>
                  <select
                    name="bankTipo"
                    defaultValue={bankTipo}
                    className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  >
                    <option value="todos">Todos los tipos</option>
                    <option value="seleccion">Con selección</option>
                    <option value="vf">Con V/F</option>
                    <option value="desarrollo">Con desarrollo</option>
                  </select>
                  <button
                    type="submit"
                    className="h-11 rounded-xl border border-primary/40 bg-primary/5 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 dark:border-primary-light/40 dark:text-primary-light"
                  >
                    Buscar
                  </button>
                </form>

                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-[minmax(0,1fr)_120px_120px] border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-text-secondary dark:border-gray-800 dark:bg-gray-800/70 dark:text-gray-400">
                    <span>Prueba</span>
                    <span>Preguntas</span>
                    <span>Composición</span>
                  </div>
                  {filteredPruebasLocales.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-text-secondary dark:text-gray-400">
                      No hay pruebas para esos filtros.
                    </p>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {paginatedPruebasLocales.map((prueba) => (
                        <div
                          key={prueba.id}
                          className="grid grid-cols-[minmax(0,1fr)_120px_120px] gap-3 px-4 py-3 text-sm transition-colors hover:bg-primary/5 dark:hover:bg-primary/10"
                        >
                          <span className="min-w-0">
                            <span className="line-clamp-2 font-semibold text-text-primary dark:text-gray-100">
                              {prueba.titulo}
                            </span>
                            <span className="mt-1 block truncate text-xs text-text-secondary dark:text-gray-400">
                              {prueba.archivo}
                            </span>
                          </span>
                          <span className="self-center font-semibold text-text-primary dark:text-gray-100">
                            {prueba.totalPreguntas}
                          </span>
                          <span className="flex flex-wrap items-center gap-1 self-center text-[11px] font-semibold">
                            <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                              {prueba.resumen.opcionMultiple} sel.
                            </span>
                            <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              {prueba.resumen.verdaderoFalso} V/F
                            </span>
                            {prueba.resumen.desarrollo > 0 ? (
                              <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                {prueba.resumen.desarrollo} des.
                              </span>
                            ) : null}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Pagination
                  currentPage={safeBankPage}
                  totalPages={bankTotalPages}
                  totalCount={filteredPruebasLocales.length}
                  pageSize={BANCO_PAGE_SIZE}
                  buildHref={(page) => buildEvaluacionesHref({ ...baseRouteState, tab: "banco", bankPage: page })}
                />
              </div>

              <form action={importarPruebaLocalFormAction} className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
                <input type="hidden" name="periodoId" value={selectedPeriodoId} />
                <input type="hidden" name="redirectTo" value={currentBancoHref} />
                <label htmlFor="bank-selected-file" className="block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                  Prueba seleccionada
                </label>
                <div id="bank-selected-file">
                  <EntityFilterSelect
                    name="archivo"
                    defaultValue={selectedPruebaLocal?.archivo}
                    placeholder="Seleccionar prueba"
                    searchPlaceholder="Buscar prueba filtrada…"
                    countLabel="pruebas"
                    autoSubmit={false}
                    options={filteredPruebasLocales.map((prueba) => ({
                      id: prueba.archivo,
                      label: `${prueba.titulo} (${prueba.totalPreguntas})`,
                      description: prueba.archivo,
                      badge: `${prueba.resumen.opcionMultiple}/${prueba.resumen.verdaderoFalso}/${prueba.resumen.desarrollo}`,
                    }))}
                  />
                </div>
                {selectedPruebaLocal ? (
                  <div className="rounded-lg border border-primary/20 bg-white p-3 text-xs text-text-secondary dark:border-primary/40 dark:bg-gray-900 dark:text-gray-400">
                    <p className="font-semibold text-text-primary dark:text-gray-100">{selectedPruebaLocal.titulo}</p>
                    <p className="mt-1 truncate">{selectedPruebaLocal.archivo}</p>
                    <p className="mt-2">
                      {selectedPruebaLocal.totalPreguntas} preguntas · {selectedPruebaLocal.resumen.opcionMultiple} selección · {selectedPruebaLocal.resumen.verdaderoFalso} V/F · {selectedPruebaLocal.resumen.desarrollo} desarrollo
                    </p>
                  </div>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    name="fechaInicio"
                    type="datetime-local"
                    aria-label="Fecha de inicio"
                    className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" inputMode="text"
                  />
                  <input
                    name="fechaLimite"
                    type="datetime-local"
                    aria-label="Fecha límite"
                    className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" inputMode="text"
                  />
                  <input
                    name="tiempoMinutos"
                    type="number"
                    min="1"
                    max="600"
                    placeholder="Tiempo min."
                    className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" inputMode="numeric"
                  />
                  <input
                    name="intentosMax"
                    type="number"
                    min="1"
                    max="5"
                    defaultValue="1"
                    placeholder="Intentos"
                    className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" inputMode="numeric"
                  />
                </div>
                <input
                  name="ponderacion"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="Ponderación %"
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" inputMode="numeric"
                />
                <button
                  type="submit"
                  disabled={filteredPruebasLocales.length === 0}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-700 dark:disabled:text-gray-400"
                >
                  <FileUp className="h-4 w-4" />
                  Importar en borrador
                </button>
              </form>
            </div>
          )}
        </article>
      )}

      {selectedAsignaturaId && activeTab === "evaluaciones" && (
      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
              Evaluaciones registradas
            </h2>
          </div>
          <form method="GET" className="grid gap-2 sm:grid-cols-[minmax(0,240px)_180px_auto]">
            <input type="hidden" name="periodoId" value={selectedPeriodoId} />
            <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
            <input type="hidden" name="tab" value="evaluaciones" />
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                name="evalQ"
                defaultValue={evalQ}
                placeholder="Buscar evaluación…"
                className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" inputMode="search"
              />
            </div>
            <select
              name="evalEstado"
              defaultValue={evalEstado}
              className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="todos">Todos los estados</option>
              <option value="borrador">Borradores</option>
              <option value="publicada">Publicadas</option>
              <option value="supervisada">Supervisadas</option>
              <option value="resultados">Resultados visibles</option>
            </select>
            <button
              type="submit"
              className="h-10 rounded-xl border border-primary/40 bg-primary/5 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 dark:border-primary-light/40 dark:text-primary-light"
            >
              Aplicar
            </button>
          </form>
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
        ) : filteredEvaluaciones.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-text-secondary dark:border-gray-700 dark:text-gray-400">
            No hay evaluaciones que coincidan con los filtros.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-text-secondary dark:bg-gray-800/70 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Evaluación</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Preguntas</th>
                    <th className="px-4 py-3">Ponderación</th>
                    <th className="px-4 py-3">Límite</th>
                    <th className="px-4 py-3">Operación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {paginatedEvaluaciones.map((ev) => (
                    <tr key={ev.id} className="align-top hover:bg-gray-50/80 dark:hover:bg-gray-800/50">
                      <td className="min-w-[260px] px-4 py-3">
                        <p className="font-semibold text-text-primary dark:text-gray-100">
                          {ev.titulo}
                        </p>
                        <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                          {TIPO_LABELS[ev.tipo] ?? ev.tipo}
                          {ev.duracionMinutos ? ` · ${ev.duracionMinutos} min` : ""}
                          {ev.intentosMax ? ` · ${ev.intentosMax} intento${ev.intentosMax !== 1 ? "s" : ""}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
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
                          {ev.modoSupervision ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
                              <ShieldCheck className="h-3 w-3" />
                              Supervisada
                            </span>
                          ) : null}
                          {ev.mostrarResultados ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                              <BarChart2 className="h-3 w-3" />
                              Resultados
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-text-primary dark:text-gray-100">
                        {ev.totalPreguntas}
                      </td>
                      <td className="px-4 py-3 text-text-secondary dark:text-gray-400">
                        {ev.ponderacion ? `${ev.ponderacion}%` : "-"}
                      </td>
                      <td className="px-4 py-3 text-text-secondary dark:text-gray-400">
                        {formatDate(ev.fechaLimite)}
                      </td>
                      <td className="min-w-[360px] px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                    <form action={toggleModoSupervisionFormAction}>
                      <input type="hidden" name="evaluacionId" value={ev.id} />
                      <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
                      <input type="hidden" name="periodoId" value={selectedPeriodoId} />
                      <input type="hidden" name="redirectTo" value={currentEvaluacionesHref} />
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
                      <input type="hidden" name="redirectTo" value={currentEvaluacionesHref} />
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
                    <Link
                      href={buildEvaluacionesHref({ ...baseRouteState, tab: "resultados", evaluacionId: ev.id })}
                      className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                    >
                      Ver resultados
                    </Link>
                    {!ev.publicada && (
                      <form action={publicarEvaluacionFormAction}>
                        <input type="hidden" name="evaluacionId" value={ev.id} />
                        <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
                        <input type="hidden" name="periodoId" value={selectedPeriodoId} />
                        <input type="hidden" name="redirectTo" value={currentEvaluacionesHref} />
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
                        <input type="hidden" name="redirectTo" value={currentEvaluacionesHref} />
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
                      <input type="hidden" name="redirectTo" value={currentEvaluacionesHref} />
                      <button
                        type="submit"
                        className="flex items-center gap-1 rounded-lg border border-danger/30 bg-danger/5 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                      </button>
                    </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={safeEvalPage}
              totalPages={evalTotalPages}
              totalCount={filteredEvaluaciones.length}
              pageSize={EVALUACIONES_PAGE_SIZE}
              buildHref={(page) => buildEvaluacionesHref({ ...baseRouteState, tab: "evaluaciones", evalPage: page })}
            />
          </>
        )}
      </article>
      )}

      {selectedEvaluacionId && (activeTab === "maquetador" || activeTab === "resultados" || activeTab === "supervision") && (
        <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
                {activeTab === "maquetador" ? "Maquetador de prueba" : activeTab === "resultados" ? "Resultados y corrección" : "Supervisión y auditoría"}
              </h2>
              <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
                {selectedEvaluacion?.titulo ?? "Evaluación seleccionada"}
              </p>
            </div>
            {selectedAsignatura?.codigo && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {selectedAsignatura.codigo}
              </span>
            )}
          </div>

          {activeTab === "maquetador" && (
          <>
          <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
            <aside className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                <h3 className="text-sm font-semibold text-text-primary dark:text-white">
                  Checklist de publicación
                </h3>
                <div className="mt-3 space-y-2">
                  {publicationChecks.map((item) => (
                    <div key={item.label} className="flex items-start gap-2 rounded-lg bg-white px-3 py-2 text-xs dark:bg-gray-900">
                      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                        item.ok ? "bg-success/15 text-success" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                      }`}>
                        {item.ok ? <CheckCircle2 className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-text-primary dark:text-gray-100">{item.label}</span>
                        <span className="block truncate text-text-secondary dark:text-gray-400">{item.detail}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                  <h3 className="text-sm font-semibold text-text-primary dark:text-white">Índice de preguntas</h3>
                  <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                    {objectiveQuestions.length} objetivas · {manualQuestions.length} manuales
                  </p>
                </div>
                {preguntasSeleccionadas.length === 0 ? (
                  <p className="px-4 py-5 text-sm text-text-secondary dark:text-gray-400">
                    Sin preguntas todavía.
                  </p>
                ) : (
                  <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                    {preguntasSeleccionadas.map((pregunta, index) => {
                      const correcta = getCorrectaLabel(pregunta);
                      const objetiva = isObjectiveQuestion(pregunta.tipo);
                      return (
                        <div key={pregunta.id} className="px-4 py-3 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-text-primary dark:text-gray-100">
                              #{pregunta.orden ?? index + 1}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 font-semibold ${
                              !objetiva || correcta
                                ? "bg-success/10 text-success"
                                : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                            }`}>
                              {!objetiva ? "Manual" : correcta ? "OK" : "Sin pauta"}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-text-secondary dark:text-gray-400">
                            {pregunta.enunciado}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </aside>

            <div className="min-w-0 space-y-5">
          <form action={agregarPreguntaFormAction} className="mb-6 grid gap-4 rounded-xl border border-dashed border-primary/30 bg-primary/[0.03] p-4 dark:border-primary/40 dark:bg-primary/10">
            <input type="hidden" name="evaluacionId" value={selectedEvaluacionId} />
            <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
            <input type="hidden" name="periodoId" value={selectedPeriodoId} />
            <input type="hidden" name="redirectTo" value={currentMaquetadorHref} />
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-text-primary dark:text-white">
                Agregar pregunta
              </h3>
            </div>
            <textarea
              name="enunciado"
              rows={2}
              placeholder="Enunciado de la pregunta…"
              aria-label="Enunciado de la pregunta"
              required
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
            <div className="grid gap-3 md:grid-cols-[1.2fr_120px_120px_140px]">
              <select
                name="tipo"
                defaultValue="opcion_multiple"
                aria-label="Tipo de pregunta"
                className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="opcion_multiple">Opción múltiple</option>
                <option value="verdadero_falso">Verdadero/Falso</option>
                <option value="desarrollo">Desarrollo</option>
                <option value="respuesta_corta">Respuesta corta</option>
              </select>
              <input name="puntaje" type="number" min="0" step="0.01" defaultValue="1" placeholder="Puntaje" aria-label="Puntaje de la pregunta" className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-800" inputMode="numeric" />
              <input name="orden" type="number" min="1" placeholder="Orden" aria-label="Orden de la pregunta" className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-800" inputMode="numeric" />
              <select name="correcta" defaultValue="" aria-label="Respuesta correcta" className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
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
                  aria-label={`Alternativa ${label}`}
                  className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" inputMode="text"
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
                  const correcta = getCorrectaLabel(pregunta);

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
            </div>
          </div>
          </>
          )}

          {activeTab === "resultados" && (
          <>
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
                      <input type="hidden" name="redirectTo" value={currentResultadosHref} />
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
                          className="mt-1 w-24 rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" inputMode="numeric"
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
                          placeholder="Retroalimentación para el alumno…"
                          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" inputMode="text"
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
                          redirectTo={currentResultadosHref}
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
          </>
          )}

          {activeTab === "supervision" && (
          <>
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
          </>
          )}
        </article>
      )}

      {selectedAsignaturaId && !selectedEvaluacionId && (activeTab === "maquetador" || activeTab === "resultados" || activeTab === "supervision") && (
        <article className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <ClipboardList className="mx-auto h-9 w-9 text-gray-300 dark:text-gray-600" />
          <p className="mt-3 text-sm font-semibold text-text-primary dark:text-white">
            No hay una evaluación seleccionada
          </p>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Crea o importa una evaluación para abrir el maquetador, resultados y supervisión.
          </p>
          <Link
            href={buildEvaluacionesHref({ ...baseRouteState, tab: "evaluaciones" })}
            className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
          >
            Ir a Evaluaciones
          </Link>
        </article>
      )}
    </section>
  );
}
