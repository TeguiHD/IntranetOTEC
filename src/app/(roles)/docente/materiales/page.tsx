import { Eye, EyeOff, File, FileImage, FileText, FileVideo, Folder, Package } from "lucide-react";

import {
  cambiarEstadoMaterialFormAction,
  editarMaterialFormAction,
  eliminarMaterialFormAction,
  listarMaterialBibliotecaDocente,
} from "@/actions/material";
import { SubirMaterialSheet } from "@/components/docente/SubirMaterialSheet";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { normalizarTextoVisible } from "@/lib/displayText";

export const metadata = { title: "Mis Materiales" };

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  material_uploaded: { tone: "success", text: "Archivo subido y visible para alumnos." },
  material_updated: { tone: "success", text: "Nombre actualizado." },
  material_deleted: { tone: "success", text: "Archivo eliminado." },
  material_enabled: { tone: "success", text: "Archivo ahora visible para alumnos." },
  material_disabled: { tone: "success", text: "Archivo ocultado para alumnos." },
  duplicate: { tone: "error", text: "Ese archivo ya fue subido a esta sesión." },
  invalid_input: { tone: "error", text: "Faltan datos para subir el archivo." },
  file_too_large: { tone: "error", text: "El archivo excede 50 MB." },
  invalid_type: { tone: "error", text: "Tipo de archivo no permitido." },
  forbidden: { tone: "error", text: "No tienes permiso sobre esta asignatura." },
  not_found: { tone: "error", text: "No se encontró la sesión o el archivo." },
  error: { tone: "error", text: "No fue posible completar la acción." },
};

function formatBytes(value: number | null): string {
  if (!value) return "";
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatFecha(fecha: string): string {
  const d = new Date(fecha + "T12:00:00");
  return d.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" });
}

function FileIconBadge({ nombre }: { nombre: string }) {
  const ext = nombre.toLowerCase().split(".").pop() ?? "";
  const isPdf = ext === "pdf";
  const isDoc = ["doc", "docx"].includes(ext);
  const isXls = ["xls", "xlsx"].includes(ext);
  const isImg = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
  const isVideo = ["mp4", "webm"].includes(ext);
  const isZip = ["zip"].includes(ext);

  if (isPdf)
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950">
        <FileText className="h-4 w-4 text-red-500 dark:text-red-400" />
      </span>
    );
  if (isDoc)
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950">
        <FileText className="h-4 w-4 text-blue-500 dark:text-blue-400" />
      </span>
    );
  if (isXls)
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950">
        <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      </span>
    );
  if (isImg)
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950">
        <FileImage className="h-4 w-4 text-purple-500 dark:text-purple-400" />
      </span>
    );
  if (isVideo)
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950">
        <FileVideo className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
      </span>
    );
  if (isZip)
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
        <Package className="h-4 w-4 text-gray-500 dark:text-gray-400" />
      </span>
    );
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
      <File className="h-4 w-4 text-gray-500 dark:text-gray-400" />
    </span>
  );
}

