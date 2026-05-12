import Link from "next/link";

import {
  crearClaseDocenteFormAction,
  editarClaseDocenteFormAction,
  eliminarClaseDocenteFormAction,
  listarAlumnosEnRiesgo,
  listarAsignaturasDocente,
  listarClasesDocente,
  listarMatriculasDocente,
  listarResumenAlumnosDocente,
  registrarAsistenciaLoteDocenteFormAction,
  type AlumnoEnRiesgo,
} from "@/actions/docente";
import {
  eliminarAnuncioFormAction,
  listarAnunciosAsignatura,
  publicarAnuncioFormAction,
} from "@/actions/anuncios";
import { AnunciosBoard } from "@/components/shared/AnunciosBoard";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { QrAsistenciaButton } from "@/components/docente/QrAsistenciaButton";
import { normalizarTextoVisible } from "@/lib/displayText";
import { formatearRut } from "@/lib/rut";

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  clase_docente_created: { tone: "success", text: "Clase del curso creada correctamente." },
  clase_docente_updated: { tone: "success", text: "Clase actualizada correctamente." },
  clase_sesion_conflict: { tone: "error", text: "Ya existe una clase con ese número de sesión." },
  clase_not_found: { tone: "error", text: "No se encontró la clase seleccionada." },
  clase_deleted: { tone: "success", text: "Clase eliminada correctamente." },
  asistencia_created: { tone: "success", text: "Asistencia registrada correctamente." },
  asistencia_updated: { tone: "success", text: "Asistencia actualizada correctamente." },
  anuncio_publicado: { tone: "success", text: "Anuncio publicado correctamente." },
  anuncio_eliminado: { tone: "success", text: "Anuncio eliminado correctamente." },
  anuncio_not_found: { tone: "error", text: "El anuncio no fue encontrado." },
  anuncio_invalid: { tone: "error", text: "El anuncio requiere título y contenido válidos (mínimo 3 caracteres, título máximo 200)." },
  invalid_input: { tone: "error", text: "Datos inválidos. Revisa los campos requeridos." },
  forbidden: { tone: "error", text: "No autorizado para operar sobre esta asignatura." },
  error: { tone: "error", text: "No fue posible completar la acción solicitada." },
};

type DocenteAsignaturasPageProps = {
  searchParams?: Promise<{
    state?: string;
    asignaturaId?: string;
  }>;
};

const formatRutValue = (rut: string | null): string =>
  rut ? (rut.startsWith("EXT-") ? `Ext: ${rut.replace(/^EXT-/, "")}` : formatearRut(rut)) : "-";

export const metadata = {
  title: "Tus Asignaturas",
};

