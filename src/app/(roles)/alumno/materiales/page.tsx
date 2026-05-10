import Link from "next/link";

import { BookOpen, ClipboardList, Download, FileText } from "lucide-react";

import { obtenerDashboardAlumno } from "@/actions/alumno-dashboard";
import { listarMaterialPorAsignatura } from "@/actions/material";
import { normalizarTextoVisible } from "@/lib/displayText";

export const metadata = {
  title: "Materiales",
};

const formatBytes = (value: number | null): string => {
  if (!value) return "-";
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export default async function AlumnoMaterialesPage() {
  const dashboard = await obtenerDashboardAlumno();
  const cursos = dashboard?.cursos ?? [];
  const materialesPorCurso = await Promise.all(
    cursos.map(async (curso) => ({
      curso,
      materiales: await listarMaterialPorAsignatura(curso.asignaturaId),
    })),
  );
  const totalMateriales = materialesPorCurso.reduce(
    (total, item) => total + item.materiales.length,
    0,
  );

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Materiales
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            PDFs y archivos de apoyo publicados en tus cursos matriculados.
          </p>
        </div>
        <Link
          href="/alumno/evaluaciones"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10 dark:border-primary-light/40 dark:text-primary-light"
        >
          <ClipboardList className="h-4 w-4" />
          Ver pruebas
        </Link>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-2xl font-bold text-primary">{cursos.length}</p>
          <p className="text-xs text-text-secondary dark:text-gray-400">Cursos matriculados</p>
        </article>
        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-2xl font-bold text-emerald-500">{totalMateriales}</p>
          <p className="text-xs text-text-secondary dark:text-gray-400">Archivos disponibles</p>
        </article>
        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-2xl font-bold text-violet-500">
            {materialesPorCurso.filter((item) => item.materiales.length > 0).length}
          </p>
          <p className="text-xs text-text-secondary dark:text-gray-400">Cursos con material</p>
        </article>
      </div>

      {cursos.length === 0 ? (
        <article className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900">
          <BookOpen className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="mt-3 text-sm font-semibold text-text-primary dark:text-white">
            Aun no tienes cursos matriculados.
          </p>
        </article>
      ) : totalMateriales === 0 ? (
        <article className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900">
          <FileText className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="mt-3 text-sm font-semibold text-text-primary dark:text-white">
            Todavia no hay material de apoyo visible para tus cursos.
          </p>
        </article>
      ) : (
        <div className="grid gap-4">
          {materialesPorCurso.map(({ curso, materiales }) => (
            <article
              key={curso.asignaturaId}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-text-primary dark:text-white">
                    {normalizarTextoVisible(curso.nombre)}
                  </h2>
                  <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                    {curso.codigo ?? "Sin codigo"} - {curso.docenteNombre ?? "Sin docente"}
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
                  {materiales.length} archivo{materiales.length === 1 ? "" : "s"}
                </span>
              </div>

              {materiales.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-5 text-sm text-text-secondary dark:border-gray-700 dark:text-gray-400">
                  Este curso aun no tiene material publicado.
                </div>
              ) : (
                <div className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
                  {materiales.map((material) => (
                    <div
                      key={material.id}
                      className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text-primary dark:text-white">
                          {normalizarTextoVisible(material.nombre)}
                        </p>
                        <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                          Sesion {material.claseNumeroSesion}: {normalizarTextoVisible(material.claseTitulo)} - {formatBytes(material.tamanioBytes)}
                        </p>
                      </div>
                      <a
                        href={`/api/files/download/${material.id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary-dark"
                      >
                        <Download className="h-4 w-4" />
                        Abrir archivo
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
