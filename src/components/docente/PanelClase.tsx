"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import { ChevronRight, Clock, FileText, MapPin, PlayCircle, Shield, Upload, X } from "lucide-react";
import Link from "next/link";

import { registrarAsistenciaDocenteAction } from "@/actions/docente";
import { crearClaseDocente, listarClasePorAsignaturaYFecha, type ClaseDia } from "@/actions/docente-calendario";
import { subirMaterialAction } from "@/actions/material";
import { QrAsistenciaButton } from "@/components/docente/QrAsistenciaButton";

type EstadoAsist = "presente" | "ausente" | "tardanza" | "justificado";
type Tab = "asistencia" | "material" | "pruebas";

const ESTADO_CONFIG: Record<EstadoAsist, { label: string; dot: string; pill: string; activePill: string }> = {
  presente:    { label: "P",  dot: "bg-emerald-500", pill: "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400", activePill: "bg-emerald-500 border-emerald-500 text-white" },
  tardanza:    { label: "T",  dot: "bg-amber-400",   pill: "border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400",           activePill: "bg-amber-400 border-amber-400 text-white" },
  ausente:     { label: "A",  dot: "bg-rose-500",    pill: "border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400",                 activePill: "bg-rose-500 border-rose-500 text-white" },
  justificado: { label: "J",  dot: "bg-blue-500",    pill: "border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400",                 activePill: "bg-blue-500 border-blue-500 text-white" },
};

const ESTADO_LABELS: Record<EstadoAsist, string> = {
  presente: "Presente", ausente: "Ausente", tardanza: "Tardanza", justificado: "Justificado",
};

type Props = {
  asignaturaId: string;
  asignaturaNombre: string;
  fecha: string;
  diaNombre: string;
  horaInicio: string | null;
  horaFin: string | null;
  sala: string | null;
  onClose: () => void;
  pruebasHref: string;
};