export default async function DocenteMaterialesPage({
  searchParams,
}: {
  searchParams?: Promise<{ state?: string }>;
}) {
  const params = await (searchParams ?? Promise.resolve({} as { state?: string }));
  const biblioteca = await listarMaterialBibliotecaDocente();

  const totalArchivos = biblioteca.reduce((n, a) => n + a.totalArchivos, 0);
  const totalVisibles = biblioteca.reduce((n, a) => n + a.totalVisibles, 0);
  const totalCursos = biblioteca.filter((a) => a.totalArchivos > 0).length;

  const asignaturasParaSheet = biblioteca.map((a) => ({
    id: a.asignaturaId,
    nombre: a.asignaturaNombre,
    clases: a.todasLasClases,
  }));

  return (
    <section className="space-y-6">
      <RouteStateToast state={params.state} map={STATUS_MAP} />

      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Mis Materiales
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Archivos organizados por curso y sesión. Los visibles están disponibles para alumnos matriculados.
          </p>
        </div>
        <div className="shrink-0">
          <SubirMaterialSheet asignaturas={asignaturasParaSheet} />
        </div>
      </header>

      {/* Stats */}
      {totalArchivos > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-text-primary dark:bg-gray-800 dark:text-white">
            <File className="h-3.5 w-3.5" />
            {totalArchivos} archivo{totalArchivos !== 1 ? "s" : ""}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-text-primary dark:bg-gray-800 dark:text-white">
            <Folder className="h-3.5 w-3.5" />
            {totalCursos} curso{totalCursos !== 1 ? "s" : ""}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <Eye className="h-3.5 w-3.5" />
            {totalVisibles} visible{totalVisibles !== 1 ? "s" : ""}
          </span>
          {totalArchivos - totalVisibles > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-text-secondary dark:bg-gray-800 dark:text-gray-400">
              <EyeOff className="h-3.5 w-3.5" />
              {totalArchivos - totalVisibles} oculto{totalArchivos - totalVisibles !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* Empty state */}
      {biblioteca.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-900">
          <Folder className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="mt-3 text-sm font-semibold text-text-primary dark:text-white">
            Sin asignaturas asignadas
          </p>
          <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
            Cuando tengas asignaturas activas podrás subir material para tus alumnos.
          </p>
        </div>
      )}

      {/* Biblioteca por curso */}
      <div className="space-y-3">
        {biblioteca.map((asig) => (
          <details
            key={asig.asignaturaId}
            className="group rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
            open={asig.totalArchivos > 0}
          >
            <summary className="flex cursor-pointer select-none items-center gap-3 px-5 py-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Folder className="h-4 w-4 text-primary" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text-primary dark:text-white">
                  {normalizarTextoVisible(asig.asignaturaNombre)}
                </p>
                <p className="mt-0.5 text-xs text-text-secondary dark:text-gray-400">
                  {asig.totalArchivos === 0
                    ? "Sin archivos"
                    : `${asig.totalArchivos} archivo${asig.totalArchivos !== 1 ? "s" : ""} · ${asig.totalVisibles} visible${asig.totalVisibles !== 1 ? "s" : ""}`}
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-primary group-open:hidden">
                Ver
              </span>
              <span className="hidden shrink-0 text-xs font-semibold text-text-secondary dark:text-gray-400 group-open:inline">
                Cerrar
              </span>
            </summary>

            <div className="border-t border-gray-100 dark:border-gray-800">
              {asig.sesiones.length === 0 ? (
                <div className="px-5 py-6 text-center">
                  <FileText className="mx-auto h-8 w-8 text-gray-200 dark:text-gray-700" />
                  <p className="mt-2 text-sm text-text-secondary dark:text-gray-400">
                    Sin archivos en este curso.
                  </p>
                  <p className="mt-0.5 text-xs text-text-secondary dark:text-gray-500">
                    Usa el botón <strong>Subir archivo</strong> para agregar material.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
                  {asig.sesiones.map((sesion) => (
                    <div key={sesion.claseId} className="px-5 py-4">
                      {/* Sesión header */}
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                        Sesión {sesion.numeroSesion} · {formatFecha(sesion.fecha)}
                      </p>

                      {/* Archivos */}
                      <div className="space-y-2">
                        {sesion.archivos.map((archivo) => (
                          <div
                            key={archivo.id}
                            className="rounded-xl border border-gray-100 bg-gray-50/60 dark:border-gray-800 dark:bg-gray-800/30"
                          >
                            {/* File row */}
                            <div className="flex items-center gap-3 px-3 py-2.5">
                              <FileIconBadge nombre={archivo.nombre} />

                              {/* Name + meta */}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-text-primary dark:text-white">
                                  {normalizarTextoVisible(archivo.nombre)}
                                </p>
                                <div className="mt-0.5 flex items-center gap-2">
                                  {formatBytes(archivo.tamanioBytes) && (
                                    <span className="text-xs text-text-secondary dark:text-gray-500">
                                      {formatBytes(archivo.tamanioBytes)}
                                    </span>
                                  )}
                                  <span
                                    className={[
                                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                      archivo.habilitado
                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                        : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
                                    ].join(" ")}
                                  >
                                    {archivo.habilitado ? (
                                      <Eye className="h-2.5 w-2.5" />
                                    ) : (
                                      <EyeOff className="h-2.5 w-2.5" />
                                    )}
                                    {archivo.habilitado ? "Visible" : "Oculto"}
                                  </span>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex shrink-0 items-center gap-1.5">
                                {/* Abrir */}
                                <a
                                  href={`/api/files/download/${archivo.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 dark:text-primary-light dark:hover:bg-primary/20"
                                >
                                  Abrir
                                </a>

                                {/* Visibilidad toggle */}
                                <form action={cambiarEstadoMaterialFormAction}>
                                  <input type="hidden" name="asignaturaId" value={asig.asignaturaId} />
                                  <input type="hidden" name="redirectTo" value="/docente/materiales" />
                                  <input type="hidden" name="materialId" value={archivo.id} />
                                  <input type="hidden" name="habilitado" value={archivo.habilitado ? "false" : "true"} />
                                  <button
                                    type="submit"
                                    title={archivo.habilitado ? "Ocultar para alumnos" : "Mostrar para alumnos"}
                                    className={[
                                      "flex h-8 w-8 items-center justify-center rounded-lg transition",
                                      archivo.habilitado
                                        ? "text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950"
                                        : "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950",
                                    ].join(" ")}
                                  >
                                    {archivo.habilitado ? (
                                      <EyeOff className="h-4 w-4" />
                                    ) : (
                                      <Eye className="h-4 w-4" />
                                    )}
                                  </button>
                                </form>

                                {/* Eliminar */}
                                <form action={eliminarMaterialFormAction}>
                                  <input type="hidden" name="asignaturaId" value={asig.asignaturaId} />
                                  <input type="hidden" name="redirectTo" value="/docente/materiales" />
                                  <input type="hidden" name="materialId" value={archivo.id} />
                                  <button
                                    type="submit"
                                    title="Eliminar archivo"
                                    onClick={(e) => {
                                      if (!confirm(`¿Eliminar "${normalizarTextoVisible(archivo.nombre)}"? Esta acción no se puede deshacer.`)) {
                                        e.preventDefault();
                                      }
                                    }}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="3 6 5 6 21 6" />
                                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                      <path d="M10 11v6M14 11v6" />
                                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                    </svg>
                                  </button>
                                </form>
                              </div>
                            </div>

                            {/* Rename (inline expand) */}
                            <details className="border-t border-gray-100 dark:border-gray-800">
                              <summary className="cursor-pointer px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary dark:text-gray-500 dark:hover:text-gray-300">
                                Renombrar
                              </summary>
                              <form
                                action={editarMaterialFormAction}
                                className="flex gap-2 px-3 pb-3 pt-2"
                              >
                                <input type="hidden" name="asignaturaId" value={asig.asignaturaId} />
                                <input type="hidden" name="redirectTo" value="/docente/materiales" />
                                <input type="hidden" name="materialId" value={archivo.id} />
                                <input
                                  name="nombre"
                                  defaultValue={normalizarTextoVisible(archivo.nombre)}
                                  minLength={3}
                                  required
                                  className="h-9 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                />
                                <button
                                  type="submit"
                                  className="h-9 rounded-lg bg-primary px-3 text-xs font-semibold text-white hover:bg-primary-dark"
                                >
                                  Guardar
                                </button>
                              </form>
                            </details>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
