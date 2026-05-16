import Link from "next/link";

import { BookOpen, ExternalLink, Plus, Search } from "lucide-react";

import { listarCursos, listarSeccionesDeCurso } from "@/actions/cursos";

import { CursoListClient } from "./CursoListClient";
import { SeccionAlumnosAccordion } from "./SeccionAlumnosAccordion";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ESTADO_LABELS: Record<string, { label: string; tone: string }> = {
  borrador: { label: "Borrador", tone: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  activo: { label: "Activa", tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  finalizado: { label: "Finalizada", tone: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  archivado: { label: "Archivada", tone: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
};

const formatDate = (value: string | null | undefined): string => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
};

type PageProps = {
  searchParams?: Promise<{ cursoId?: string; q?: string }>;
};

export const metadata = { title: "Vista académica" };

export default async function AdminAcademicoPage({ searchParams }: PageProps) {
  const params = await (searchParams ?? Promise.resolve({} as { cursoId?: string; q?: string }));
  const q = (params.q ?? "").trim();
  const requestedCursoId = (params.cursoId ?? "").trim();

  const cursosList = await listarCursos(
    { limit: 200, offset: 0 },
    { query: q || undefined, incluirInactivos: false },
  );

  const selectedCursoId =
    requestedCursoId && UUID_REGEX.test(requestedCursoId)
      ? requestedCursoId
      : (cursosList[0]?.id ?? "");

  const selectedCurso = cursosList.find((c) => c.id === selectedCursoId) ?? null;

  const secciones = selectedCurso
    ? await listarSeccionesDeCurso(selectedCurso.id)
    : [];

  const seccionesPorPeriodo = new Map<string, typeof secciones>();
  for (const s of secciones) {
    const key = s.periodoNombre ?? "Sin periodo";
    const arr = seccionesPorPeriodo.get(key) ?? [];
    arr.push(s);
    seccionesPorPeriodo.set(key, arr);
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Vista académica
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Cursos a la izquierda, secciones por periodo a la derecha. Punto de entrada al flujo
            periodo → curso → sección.
          </p>
        </div>
        <Link
          href="/admin/cursos"
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-text-primary transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <Plus className="h-4 w-4" />
          Gestionar cursos
        </Link>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <aside className="space-y-3">
          <form method="GET" className="rounded-2xl border border-gray-200/80 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            {selectedCursoId ? (
              <input type="hidden" name="cursoId" value={selectedCursoId} />
            ) : null}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                name="q"
                type="text"
                inputMode="search"
                defaultValue={q}
                placeholder="Buscar curso por nombre o código…"
                className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
          </form>

          <CursoListClient
            cursos={cursosList.map((c) => ({
              id: c.id,
              nombre: c.nombre,
              codigo: c.codigo ?? null,
              totalSecciones: c.totalSecciones,
            }))}
            selectedId={selectedCursoId}
            query={q}
          />
        </aside>

        <main className="space-y-4">
          {!selectedCurso ? (
            <article className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-text-secondary shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
              Selecciona un curso a la izquierda para ver sus secciones.
            </article>
          ) : (
            <>
              <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-text-secondary dark:text-gray-400">
                      Curso
                    </p>
                    <h2 className="text-lg font-bold text-text-primary dark:text-white sm:text-xl">
                      {selectedCurso.nombre}
                    </h2>
                    <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
                      {selectedCurso.codigo ? `Código ${selectedCurso.codigo} · ` : ""}
                      {selectedCurso.horasTeoricas ?? 0}h teóricas ·{" "}
                      {selectedCurso.horasPracticas ?? 0}h prácticas
                    </p>
                    {selectedCurso.descripcion ? (
                      <p className="mt-2 text-sm text-text-primary dark:text-gray-200">
                        {selectedCurso.descripcion}
                      </p>
                    ) : null}
                  </div>
                  <span className="inline-flex h-7 items-center rounded-full bg-primary/10 px-3 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
                    {selectedCurso.totalSecciones} sección
                    {selectedCurso.totalSecciones === 1 ? "" : "es"}
                  </span>
                </div>
              </article>

              {secciones.length === 0 ? (
                <article className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
                  <BookOpen className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
                  <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white">
                    Este curso aún no tiene secciones
                  </p>
                  <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                    Crea una sección para comenzar a operar.
                  </p>
                  <Link
                    href="/admin/asignaturas"
                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Crear sección
                  </Link>
                </article>
              ) : (
                <div className="space-y-4">
                  {Array.from(seccionesPorPeriodo.entries()).map(([periodo, items]) => (
                    <article
                      key={periodo}
                      className="rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
                    >
                      <header className="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-800">
                        <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                          {periodo}
                        </p>
                        <span className="text-[11px] text-text-muted dark:text-gray-500">
                          {items.length} sección{items.length === 1 ? "" : "es"}
                        </span>
                      </header>
                      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                        {items.map((s) => {
                          const estadoMeta =
                            ESTADO_LABELS[s.estado ?? "borrador"] ?? ESTADO_LABELS.borrador;
                          const docente =
                            s.docenteNombre || s.docenteApellido
                              ? `${s.docenteNombre ?? ""} ${s.docenteApellido ?? ""}`.trim()
                              : null;
                          return (
                            <li key={s.id} className="px-4 py-3 sm:px-5">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="min-w-0 break-words text-sm font-semibold text-text-primary dark:text-gray-100">
                                      {s.nombre}
                                    </p>
                                    <span
                                      className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold uppercase ${estadoMeta.tone}`}
                                    >
                                      {estadoMeta.label}
                                    </span>
                                  </div>
                                  <p className="mt-0.5 text-[11px] text-text-secondary dark:text-gray-400">
                                    {s.codigo ? `${s.codigo} · ` : ""}Turno {s.turno} ·{" "}
                                    {formatDate(s.fechaInicio)} → {formatDate(s.fechaFin)}
                                    {docente ? ` · ${docente}` : ""}
                                  </p>
                                </div>
                                <Link
                                  href={`/admin/secciones/${s.id}`}
                                  className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-semibold text-white transition-colors hover:bg-primary-dark"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  Ficha
                                </Link>
                              </div>
                              <SeccionAlumnosAccordion asignaturaId={s.id} />
                            </li>
                          );
                        })}
                      </ul>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </section>
  );
}