export function PanelClase({
  asignaturaId,
  asignaturaNombre,
  fecha,
  diaNombre,
  horaInicio,
  horaFin,
  sala,
  onClose,
  pruebasHref,
}: Props) {
  const [clase, setClase] = useState<ClaseDia | null | undefined>(undefined);
  const [loading, startLoad] = useTransition();
  const [estadosLocales, setEstadosLocales] = useState<Record<string, EstadoAsist>>({});
  const [pendiente, startSave] = useTransition();
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);
  const [tab, setTab] = useState<Tab>("asistencia");
  const [creating, startCreate] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    startLoad(async () => {
      const data = await listarClasePorAsignaturaYFecha(asignaturaId, fecha);
      if (cancelled) return;
      setClase(data);
      if (data) {
        const init: Record<string, EstadoAsist> = {};
        for (const a of data.alumnos) {
          if (a.estado) init[a.matriculaId] = a.estado as EstadoAsist;
        }
        setEstadosLocales(init);
      }
    });
    return () => { cancelled = true; };
  }, [asignaturaId, fecha, fetchKey]);

  const marcar = useCallback(
    (matriculaId: string, estado: EstadoAsist) => {
      if (!clase) return;
      const previous = estadosLocales[matriculaId] ?? null;
      setEstadosLocales((prev) => ({ ...prev, [matriculaId]: estado }));
      startSave(async () => {
        const result = await registrarAsistenciaDocenteAction({
          claseId: clase.id,
          matriculaId,
          estado,
          fechaRegistro: fecha,
        });
        if (!result.ok) {
          setEstadosLocales((prev) => {
            const next = { ...prev };
            if (previous === null) delete next[matriculaId];
            else next[matriculaId] = previous;
            return next;
          });
        }
      });
    },
    [clase, fecha, estadosLocales],
  );

  const iniciarClase = () => {
    setCreateError(null);
    startCreate(async () => {
      const result = await crearClaseDocente({
        asignaturaId,
        fecha,
        horaInicio,
        horaFin,
        sala,
      });
      if (result.ok) {
        setFetchKey((k) => k + 1);
      } else {
        setCreateError(result.message);
      }
    });
  };

  const marcados = Object.keys(estadosLocales).length;
  const total = clase?.alumnos.length ?? 0;
  const presentes = Object.values(estadosLocales).filter((e) => e === "presente" || e === "tardanza").length;
  const pctPresencia = total > 0 && marcados > 0 ? Math.round((presentes / marcados) * 100) : null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-2xl dark:bg-gray-900">
        {/* Header */}
        <div className="flex shrink-0 items-start gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-text-primary dark:text-white">
              {asignaturaNombre}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-secondary dark:text-gray-400">
              <span>{diaNombre}</span>
              {horaInicio && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {horaInicio}{horaFin ? `–${horaFin}` : ""}
                </span>
              )}
              {sala && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {sala}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-text-secondary hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Cerrar panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 border-b border-gray-100 px-4 dark:border-gray-800">
          {(["asistencia", "material", "pruebas"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={[
                "relative px-3 py-3 text-xs font-semibold capitalize transition-colors",
                tab === t
                  ? "text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
                  : "text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-white",
              ].join(" ")}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {/* Sin clase — el docente puede iniciarla */}
        {!loading && clase === null && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <PlayCircle className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary dark:text-white">No hay clase activa para hoy</p>
              <p className="mt-1 max-w-xs text-xs text-text-secondary dark:text-gray-400">
                Inicia la sesión de hoy para pasar asistencia, subir material o activar pruebas.
              </p>
            </div>
            {createError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950 dark:text-red-400">
                {createError}
              </p>
            )}
            <button
              type="button"
              onClick={iniciarClase}
              disabled={creating}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:opacity-60"
            >
              {creating ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              Iniciar clase de hoy
            </button>
          </div>
        )}

        {/* Contenido por tab */}
        {!loading && clase && (
          <div className="flex-1 overflow-y-auto">

            {/* ── Tab Asistencia ── */}
            {tab === "asistencia" && (
              <div className="space-y-3 px-4 py-4">
                {/* Cabecera de sesión + QR */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                      Sesión {clase.numeroSesion}
                    </p>
                    {pctPresencia !== null && (
                      <p className="mt-0.5 text-xs text-text-secondary dark:text-gray-400">
                        {marcados}/{total} marcados · {presentes} presentes
                      </p>
                    )}
                  </div>
                  <QrAsistenciaButton
                    claseId={clase.id}
                    claseNombre={`Sesión ${clase.numeroSesion} – ${clase.titulo}`}
                  />
                </div>

                {/* Barra de progreso de asistencia */}
                {pctPresencia !== null && (
                  <div className="space-y-1">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className={[
                          "h-full rounded-full transition-all duration-500",
                          pctPresencia >= 75 ? "bg-emerald-500" : pctPresencia >= 50 ? "bg-amber-400" : "bg-rose-500",
                        ].join(" ")}
                        style={{ width: `${pctPresencia}%` }}
                      />
                    </div>
                    <p className={[
                      "text-right text-xs font-bold",
                      pctPresencia >= 75 ? "text-emerald-600 dark:text-emerald-400" : pctPresencia >= 50 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400",
                    ].join(" ")}>
                      {pctPresencia}% asistencia
                    </p>
                  </div>
                )}

                {clase.alumnos.length === 0 ? (
                  <p className="py-6 text-center text-xs text-text-secondary dark:text-gray-400">Sin alumnos matriculados.</p>
                ) : (
                  <div className="divide-y divide-gray-50 overflow-hidden rounded-xl border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
                    {clase.alumnos.map((alumno) => {
                      const estadoActual = estadosLocales[alumno.matriculaId] ?? null;
                      return (
                        <div key={alumno.matriculaId} className="px-3 py-2.5">
                          <div className="flex items-center gap-2 mb-1.5">
                            {estadoActual && (
                              <span className={`h-2 w-2 shrink-0 rounded-full ${ESTADO_CONFIG[estadoActual].dot}`} />
                            )}
                            <p className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary dark:text-white">
                              {alumno.alumnoApellido}, {alumno.alumnoNombre}
                            </p>
                            {estadoActual && (
                              <span className="shrink-0 text-xs text-text-secondary dark:text-gray-500">
                                {ESTADO_LABELS[estadoActual]}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1.5">
                            {(["presente", "ausente", "tardanza", "justificado"] as const).map((est) => {
                              const cfg = ESTADO_CONFIG[est];
                              const active = estadoActual === est;
                              return (
                                <button
                                  key={est}
                                  type="button"
                                  onClick={() => marcar(alumno.matriculaId, est)}
                                  disabled={pendiente}
                                  aria-label={ESTADO_LABELS[est]}
                                  className={[
                                    "h-8 flex-1 rounded-lg border text-xs font-bold transition-all active:scale-95 disabled:opacity-50",
                                    active ? cfg.activePill : cfg.pill,
                                  ].join(" ")}
                                >
                                  {cfg.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Tab Material ── */}
            {tab === "material" && (
              <div className="space-y-3 px-4 py-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                    Material de la sesión
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowMaterialForm((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Subir
                  </button>
                </div>

                {showMaterialForm && (
                  <form
                    encType="multipart/form-data"
                    className="space-y-2.5 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      await subirMaterialAction(fd);
                      setFetchKey((k) => k + 1);
                      setShowMaterialForm(false);
                    }}
                  >
                    <input type="hidden" name="asignaturaId" value={asignaturaId} />
                    <input type="hidden" name="claseId" value={clase.id} />
                    <label className="block text-xs font-semibold text-text-secondary dark:text-gray-400">
                      Nombre
                      <input
                        name="nombre"
                        required
                        maxLength={200}
                        placeholder="Ej: Guía práctica sesión 3"
                        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-text-secondary dark:text-gray-400">
                      Archivo
                      <input
                        name="archivo"
                        type="file"
                        required
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv,.mp4,.webm,.zip"
                        className="mt-1 w-full text-sm text-text-secondary file:mr-2 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary"
                      />
                    </label>
                    <button
                      type="submit"
                      className="h-9 w-full rounded-lg bg-primary text-sm font-semibold text-white hover:bg-primary-dark"
                    >
                      Subir archivo
                    </button>
                  </form>
                )}

                {clase.materiales.length === 0 && !showMaterialForm && (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <FileText className="h-8 w-8 text-gray-200 dark:text-gray-700" />
                    <p className="text-xs text-text-secondary dark:text-gray-400">Sin material subido para esta sesión.</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  {clase.materiales.map((m) => (
                    <a
                      key={m.id}
                      href={`/api/files/download/${m.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 transition hover:border-primary/30 hover:bg-primary/5 dark:border-gray-800 dark:bg-gray-800/50"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-primary/60" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-primary dark:text-white">{m.nombre}</p>
                        {m.tamanioBytes && (
                          <p className="text-xs text-text-secondary dark:text-gray-400">
                            {m.tamanioBytes >= 1048576
                              ? `${(m.tamanioBytes / 1048576).toFixed(1)} MB`
                              : `${(m.tamanioBytes / 1024).toFixed(0)} KB`}
                          </p>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* ── Tab Pruebas ── */}
            {tab === "pruebas" && (
              <div className="px-4 py-4">
                <Link
                  href={pruebasHref}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-4 transition hover:border-primary/30 hover:bg-primary/5 dark:border-gray-800 dark:bg-gray-800/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
                      <Shield className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary dark:text-white">Gestionar Pruebas</p>
                      <p className="text-xs text-text-secondary dark:text-gray-400">Crear, habilitar y ver respuestas</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-text-secondary dark:text-gray-400" />
                </Link>
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
