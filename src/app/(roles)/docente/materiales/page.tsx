import Link from "next/link";

import { BookOpen, ClipboardList, FileText, Trash2, Upload } from "lucide-react";

import { listarAsignaturasDocente, listarClasesDocente } from "@/actions/docente";
import {
  editarMaterialFormAction,
  eliminarMaterialFormAction,
  listarMaterialPorAsignatura,
  subirMaterialFormAction,
} from "@/actions/material";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { normalizarTextoVisible } from "@/lib/displayText";

export const metadata = {
  title: "Materiales",
};

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  material_uploaded: { tone: "success", text: "Material subido correctamente y visible para alumnos." },
  material_updated: { tone: "success", text: "Material actualizado correctamente." },
  material_deleted: { tone: "success", text: "Material eliminado correctamente." },
  duplicate: { tone: "error", text: "Ese archivo ya fue subido a esta clase." },
  invalid_input: { tone: "error", text: "Faltan datos para subir el material." },
  file_too_large: { tone: "error", text: "El archivo excede 50 MB." },
  invalid_type: { tone: "error", text: "Tipo de archivo no permitido." },
  forbidden: { tone: "error", text: "No tienes permisos para esa asignatura." },
  not_found: { tone: "error", text: "No se encontro la clase o el material." },
  error: { tone: "error", text: "No fue posible completar la accion." },
};

type DocenteMaterialesPageProps = {
  searchParams?: Promise<{
    state?: string;
    asignaturaId?: string;
  }>;
};

