"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import { BookOpen, ChevronRight, Clock, FileText, MapPin, Shield, Upload, X } from "lucide-react";
import Link from "next/link";

import { registrarAsistenciaDocenteAction } from "@/actions/docente";
import { listarClasePorAsignaturaYFecha, type ClaseDia } from "@/actions/docente-calendario";
import { subirMaterialFormAction } from "@/actions/material";
import { QrAsistenciaButton } from "@/components/docente/QrAsistenciaButton";

type EstadoAsist = "presente" | "ausente" | "tardanza" | "justificado";

const ESTADO_CONFIG: Record<EstadoAsist, { label: string; btn: string; activBtn: string }> = {
  presente:    { label: "Presente",    btn: "border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400", activBtn: "bg-emerald-500 text-white border-emerald-500" },
  tardanza:    { label: "Tardanza",    btn: "border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400",           activBtn: "bg-amber-400 text-white border-amber-400" },
  ausente:     { label: "Ausente",     btn: "border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-400",                 activBtn: "bg-rose-500 text-white border-rose-500" },
  justificado: { label: "Justificado", btn: "border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400",                 activBtn: "bg-blue-500 text-white border-blue-500" },
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
};

function iconTipo() {
  return <FileText className="h-4 w-4 text-gray-400" />;
}

export function PanelClase({
  asignaturaId,
  asignaturaNombre,
  fecha,
  diaNombre,
  horaInicio,
  horaFin,
  sala,
  onClose,
}: Props) {
  const [clase, setClase] = useState<ClaseDia | null | undefined>(undefined);
  const [loading, startLoad] = useTransition();
  const [estadosLocales, setEstadosLocales] = useState<Record<string, EstadoAsist>>({});
  const [pendiente, startSave] = useTransition();
  const [showMaterialForm, setShowMaterialForm] = useState(false);

  useEffect(() => {
    startLoad(async () => {
      const data = await listarClasePorAsignaturaYFecha(asignaturaId, fecha);
      setClase(data);
      if (data) {
        const init: Record<string, EstadoAsist> = {};
        for (const a of data.alumnos) {
          if (a.estado) init[a.matriculaId] = a.estado as EstadoAsist;
        }
        setEstadosLocales(init);
      }
    });
  }, [asignaturaId, fecha]);

  const marcar = useCallback(
    (matriculaId: string, estado: EstadoAsist) => {
      if (!clase) return;
      setEstadosLocales((prev) => ({ ...prev, [matriculaId]: estado }));
      startSave(async () => {
        await registrarAsistenciaDocenteAction({
          claseId: clase.id,
          matriculaId,
          estado,
          fechaRegistro: fecha,
        });
      });
    },
    [clase, fecha],
  );

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col overflow-y-auto bg-white shadow-2xl dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="flex-1 min-w-0">
            <p className="truncate text-base font-bold text-text-primary dark:text-white">
              {asignaturaNombre}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-text-secondary dark:text-gray-400">
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
            className="rounded-lg p-1.5 text-text-secondary hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Cerrar panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading && (
          <div className="flex flex-1 items-center justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {!loading && clase === null && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <Clock className="h-10 w-10 text-gray-300 dark:text-gray-700" />
            <p className="text-sm font-semibold text-text-primary dark:text-white">Sin clase este día</p>
            <p className="text-xs text-text-secondary dark:text-gray-400">
              No hay clase registrada para esta asignatura en esta fecha. Contacta a administración para generar las clases desde los bloques horarios.
            </p>
          </div>
        )}

        {!loading && clase && (
          <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
            {/* Asistencia */}
            <section className="space-y-3 px-5 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                  Asistencia — S{clase.numeroSesion}
                </h2>
                <QrAsistenciaButton
                  claseId={clase.id}
                  claseNombre={`Sesión ${clase.numeroSesion} – ${clase.titulo}`}
                />
              </div>

              {clase.alumnos.length === 0 ? (
                <p className="text-xs text-text-secondary dark:text-gray-400">Sin alumnos matriculados.</p>
              ) : (
                <div className="divide-y divide-gray-50 rounded-xl border border-gray-100 dark:divide-gray-800/60 dark:border-gray-800">
                  {clase.alumnos.map((alumno) => {
                    const estadoActual = estadosLocales[alumno.matriculaId] ?? null;
                    return (
                      <div key={alumno.matriculaId} className="space-y-1.5 px-3 py-2.5">
                        <p className="text-sm font-medium text-text-primary dark:text-white">
                          {alumno.alumnoApellido}, {alumno.alumnoNombre}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {(["presente", "ausente", "tardanza", "justificado"] as const).map((est) => {
                            const cfg = ESTADO_CONFIG[est];
                            const active = estadoActual === est;
                            return (
                              <button
                                key={est}
                                type="button"
                                onClick={() => marcar(alumno.matriculaId, est)}
                                disabled={pendiente}
                                className={[
                                  "h-8 rounded-lg border px-2.5 text-xs font-semibold transition-all active:scale-95 disabled:opacity-60",
                                  active ? cfg.activBtn : cfg.btn,
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
            </section>

            {/* Material */}
            <section className="space-y-3 px-5 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                  Material
                </h2>
                <button
                  type="button"
                  onClick={() => setShowMaterialForm((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Subir
                </button>
              </div>

              {showMaterialForm && (
                <form
                  action={subirMaterialFormAction}
                  encType="multipart/form-data"
                  className="space-y-2 rounded-xl border border-dashed border-primary/30 p-3"
                >
                  <input type="hidden" name="asignaturaId" value={asignaturaId} />
                  <input type="hidden" name="claseId" value={clase.id} />
                  <input
                    name="nombre"
                    placeholder="Nombre del material"
                    required
                    maxLength={200}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                  <textarea
                    name="descripcion"
                    placeholder="Descripción (opcional)"
                    rows={2}
                    maxLength={500}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                  <input
                    name="archivo"
                    type="file"
                    required
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv,.mp4,.webm,.zip"
                    className="w-full text-sm text-text-secondary file:mr-2 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary"
                  />
                  <button
                    type="submit"
                    className="h-9 w-full rounded-lg bg-primary text-sm font-semibold text-white hover:bg-primary-dark"
                  >
                    Subir archivo
                  </button>
                </form>
              )}

              {clase.materiales.length === 0 && !showMaterialForm ? (
                <p className="text-xs text-text-secondary dark:text-gray-400">Sin material para esta clase aún.</p>
              ) : (
                <div className="space-y-1.5">
                  {clase.materiales.map((m) => (
                    <a
                      key={m.id}
                      href={`/api/files/download/${m.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 hover:border-primary/30 hover:bg-primary/5 dark:border-gray-800 dark:bg-gray-800/50 dark:hover:border-primary/40"
                    >
                      {iconTipo()}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-primary dark:text-white">{m.nombre}</p>
                      </div>
                      {m.tamanioBytes && (
                        <span className="shrink-0 text-xs text-text-muted dark:text-gray-500">
                          {(m.tamanioBytes / 1024).toFixed(0)} KB
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </section>

            {/* Pruebas */}
            <section className="px-5 py-4">
              <Link
                href="/docente/pruebas"
                className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 hover:border-primary/30 hover:bg-primary/5 dark:border-gray-800 dark:bg-gray-800/50"
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="h-4 w-4 text-violet-500" />
                  <span className="text-sm font-semibold text-text-primary dark:text-white">Ir a Pruebas</span>
                </div>
                <ChevronRight className="h-4 w-4 text-text-secondary dark:text-gray-400" />
              </Link>
            </section>
          </div>
        )}
      </aside>
    </>
  );
}