export default async function DocenteAsignaturasPage({ searchParams }: DocenteAsignaturasPageProps) {
  const params = await (searchParams ?? Promise.resolve({} as { state?: string; asignaturaId?: string }));
  const asignaturas = await listarAsignaturasDocente();
  const selectedAsignaturaId =
    typeof params.asignaturaId === "string" && params.asignaturaId.length > 0
      ? params.asignaturaId
      : asignaturas[0]?.id;

  const [clases, matriculas, resumenAlumnos, alumnosEnRiesgo, anunciosAsignatura] = selectedAsignaturaId
    ? await Promise.all([
        listarClasesDocente(selectedAsignaturaId),
        listarMatriculasDocente(selectedAsignaturaId),
        listarResumenAlumnosDocente(selectedAsignaturaId),
        listarAlumnosEnRiesgo(selectedAsignaturaId),
        listarAnunciosAsignatura(selectedAsignaturaId),
      ])
    : [[], [], [], [], []] as [
        Awaited<ReturnType<typeof listarClasesDocente>>,
        Awaited<ReturnType<typeof listarMatriculasDocente>>,
        Awaited<ReturnType<typeof listarResumenAlumnosDocente>>,
        AlumnoEnRiesgo[],
        Awaited<ReturnType<typeof listarAnunciosAsignatura>>,
      ];

  return (
    <section className="space-y-6">
      <RouteStateToast state={params.state} map={STATUS_MAP} />

      <header>
        <h1 className="text-2xl font-bold text-text-primary dark:text-white">Gestión docente</h1>
        <p className="text-sm text-text-secondary dark:text-gray-300">
          Crea clases del curso, registra asistencia y revisa el estado de tus alumnos.
        </p>
      </header>

      <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-5">
        <h2 className="text-lg font-semibold text-text-primary dark:text-gray-100">Selecciona asignatura</h2>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
          Elige el curso que vas a revisar.
        </p>
        <form className="mt-4 grid gap-3 lg:grid-cols-[minmax(240px,1fr)_auto]" method="get">
          <label className="block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
            Curso
            <select
            name="asignaturaId"
            defaultValue={selectedAsignaturaId}
            title="Seleccionar asignatura"
            className="mt-1 h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
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
            className="h-11 self-end rounded-xl bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            Aplicar filtros
          </button>
        </form>
      </article>

      {selectedAsignaturaId ? (
        <>
          <nav className="grid gap-2 rounded-md border border-gray-200 bg-white p-3 text-sm shadow-sm sm:grid-cols-4 lg:grid-cols-8 dark:border-gray-700 dark:bg-gray-900">
            {[
              ["#resumen", "Resumen"],
              ["#alumnos", "Alumnos"],
              ["#clases", "Clases"],
              ["#asistencia", "Asistencia"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="rounded-lg border border-gray-100 px-3 py-2 text-center font-medium text-text-secondary hover:border-primary/30 hover:text-primary dark:border-gray-800 dark:text-gray-300"
              >
                {label}
              </a>
            ))}
            <Link
              href="/docente/materiales"
              className="rounded-lg border border-gray-100 px-3 py-2 text-center font-medium text-text-secondary hover:border-primary/30 hover:text-primary dark:border-gray-800 dark:text-gray-300"
            >
              Materiales
            </Link>
            <Link
              href={`/docente/asignaturas/${selectedAsignaturaId}/evaluaciones`}
              className="rounded-lg bg-primary px-3 py-2 text-center font-semibold text-white hover:bg-primary-dark"
            >
              Pruebas
            </Link>
          </nav>

          <article className="hidden rounded-md border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-text-primary dark:text-gray-100">Crear clase del curso</h2>
            <form action={crearClaseDocenteFormAction} className="mt-4 grid gap-4 md:grid-cols-2">
              <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
                <input name="titulo" inputMode="text" placeholder="Título de la clase" required minLength={3} maxLength={140} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100" />
                <input name="fecha" type="date" inputMode="numeric" required title="Fecha de clase" placeholder="Fecha de clase" className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100" />
                <input name="horaInicio" type="time" inputMode="numeric" title="Hora de inicio" placeholder="Hora de inicio" className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100" />
                <input name="numeroSesion" type="number" inputMode="numeric" min={1} max={1000} required title="Número de sesión" placeholder="Número de sesión" className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100" />
              <div className="md:col-span-2">
                <button type="submit" className="h-10 rounded bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark">
                  Crear clase
                </button>
              </div>
            </form>
          </article>


          <article className="hidden rounded-md border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-text-primary dark:text-gray-100">Editar clase del curso</h2>
            <form action={editarClaseDocenteFormAction} className="mt-4 grid gap-4 md:grid-cols-2">
              <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
              <select name="claseId" required title="Seleccionar clase a editar" className="md:col-span-2 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100">
                <option value="">Selecciona clase</option>
                {clases.map((clase) => (
                  <option key={clase.id} value={clase.id}>
                    Sesión {clase.numeroSesion} - {normalizarTextoVisible(clase.titulo)}
                  </option>
                ))}
              </select>
              <input name="titulo" inputMode="text" placeholder="Nuevo título" required minLength={3} maxLength={140} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100" />
              <input name="fecha" type="date" inputMode="numeric" required title="Nueva fecha" className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100" />
              <input name="horaInicio" type="time" inputMode="numeric" title="Nueva hora de inicio" className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100" />
              <input name="numeroSesion" type="number" inputMode="numeric" min={1} max={1000} required title="Nuevo número de sesión" className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100" />
              <div className="md:col-span-2">
                <button type="submit" className="h-10 rounded bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark">Guardar cambios de clase</button>
              </div>
            </form>

            <form action={eliminarClaseDocenteFormAction} className="mt-4 flex items-center gap-3">
              <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
              <select name="claseId" required title="Seleccionar clase a eliminar" className="w-full max-w-xs rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100">
                <option value="">Selecciona clase a eliminar</option>
                {clases.map((clase) => (
                  <option key={clase.id} value={clase.id}>
                    Sesión {clase.numeroSesion} - {normalizarTextoVisible(clase.titulo)}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="h-10 rounded bg-danger px-4 text-sm font-semibold text-white hover:bg-danger/80"
              >
                Eliminar clase
              </button>
            </form>
          </article>

          {/* Tablero de anuncios */}
          <details className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-text-primary dark:text-white">
              + Publicar anuncio
            </summary>
            <form action={publicarAnuncioFormAction} className="space-y-3 border-t border-gray-100 p-4 dark:border-gray-800">
              <input type="hidden" name="asignaturaId" value={selectedAsignaturaId ?? ""} />
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-gray-400">
                  Título
                </label>
                <input
                  name="titulo"
                  required
                  maxLength={200}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/30 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Ej: Aviso importante sobre el examen" inputMode="text"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-gray-400">
                  Contenido
                </label>
                <textarea
                  name="contenido"
                  required
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/30 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Escribe el contenido del anuncio..."
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-text-secondary dark:text-gray-400">
                <input type="checkbox" name="fijado" inputMode="text" />
                Fijar este anuncio al tope
              </label>
              <button
                type="submit"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
              >
                Publicar
              </button>
            </form>
          </details>

          <AnunciosBoard
            anuncios={anunciosAsignatura}
            asignaturaId={selectedAsignaturaId ?? ""}
            puedeEliminar
            eliminarAction={eliminarAnuncioFormAction}
          />

          {/* QR por clase */}
          {clases.length > 0 && (
            <article className="rounded-md border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-3 text-lg font-semibold text-text-primary dark:text-gray-100">QR de Asistencia</h2>
              <p className="mb-4 text-sm text-text-secondary dark:text-gray-400">
                Genera un código QR por clase. Los alumnos lo escanean con su celular para registrar asistencia automáticamente (válido 30 min).
              </p>
              <div className="flex flex-wrap gap-3">
                {clases.map((clase) => (
                  <div key={clase.id} className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/50">
                    <span className="text-xs font-medium text-text-secondary dark:text-gray-400">
                      S{clase.numeroSesion} · {normalizarTextoVisible(clase.titulo)}
                    </span>
                    <QrAsistenciaButton claseId={clase.id} claseNombre={`Sesión ${clase.numeroSesion} – ${normalizarTextoVisible(clase.titulo)}`} />
                  </div>
                ))}
              </div>
            </article>
          )}

          {/* Nómina de alumnos — Step 15: control operativo docente */}
          {resumenAlumnos.length > 0 && (
            <article id="nomina" className="rounded-md border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-text-primary dark:text-gray-100">
                  Nómina de alumnos
                </h2>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
                  {resumenAlumnos.length} alumno{resumenAlumnos.length !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                Seguimiento de asistencia por alumno. Clases registradas: {resumenAlumnos[0]?.totalClases ?? 0}.
              </p>

              {/* Desktop */}
              <div className="mt-4 hidden overflow-x-auto md:block">
                <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-700">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                      <th className="py-2 pr-4">Alumno</th>
                      <th className="py-2 pr-4">RUT</th>
                      <th className="py-2 pr-4 text-center">Presentes</th>
                      <th className="py-2 pr-4 text-center">Ausentes</th>
                      <th className="py-2 text-center">% Asistencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {resumenAlumnos.map((a) => {
                      const totalRegistrado = a.presentes + a.ausentes;
                      const pct = totalRegistrado > 0 ? Math.round((a.presentes / totalRegistrado) * 100) : null;
                      const pctColor = pct === null ? "text-text-muted" : pct >= 75 ? "text-success" : pct >= 50 ? "text-warning" : "text-danger";
                      return (
                        <tr key={a.matriculaId} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                          <td className="py-2 pr-4 font-medium text-text-primary dark:text-gray-100">
                            {a.alumnoNombre} {a.alumnoApellido}
                          </td>
                          <td className="py-2 pr-4 text-xs text-text-secondary dark:text-gray-400">
                            {formatRutValue(a.alumnoRut)}
                          </td>
                          <td className="py-2 pr-4 text-center text-text-primary dark:text-gray-100">{a.presentes}</td>
                          <td className="py-2 pr-4 text-center text-text-secondary dark:text-gray-400">{a.ausentes}</td>
                          <td className={`py-2 text-center text-xs font-semibold ${pctColor}`}>
                            {pct !== null ? `${pct}%` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <ul className="mt-3 space-y-2 md:hidden">
                {resumenAlumnos.map((a) => {
                  const totalRegistrado = a.presentes + a.ausentes;
                  const pct = totalRegistrado > 0 ? Math.round((a.presentes / totalRegistrado) * 100) : null;
                  const pctColor = pct === null ? "text-text-muted" : pct >= 75 ? "text-success" : pct >= 50 ? "text-warning" : "text-danger";
                  return (
                    <li key={a.matriculaId} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-800/50">
                      <p className="font-medium text-text-primary dark:text-gray-100">
                        {a.alumnoNombre} {a.alumnoApellido}
                      </p>
                      <p className="mt-0.5 text-xs text-text-secondary dark:text-gray-400">
                        {formatRutValue(a.alumnoRut)}
                      </p>
                      <div className="mt-1.5 flex gap-3 text-xs">
                        <span className="text-success">{a.presentes} presentes</span>
                        <span className="text-text-muted dark:text-gray-500">{a.ausentes} ausentes</span>
                        {pct !== null && <span className={`font-semibold ${pctColor}`}>{pct}% asistencia</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </article>
          )}

          {alumnosEnRiesgo.length > 0 && (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/50 dark:bg-amber-950/20">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-200 text-xs dark:bg-amber-800">
                  {alumnosEnRiesgo.length}
                </span>
                Alumnos que necesitan atención
              </h3>
              <ul className="divide-y divide-amber-100 dark:divide-amber-900/30">
                {alumnosEnRiesgo.map((al) => (
                  <li key={al.matriculaId} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-text-primary dark:text-white">
                        {al.alumnoApellido}, {al.alumnoNombre}
                        {al.alumnoRut && (
                          <span className="ml-2 text-xs text-text-secondary dark:text-gray-400">
                            {al.alumnoRut}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-text-secondary dark:text-gray-400">
                        {al.asistenciaPct !== null && `Asistencia: ${al.asistenciaPct}%`}
                        {al.notaPromedio !== null && ` · Nota prom: ${al.notaPromedio.toFixed(1)}`}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {al.alertas.includes("asistencia_baja") && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">
                          Asistencia baja
                        </span>
                      )}
                      {al.alertas.includes("nota_baja") && (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                          Nota bajo 4.0
                        </span>
                      )}
                      {al.alertas.includes("evaluacion_expirada") && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                          Eval. expirada
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <article id="asistencia" className="rounded-md border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-text-primary dark:text-gray-100">Registrar asistencia</h2>
            <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
              Marca la nómina completa del curso. Cada alumno tiene dos puntos principales: presente o ausente.
            </p>
            <form action={registrarAsistenciaLoteDocenteFormAction} className="mt-4 space-y-4">
              <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
              <select name="claseId" required title="Seleccionar clase" className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100">
                <option value="">Selecciona clase</option>
                {clases.map((clase) => (
                  <option key={clase.id} value={clase.id}>
                    Sesión {clase.numeroSesion} - {normalizarTextoVisible(clase.titulo)}
                  </option>
                ))}
              </select>
                <input name="fechaRegistro" type="date" inputMode="numeric" required title="Fecha de asistencia" placeholder="Fecha de asistencia" className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100" />
              <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-secondary dark:bg-gray-800/60 dark:text-gray-400">
                  <span>Alumno</span>
                  <span>Estado</span>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {matriculas.map((m) => (
                    <div key={m.matriculaId} className="grid gap-3 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text-primary dark:text-gray-100">
                          {m.alumnoApellido}, {m.alumnoNombre}
                        </p>
                        <p className="text-xs text-text-secondary dark:text-gray-400">
                          {formatRutValue(m.alumnoRut)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          ["presente", "Presente", "bg-emerald-500"],
                          ["ausente", "Ausente", "bg-red-500"],
                          ["tardanza", "Tardanza", "bg-amber-400"],
                          ["justificado", "Justificado", "bg-blue-500"],
                        ].map(([value, label, dotClass]) => (
                          <label key={value} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-text-secondary transition-colors has-[:checked]:border-primary has-[:checked]:text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                            <input type="radio" name={`estado__${m.matriculaId}`} value={value} required className="sr-only" inputMode="text" />
                            <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <textarea name="observacion" rows={2} maxLength={300} placeholder="Observación (opcional)" className="md:col-span-2 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100" />
              <div className="md:col-span-2">
                <button type="submit" className="h-10 rounded bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark">
                  Registrar asistencia
                </button>
              </div>
            </form>
          </article>

        </>
      ) : (
        <article className="rounded-md border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm text-text-secondary dark:text-gray-300">
            No tienes asignaturas asignadas actualmente.
          </p>
        </article>
      )}
    </section>
  );
}
