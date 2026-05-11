import Link from "next/link";

import { BookOpen, ClipboardList, Eye, EyeOff, FileText, Trash2, Upload } from "lucide-react";

import { listarAsignaturasDocente, listarClasesDocente } from "@/actions/docente";
import {
  cambiarEstadoMaterialFormAction,
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
  material_enabled: { tone: "success", text: "Material habilitado y visible para alumnos." },
  material_disabled: { tone: "success", text: "Material deshabilitado y oculto para alumnos." },
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
  const materialesGlobal = materialesPorAsignatura.flatMap(({ asignatura, materiales }) =>
    materiales.map((materialItem) => ({
      asignatura,
      material: materialItem,
    })),
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
          <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-text-primary dark:text-white">
                  PDFs y materiales por curso
                </h2>
                <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                  Vista general igual al panel admin: curso, clase, archivo y acciones directas.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
                  {totalMateriales} archivo{totalMateriales === 1 ? "" : "s"}
                </span>
                <a
                  href="#subir-material-docente"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
                >
                  <Upload className="h-4 w-4" />
                  Crear material
                </a>
              </div>
            </div>

            {materialesGlobal.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
                <FileText className="mx-auto h-9 w-9 text-gray-300 dark:text-gray-600" />
                <p className="mt-3 text-sm font-semibold text-text-primary dark:text-white">
                  Aun no hay PDFs o materiales cargados en tus asignaturas.
                </p>
              </div>
            ) : (
              <>
              <div className="mt-4 grid gap-3 lg:hidden">
                {materialesGlobal.map(({ asignatura, material }) => (
                  <article key={material.id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-semibold text-text-primary dark:text-white">
                        {normalizarTextoVisible(material.nombre)}
                      </p>
                      <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        material.habilitado
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      }`}>
                        {material.habilitado ? "Visible para alumnos" : "Oculto para alumnos"}
                      </span>
                    </div>
                    <dl className="mt-3 grid gap-2 text-xs text-text-secondary dark:text-gray-400">
                      <div>
                        <dt className="font-semibold uppercase tracking-wide">Curso</dt>
                        <dd className="mt-1 text-sm text-text-primary dark:text-white">
                          {normalizarTextoVisible(asignatura.nombre)}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold uppercase tracking-wide">Clase</dt>
                        <dd className="mt-1">Sesion {material.claseNumeroSesion}: {normalizarTextoVisible(material.claseTitulo)}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span>{asignatura.codigo ?? "Sin codigo"}</span>
                        <span>{formatBytes(material.tamanioBytes)}</span>
                      </div>
                    </dl>
                    <details className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                      <summary className="cursor-pointer text-xs font-semibold text-text-primary dark:text-white">
                        Modificar titulo
                      </summary>
                      <form action={editarMaterialFormAction} className="mt-3 grid gap-2">
                        <input type="hidden" name="asignaturaId" value={asignatura.id} />
                        <input type="hidden" name="redirectTo" value="/docente/materiales" />
                        <input type="hidden" name="materialId" value={material.id} />
                        <input
                          name="nombre"
                          defaultValue={normalizarTextoVisible(material.nombre)}
                          minLength={3}
                          required
                          className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        />
                        <button
                          type="submit"
                          className="min-h-11 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
                        >
                          Guardar
                        </button>
                      </form>
                    </details>
                    <div className="mt-4 grid gap-2">
                      <a
                        href={`/api/files/download/${material.id}`}
                        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
                      >
                        Abrir PDF
                      </a>
                      <Link
                        href={`/docente/materiales?asignaturaId=${asignatura.id}`}
                        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-primary/40 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10 dark:border-primary-light/40 dark:text-primary-light"
                      >
                        Abrir curso
                      </Link>
                      <form action={cambiarEstadoMaterialFormAction}>
                        <input type="hidden" name="asignaturaId" value={asignatura.id} />
                        <input type="hidden" name="redirectTo" value="/docente/materiales" />
                        <input type="hidden" name="materialId" value={material.id} />
                        <input type="hidden" name="habilitado" value={material.habilitado ? "false" : "true"} />
                        <button
                          type="submit"
                          className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                            material.habilitado
                              ? "border border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900/60 dark:text-amber-300 dark:hover:bg-amber-950/40"
                              : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/60 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                          }`}
                        >
                          {material.habilitado ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          {material.habilitado ? "Deshabilitar" : "Habilitar"}
                        </button>
                      </form>
                      <form action={eliminarMaterialFormAction}>
                        <input type="hidden" name="asignaturaId" value={asignatura.id} />
                        <input type="hidden" name="redirectTo" value="/docente/materiales" />
                        <input type="hidden" name="materialId" value={material.id} />
                        <button
                          type="submit"
                          className="min-h-11 w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/40"
                        >
                          Eliminar
                        </button>
                      </form>
                    </div>
                  </article>
                ))}
              </div>
              <div className="mt-4 hidden overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 lg:block">
                <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-text-secondary dark:bg-gray-800/70 dark:text-gray-400">
                    <tr>
                      <th className="px-4 py-3">Archivo</th>
                      <th className="px-4 py-3">Curso</th>
                      <th className="px-4 py-3">Clase</th>
                      <th className="px-4 py-3">Tamano</th>
                      <th className="px-4 py-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {materialesGlobal.map(({ asignatura, material }) => (
                      <tr key={material.id} className="align-top hover:bg-gray-50/80 dark:hover:bg-gray-800/50">
                        <td className="min-w-[260px] px-4 py-3">
                          <p className="font-semibold text-text-primary dark:text-white">
                            {normalizarTextoVisible(material.nombre)}
                          </p>
                          <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            material.habilitado
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                              : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          }`}>
                            {material.habilitado ? "Visible para alumnos" : "Oculto para alumnos"}
                          </span>
                          <details className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                            <summary className="cursor-pointer text-xs font-semibold text-text-primary dark:text-white">
                              Modificar titulo
                            </summary>
                            <form action={editarMaterialFormAction} className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                              <input type="hidden" name="asignaturaId" value={asignatura.id} />
                              <input type="hidden" name="redirectTo" value="/docente/materiales" />
                              <input type="hidden" name="materialId" value={material.id} />
                              <input
                                name="nombre"
                                defaultValue={normalizarTextoVisible(material.nombre)}
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
                        </td>
                        <td className="min-w-[240px] px-4 py-3">
                          <p className="font-semibold text-text-primary dark:text-white">
                            {normalizarTextoVisible(asignatura.nombre)}
                          </p>
                          <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                            {asignatura.codigo ?? "Sin codigo"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-text-secondary dark:text-gray-300">
                          Sesion {material.claseNumeroSesion}: {normalizarTextoVisible(material.claseTitulo)}
                        </td>
                        <td className="px-4 py-3 text-text-secondary dark:text-gray-300">
                          {formatBytes(material.tamanioBytes)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <a
                              href={`/api/files/download/${material.id}`}
                              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-dark"
                            >
                              Abrir PDF
                            </a>
                            <Link
                              href={`/docente/materiales?asignaturaId=${asignatura.id}`}
                              className="rounded-lg border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10 dark:border-primary-light/40 dark:text-primary-light"
                            >
                              Abrir curso
                            </Link>
                            <form action={cambiarEstadoMaterialFormAction}>
                              <input type="hidden" name="asignaturaId" value={asignatura.id} />
                              <input type="hidden" name="redirectTo" value="/docente/materiales" />
                              <input type="hidden" name="materialId" value={material.id} />
                              <input type="hidden" name="habilitado" value={material.habilitado ? "false" : "true"} />
                              <button
                                type="submit"
                                className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                  material.habilitado
                                    ? "border border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900/60 dark:text-amber-300 dark:hover:bg-amber-950/40"
                                    : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/60 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                                }`}
                              >
                                {material.habilitado ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                {material.habilitado ? "Deshabilitar" : "Habilitar"}
                              </button>
                            </form>
                            <form action={eliminarMaterialFormAction}>
                              <input type="hidden" name="asignaturaId" value={asignatura.id} />
                              <input type="hidden" name="redirectTo" value="/docente/materiales" />
                              <input type="hidden" name="materialId" value={material.id} />
                              <button
                                type="submit"
                                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/40"
                              >
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
              </>
            )}
          </article>

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
            <article id="subir-material-docente" className="scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
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
                          <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            item.habilitado
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                              : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          }`}>
                            {item.habilitado ? "Visible para alumnos" : "Oculto para alumnos"}
                          </span>
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
                          <form action={cambiarEstadoMaterialFormAction}>
                            <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
                            <input type="hidden" name="redirectTo" value="/docente/materiales" />
                            <input type="hidden" name="materialId" value={item.id} />
                            <input type="hidden" name="habilitado" value={item.habilitado ? "false" : "true"} />
                            <button
                              type="submit"
                              className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                                item.habilitado
                                  ? "border border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900/60 dark:text-amber-300 dark:hover:bg-amber-950/40"
                                  : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/60 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                              }`}
                            >
                              {item.habilitado ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              {item.habilitado ? "Deshabilitar" : "Habilitar"}
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
        </>
      )}
    </section>
  );
}