const formatBytes = (value: number | null): string => {
  if (!value) return "-";
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export default async function DocenteMaterialesPage({ searchParams }: DocenteMaterialesPageProps) {
  const params = await (searchParams ?? Promise.resolve({} as NonNullable<Awaited<DocenteMaterialesPageProps["searchParams"]>>));
  const asignaturas = await listarAsignaturasDocente();
  const requestedAsignaturaId = typeof params?.asignaturaId === "string" ? params.asignaturaId : "";
  const selectedAsignaturaId =
    requestedAsignaturaId && asignaturas.some((asignatura) => asignatura.id === requestedAsignaturaId)
      ? requestedAsignaturaId
      : asignaturas[0]?.id ?? "";
  const selectedAsignatura = asignaturas.find((asignatura) => asignatura.id === selectedAsignaturaId) ?? null;

  const [clases, materialesSeleccionados, materialesPorAsignatura] = selectedAsignaturaId
    ? await Promise.all([
        listarClasesDocente(selectedAsignaturaId),
        listarMaterialPorAsignatura(selectedAsignaturaId),
        Promise.all(
          asignaturas.map(async (asignatura) => ({
            asignatura,
            materiales: await listarMaterialPorAsignatura(asignatura.id),
          })),
        ),
      ])
    : [[], [], []] as [
        Awaited<ReturnType<typeof listarClasesDocente>>,
        Awaited<ReturnType<typeof listarMaterialPorAsignatura>>,
        { asignatura: Awaited<ReturnType<typeof listarAsignaturasDocente>>[number]; materiales: Awaited<ReturnType<typeof listarMaterialPorAsignatura>> }[],
      ];
  const clasesOrdenadas = [...clases].sort((a, b) => a.numeroSesion - b.numeroSesion);
  const totalMateriales = materialesPorAsignatura.reduce(
    (total, item) => total + item.materiales.length,
    0,
  );

  return (
    <section className="space-y-5">
      <RouteStateToast state={params?.state} map={STATUS_MAP} />

      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Materiales
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Sube PDFs y archivos de apoyo a clases existentes. Lo subido queda visible para alumnos matriculados.
          </p>
        </div>
        <Link
          href="/docente/pruebas"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10 dark:border-primary-light/40 dark:text-primary-light"
        >
          <ClipboardList className="h-4 w-4" />
          Ver pruebas
        </Link>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-2xl font-bold text-primary">{asignaturas.length}</p>
          <p className="text-xs text-text-secondary dark:text-gray-400">Asignaturas asignadas</p>
        </article>
        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-2xl font-bold text-emerald-500">{totalMateriales}</p>
          <p className="text-xs text-text-secondary dark:text-gray-400">Archivos subidos</p>
        </article>
        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-2xl font-bold text-violet-500">{materialesSeleccionados.length}</p>
          <p className="text-xs text-text-secondary dark:text-gray-400">En asignatura seleccionada</p>
        </article>
      </div>

      {asignaturas.length === 0 ? (
        <article className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900">
          <BookOpen className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="mt-3 text-sm font-semibold text-text-primary dark:text-white">
            No tienes asignaturas asignadas.
          </p>
        </article>
      ) : (
        <>
          <form
            method="GET"
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <label className="block text-sm font-medium text-text-secondary dark:text-gray-400">
                Asignatura
                <select
                  name="asignaturaId"
                  defaultValue={selectedAsignaturaId}
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  {asignaturas.map((asignatura) => (
                    <option key={asignatura.id} value={asignatura.id}>
                      {normalizarTextoVisible(asignatura.nombre)} ({asignatura.codigo ?? "SIN-CODIGO"})
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
              >
                Cargar
              </button>
            </div>
          </form>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
            <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-text-primary dark:text-white">
                    Material visible en esta asignatura
                  </h2>
                  <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                    {normalizarTextoVisible(selectedAsignatura?.nombre) || "Selecciona una asignatura"} - {materialesSeleccionados.length} archivo{materialesSeleccionados.length === 1 ? "" : "s"}
                  </p>
                </div>
                <Link
                  href={`/docente/asignaturas/${selectedAsignaturaId}/evaluaciones`}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/40 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10 dark:border-primary-light/40 dark:text-primary-light"
                >
                  <ClipboardList className="h-4 w-4" />
                  Pruebas del curso
                </Link>
              </div>

              {materialesSeleccionados.length === 0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
                  <FileText className="mx-auto h-9 w-9 text-gray-300 dark:text-gray-600" />
                  <p className="mt-3 text-sm font-semibold text-text-primary dark:text-white">
                    No hay material cargado para esta asignatura.
                  </p>
                </div>
              ) : (
                <div className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
                  {materialesSeleccionados.map((item) => (
                    <div key={item.id} className="space-y-3 px-4 py-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-text-primary dark:text-white">
                            {normalizarTextoVisible(item.nombre)}
                          </p>
                          <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                            {normalizarTextoVisible(selectedAsignatura?.nombre)} - Sesion {item.claseNumeroSesion}: {normalizarTextoVisible(item.claseTitulo)} - {formatBytes(item.tamanioBytes)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={`/api/files/download/${item.id}`}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary-dark"
                          >
                            Abrir PDF
                          </a>
                          <form action={eliminarMaterialFormAction}>
                            <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
                            <input type="hidden" name="redirectTo" value="/docente/materiales" />
                            <input type="hidden" name="materialId" value={item.id} />
                            <button
                              type="submit"
                              className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/40"
                            >
                              <Trash2 className="h-4 w-4" />
                              Eliminar
                            </button>
                          </form>
                        </div>
                      </div>
                      <details className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                        <summary className="cursor-pointer text-xs font-semibold text-text-primary dark:text-white">
                          Modificar titulo del material
                        </summary>
                        <form action={editarMaterialFormAction} className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                          <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
                          <input type="hidden" name="redirectTo" value="/docente/materiales" />
                          <input type="hidden" name="materialId" value={item.id} />
                          <input
                            name="nombre"
                            defaultValue={normalizarTextoVisible(item.nombre)}
                            minLength={3}
                            required
                            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                          />
                          <button
                            type="submit"
                            className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-dark"
                          >
                            Guardar
                          </button>
                        </form>
                      </details>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-text-primary dark:text-white">
                  Subir material
                </h2>
              </div>
              <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                {normalizarTextoVisible(selectedAsignatura?.nombre) || "Selecciona una asignatura"}
              </p>

              <form action={subirMaterialFormAction} className="mt-4 space-y-4" encType="multipart/form-data">
                <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
                <input type="hidden" name="redirectTo" value="/docente/materiales" />
                <label className="block text-sm font-medium text-text-secondary dark:text-gray-400">
                  Clase
                  <select
                    name="claseId"
                    required
                    disabled={clasesOrdenadas.length === 0}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    {clasesOrdenadas.map((clase) => (
                      <option key={clase.id} value={clase.id}>
                        Sesion {clase.numeroSesion}: {normalizarTextoVisible(clase.titulo)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-text-secondary dark:text-gray-400">
                  Archivo
                  <input
                    type="file"
                    name="archivo"
                    required
                    disabled={!selectedAsignaturaId || clasesOrdenadas.length === 0}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv,.mp4,.webm,.zip"
                    className="mt-1 w-full rounded-xl border border-dashed border-gray-300 bg-white px-3 py-2 text-sm text-text-primary file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </label>
                <button
                  type="submit"
                  disabled={!selectedAsignaturaId || clasesOrdenadas.length === 0}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Upload className="h-4 w-4" />
                  Subir a alumnos
                </button>
              </form>
            </article>

          </div>

          <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-base font-semibold text-text-primary dark:text-white">
              Resumen por asignatura
            </h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {materialesPorAsignatura.map(({ asignatura, materiales }) => (
                <Link
                  key={asignatura.id}
                  href={`/docente/materiales?asignaturaId=${asignatura.id}`}
                  className="rounded-xl border border-gray-200 p-4 transition hover:border-primary/40 hover:bg-primary/5 dark:border-gray-700 dark:hover:bg-primary/10"
                >
                  <p className="font-semibold text-text-primary dark:text-white">
                    {normalizarTextoVisible(asignatura.nombre)}
                  </p>
                  <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                    {asignatura.codigo ?? "Sin codigo"} - {materiales.length} archivo{materiales.length === 1 ? "" : "s"}
                  </p>
                </Link>
              ))}
            </div>
          </article>
        </>
      )}
    </section>
  );
}
