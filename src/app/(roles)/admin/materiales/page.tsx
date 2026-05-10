import Link from "next/link";

import { FileText, Trash2, Upload } from "lucide-react";

import { listarPeriodosDashboard } from "@/actions/admin-metricas";
import { listarAsignaturasAdmin } from "@/actions/asignaturas";
import { listarClasesAdmin } from "@/actions/clases";
import {
  eliminarMaterialAdminFormAction,
  listarMaterialPorAsignatura,
  subirMaterialAdminFormAction,
} from "@/actions/material";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { normalizarTextoVisible } from "@/lib/displayText";

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string; description?: string }> = {
  material_uploaded: {
    tone: "success",
    text: "Material subido correctamente.",
    description: "El archivo queda visible para los alumnos matriculados en el curso.",
  },
  material_deleted: { tone: "success", text: "Material eliminado correctamente." },
  duplicate: { tone: "error", text: "Ese archivo ya fue subido a la clase seleccionada." },
  invalid_input: { tone: "error", text: "Faltan datos para subir el material." },
  file_too_large: { tone: "error", text: "El archivo excede el maximo permitido de 50 MB." },
  invalid_type: { tone: "error", text: "El tipo de archivo esta bloqueado por seguridad." },
  forbidden: { tone: "error", text: "No tienes permisos para esa accion." },
  not_found: { tone: "error", text: "No se encontro la clase o el material." },
  error: { tone: "error", text: "No fue posible completar la accion." },
};

type AdminMaterialesPageProps = {
  searchParams?: Promise<{
    state?: string;
    periodoId?: string;
    asignaturaId?: string;
  }>;
};

const formatBytes = (value: number | null): string => {
  if (!value) return "-";
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export const metadata = {
  title: "Materiales",
};

export default async function AdminMaterialesPage({
  searchParams,
}: AdminMaterialesPageProps) {
  const params = await (searchParams ??
    Promise.resolve({} as NonNullable<Awaited<AdminMaterialesPageProps["searchParams"]>>));

  const periodos = await listarPeriodosDashboard();
  const requestedPeriodoId = typeof params?.periodoId === "string" ? params.periodoId : "";
  const defaultPeriodoId = periodos.find((periodo) => periodo.estado === "activo")?.id ?? periodos[0]?.id ?? "";
  const selectedPeriodoId =
    requestedPeriodoId && periodos.some((periodo) => periodo.id === requestedPeriodoId)
      ? requestedPeriodoId
      : defaultPeriodoId;

  const asignaturas = await listarAsignaturasAdmin(
    { limit: 1000, offset: 0 },
    { incluirArchivadas: false, periodoId: selectedPeriodoId || undefined },
  );
  const requestedAsignaturaId = typeof params?.asignaturaId === "string" ? params.asignaturaId : "";
  const selectedAsignaturaId =
    requestedAsignaturaId && asignaturas.some((asignatura) => asignatura.id === requestedAsignaturaId)
      ? requestedAsignaturaId
      : asignaturas[0]?.id ?? "";

  const selectedAsignatura = asignaturas.find((asignatura) => asignatura.id === selectedAsignaturaId) ?? null;
  const clases = selectedAsignaturaId
    ? await listarClasesAdmin(
        { limit: 500, offset: 0 },
        { asignaturaId: selectedAsignaturaId, incluirArchivadas: false },
      )
    : [];
  const clasesOrdenadas = [...clases].sort((a, b) => a.numeroSesion - b.numeroSesion);
  const materiales = selectedAsignaturaId
    ? await listarMaterialPorAsignatura(selectedAsignaturaId)
    : [];

  return (
    <section className="space-y-5">
      <RouteStateToast state={params?.state} map={STATUS_MAP} />

      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Materiales
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Sube material de apoyo a las clases existentes y revisa lo que veran los alumnos.
          </p>
        </div>
        <Link
          href="/admin/evaluaciones"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-text-primary transition hover:bg-gray-50 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800"
        >
          <FileText className="h-4 w-4" />
          Ver evaluaciones
        </Link>
      </header>

      <form
        method="GET"
        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] lg:items-end">
          <label className="block text-sm font-medium text-text-secondary dark:text-gray-400">
            Periodo
            <select
              name="periodoId"
              defaultValue={selectedPeriodoId}
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              {periodos.map((periodo) => (
                <option key={periodo.id} value={periodo.id}>
                  {periodo.nombre} ({periodo.estado})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-text-secondary dark:text-gray-400">
            Curso / seccion
            <select
              name="asignaturaId"
              defaultValue={selectedAsignaturaId}
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              {asignaturas.map((asignatura) => (
                <option key={asignatura.id} value={asignatura.id}>
                  {normalizarTextoVisible(asignatura.nombre)} - {asignatura.docenteNombre ?? "Sin docente"} {asignatura.docenteApellido ?? ""}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            Filtrar
          </button>
        </div>
      </form>

      <div className="grid gap-4 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
        <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-text-primary dark:text-white">
              Subir material
            </h2>
          </div>
          <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
            El archivo se adjunta a una clase del curso seleccionado.
          </p>

          <form action={subirMaterialAdminFormAction} className="mt-4 space-y-4" encType="multipart/form-data">
            <input type="hidden" name="periodoId" value={selectedPeriodoId} />
            <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
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

        <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-text-primary dark:text-white">
                Material visible para alumnos
              </h2>
              <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                {normalizarTextoVisible(selectedAsignatura?.nombre) || "Selecciona una seccion"} - {materiales.length} archivo{materiales.length === 1 ? "" : "s"}
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary dark:text-primary-light">
              {clasesOrdenadas.length} clases
            </span>
          </div>

          {materiales.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
              <FileText className="mx-auto h-9 w-9 text-gray-300 dark:text-gray-600" />
              <p className="mt-3 text-sm font-semibold text-text-primary dark:text-white">
                No hay material cargado para esta seccion.
              </p>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
              {materiales.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text-primary dark:text-white">
                      {normalizarTextoVisible(item.nombre)}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                      Sesion {item.claseNumeroSesion}: {normalizarTextoVisible(item.claseTitulo)} - {formatBytes(item.tamanioBytes)}
                    </p>
                  </div>
                  <form action={eliminarMaterialAdminFormAction}>
                    <input type="hidden" name="periodoId" value={selectedPeriodoId} />
                    <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
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
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
