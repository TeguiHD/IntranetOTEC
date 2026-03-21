import {
  crearClaseDocenteFormAction,
  editarClaseDocenteFormAction,
  editarNotaDocenteFormAction,
  editarObservacionDocenteFormAction,
  eliminarNotaDocenteFormAction,
  eliminarObservacionDocenteFormAction,
  listarAsignaturasDocente,
  listarClasesDocente,
  listarMatriculasDocente,
  listarNotasDocente,
  listarObservacionesDocente,
  registrarAsistenciaDocenteFormAction,
  registrarNotaDocenteFormAction,
  registrarObservacionDocenteFormAction,
} from "@/actions/docente";
import {
  eliminarMaterialFormAction,
  listarMaterialPorAsignatura,
  subirMaterialFormAction,
} from "@/actions/material";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { formatearRut } from "@/lib/rut";

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  clase_docente_created: { tone: "success", text: "Clase del curso creada correctamente." },
  clase_docente_updated: { tone: "success", text: "Clase actualizada correctamente." },
  clase_sesion_conflict: { tone: "error", text: "Ya existe una clase con ese número de sesión." },
  clase_not_found: { tone: "error", text: "No se encontró la clase seleccionada." },
  asistencia_created: { tone: "success", text: "Asistencia registrada correctamente." },
  asistencia_updated: { tone: "success", text: "Asistencia actualizada correctamente." },
  nota_created: { tone: "success", text: "Nota registrada correctamente." },
  nota_updated: { tone: "success", text: "Nota actualizada correctamente." },
  nota_deleted: { tone: "success", text: "Nota eliminada correctamente." },
  nota_not_found: { tone: "error", text: "Nota no encontrada." },
  observacion_created: { tone: "success", text: "Observación registrada correctamente." },
  observacion_updated: { tone: "success", text: "Observación actualizada correctamente." },
  observacion_deleted: { tone: "success", text: "Observación eliminada correctamente." },
  observacion_not_found: { tone: "error", text: "Observación no encontrada." },
  material_uploaded: { tone: "success", text: "Material subido correctamente." },
  material_deleted: { tone: "success", text: "Material eliminado correctamente." },
  file_too_large: { tone: "error", text: "El archivo excede 50 MB." },
  invalid_type: { tone: "error", text: "Tipo de archivo no permitido." },
  duplicate: { tone: "error", text: "Este archivo ya fue subido a esta clase." },
  invalid_input: { tone: "error", text: "Datos inválidos. Revisa los campos requeridos." },
  forbidden: { tone: "error", text: "No autorizado para operar sobre esta asignatura." },
  error: { tone: "error", text: "No fue posible completar la acción solicitada." },
};

type DocenteAsignaturasPageProps = {
  searchParams?: Promise<{
    state?: string;
    asignaturaId?: string;
    anio?: string;
  }>;
};

const escapeCsvValue = (value: string): string => {
  const normalized = value.replace(/"/g, '""');
  return /[",\n]/.test(normalized) ? `"${normalized}"` : normalized;
};

const toCsvDataUri = (headers: string[], rows: string[][]): string => {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(","));
  const csv = `\uFEFF${lines.join("\n")}`;
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
};

export default async function DocenteAsignaturasPage({ searchParams }: DocenteAsignaturasPageProps) {
  const params = await (searchParams ?? Promise.resolve({} as { state?: string; asignaturaId?: string; anio?: string }));
  const asignaturas = await listarAsignaturasDocente();
  const selectedAsignaturaId =
    typeof params?.asignaturaId === "string" && params.asignaturaId.length > 0
      ? params.asignaturaId
      : asignaturas[0]?.id;

  const [clases, matriculas, notas, observaciones, materiales] = selectedAsignaturaId
    ? await Promise.all([
        listarClasesDocente(selectedAsignaturaId),
        listarMatriculasDocente(selectedAsignaturaId),
        listarNotasDocente(selectedAsignaturaId),
        listarObservacionesDocente(selectedAsignaturaId),
        listarMaterialPorAsignatura(selectedAsignaturaId),
      ])
    : [[], [], [], [], []];

  const anioParam =
    typeof params?.anio === "string" && /^\d{4}$/.test(params.anio)
      ? Number.parseInt(params.anio, 10)
      : null;
  const aniosDisponibles = Array.from(
    new Set([
      ...notas.map((item) => item.anioRegistro),
      ...observaciones.map((item) => item.anioRegistro),
    ]),
  ).sort((a, b) => b - a);

  const notasFiltradas = anioParam ? notas.filter((item) => item.anioRegistro === anioParam) : notas;
  const observacionesFiltradas = anioParam
    ? observaciones.filter((item) => item.anioRegistro === anioParam)
    : observaciones;

  const notasCsvHref = toCsvDataUri(
    ["Alumno", "RUT", "Nota", "Fecha", "Año"],
    notasFiltradas.map((n) => [
      `${n.alumnoNombre} ${n.alumnoApellido}`,
      n.alumnoRut ? formatearRut(n.alumnoRut) : "",
      String(n.nota),
      n.fechaRegistro,
      String(n.anioRegistro),
    ]),
  );

  const observacionesCsvHref = toCsvDataUri(
    ["Alumno", "RUT", "Fecha", "Año", "Observación"],
    observacionesFiltradas.map((o) => [
      `${o.alumnoNombre} ${o.alumnoApellido}`,
      o.alumnoRut ? formatearRut(o.alumnoRut) : "",
      o.fechaRegistro,
      String(o.anioRegistro),
      o.observacion,
    ]),
  );

  return (
    <section className="space-y-6">
      <RouteStateToast state={params?.state} map={STATUS_MAP} />

      <header>
        <h1 className="text-2xl font-bold text-text-primary dark:text-white">Gestión docente</h1>
        <p className="text-sm text-text-secondary dark:text-gray-300">
          Crea clases del curso, registra asistencia, notas por fecha/año y observaciones de alumnos.
        </p>
      </header>

      <article className="rounded-md border border-primary/30 bg-primary/5 p-4 dark:border-primary/50 dark:bg-primary/10">
        <h2 className="text-sm font-semibold text-text-primary dark:text-gray-100">Información de solicitudes</h2>
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
          <div className="min-w-[220px] rounded border border-gray-200 bg-white px-3 py-2 text-xs text-text-secondary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            Registrar asistencia al cerrar cada clase.
          </div>
          <div className="min-w-[220px] rounded border border-gray-200 bg-white px-3 py-2 text-xs text-text-secondary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            Cargar notas con fecha de registro y control anual.
          </div>
          <div className="min-w-[220px] rounded border border-gray-200 bg-white px-3 py-2 text-xs text-text-secondary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            Documentar observaciones por alumno con trazabilidad.
          </div>
        </div>
      </article>

      <article className="rounded-md border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-text-primary dark:text-gray-100">Selecciona asignatura</h2>
        <form className="mt-4 grid gap-4 md:grid-cols-3" method="get">
          <select
            name="asignaturaId"
            defaultValue={selectedAsignaturaId}
            title="Seleccionar asignatura"
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          >
            {asignaturas.map((asignatura) => (
              <option key={asignatura.id} value={asignatura.id}>
                {asignatura.nombre} ({asignatura.codigo ?? "SIN-CODIGO"})
              </option>
            ))}
          </select>
          <select
            name="anio"
            defaultValue={anioParam ? String(anioParam) : ""}
            title="Filtrar por año"
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          >
            <option value="">Todos los años</option>
            {aniosDisponibles.map((anio) => (
              <option key={anio} value={anio}>
                {anio}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-10 rounded bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            Cargar
          </button>
        </form>
      </article>

      {selectedAsignaturaId ? (
        <>
          <article className="rounded-md border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-text-primary dark:text-gray-100">Crear clase del curso</h2>
            <form action={crearClaseDocenteFormAction} className="mt-4 grid gap-4 md:grid-cols-2">
              <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
                <input name="titulo" inputMode="text" placeholder="Título de la clase" required minLength={3} maxLength={140} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100" />
                <input name="fecha" type="date" inputMode="numeric" required title="Fecha de clase" placeholder="Fecha de clase" className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100" />
                <input name="horaInicio" type="time" inputMode="numeric" title="Hora de inicio" placeholder="Hora de inicio" className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100" />
                <input name="numeroSesion" type="number" inputMode="numeric" min={1} max={1000} required title="Numero de sesion" placeholder="Numero de sesion" className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100" />
              <div className="md:col-span-2">
                <button type="submit" className="h-10 rounded bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark">
                  Crear clase
                </button>
              </div>
            </form>
          </article>


          <article className="rounded-md border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-text-primary dark:text-gray-100">Editar clase del curso</h2>
            <form action={editarClaseDocenteFormAction} className="mt-4 grid gap-4 md:grid-cols-2">
              <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
              <select name="claseId" required title="Seleccionar clase a editar" className="md:col-span-2 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100">
                <option value="">Selecciona clase</option>
                {clases.map((clase) => (
                  <option key={clase.id} value={clase.id}>
                    Sesión {clase.numeroSesion} - {clase.titulo}
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
          </article>

          <article className="rounded-md border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-text-primary dark:text-gray-100">Subir material</h2>
            <form action={subirMaterialFormAction} encType="multipart/form-data" className="mt-4 grid gap-4 md:grid-cols-2">
              <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
              <select name="claseId" required title="Seleccionar clase" className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100">
                <option value="">Selecciona clase</option>
                {clases.map((clase) => (
                  <option key={clase.id} value={clase.id}>
                    Sesion {clase.numeroSesion} - {clase.titulo}
                  </option>
                ))}
              </select>
              <input
                name="archivo"
                type="file"
                required
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv,.mp4,.webm,.zip"
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary file:mr-3 file:rounded file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              />
              <div className="md:col-span-2">
                <button type="submit" className="h-10 rounded bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark">
                  Subir archivo
                </button>
                <span className="ml-3 text-xs text-text-secondary dark:text-gray-400">Max 50 MB. PDF, DOC, PPT, XLS, imagenes, video, ZIP.</span>
              </div>
            </form>

            {materiales.length > 0 && (
              <div className="mt-5">
                <h3 className="mb-2 text-sm font-semibold text-text-primary dark:text-gray-100">Material subido</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-xs dark:divide-gray-700">
                    <thead>
                      <tr className="text-left uppercase tracking-wide text-text-secondary dark:text-gray-300">
                        <th className="px-2 py-2">Archivo</th>
                        <th className="px-2 py-2">Clase</th>
                        <th className="px-2 py-2">Tamano</th>
                        <th className="px-2 py-2">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {materiales.map((m) => (
                        <tr key={m.id}>
                          <td className="px-2 py-2">
                            <a
                              href={`/api/files/download/${m.id}`}
                              className="text-primary underline hover:opacity-80 dark:text-primary-light"
                            >
                              {m.nombre}
                            </a>
                          </td>
                          <td className="px-2 py-2">S{m.claseNumeroSesion} - {m.claseTitulo}</td>
                          <td className="px-2 py-2">{m.tamanioBytes ? `${(m.tamanioBytes / 1024).toFixed(0)} KB` : "-"}</td>
                          <td className="px-2 py-2">
                            <form action={eliminarMaterialFormAction} className="inline">
                              <input type="hidden" name="materialId" value={m.id} />
                              <button type="submit" className="text-xs text-red-600 underline hover:opacity-80 dark:text-red-400">
                                Eliminar
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </article>

          <article className="rounded-md border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-text-primary dark:text-gray-100">Registrar asistencia</h2>
            <form action={registrarAsistenciaDocenteFormAction} className="mt-4 grid gap-4 md:grid-cols-2">
              <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
              <select name="claseId" required title="Seleccionar clase" className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100">
                <option value="">Selecciona clase</option>
                {clases.map((clase) => (
                  <option key={clase.id} value={clase.id}>
                    Sesión {clase.numeroSesion} - {clase.titulo}
                  </option>
                ))}
              </select>
              <select name="matriculaId" required title="Seleccionar alumno" className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100">
                <option value="">Selecciona alumno</option>
                {matriculas.map((m) => (
                  <option key={m.matriculaId} value={m.matriculaId}>
                    {m.alumnoNombre} {m.alumnoApellido} ({m.alumnoRut ? formatearRut(m.alumnoRut) : "Sin credencial"})
                  </option>
                ))}
              </select>
              <select name="estado" required title="Estado de asistencia" className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100">
                <option value="presente">Presente</option>
                <option value="ausente">Ausente</option>
                <option value="tardanza">Tardanza</option>
                <option value="justificado">Justificado</option>
              </select>
                <input name="fechaRegistro" type="date" inputMode="numeric" required title="Fecha de asistencia" placeholder="Fecha de asistencia" className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100" />
              <textarea name="observacion" rows={2} maxLength={300} placeholder="Observación (opcional)" className="md:col-span-2 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100" />
              <div className="md:col-span-2">
                <button type="submit" className="h-10 rounded bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark">
                  Registrar asistencia
                </button>
              </div>
            </form>
          </article>

          <article className="rounded-md border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-text-primary dark:text-gray-100">Registrar nota</h2>
            <form action={registrarNotaDocenteFormAction} className="mt-4 grid gap-4 md:grid-cols-2">
              <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
              <select name="matriculaId" required title="Seleccionar alumno para nota" className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100">
                <option value="">Selecciona alumno</option>
                {matriculas.map((m) => (
                  <option key={m.matriculaId} value={m.matriculaId}>
                    {m.alumnoNombre} {m.alumnoApellido} ({m.alumnoRut ? formatearRut(m.alumnoRut) : "Sin credencial"})
                  </option>
                ))}
              </select>
                <input name="nota" type="number" inputMode="decimal" min={1} max={7} step="0.1" required placeholder="Nota 1.0 a 7.0" className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100" />
                <input name="fechaRegistro" type="date" inputMode="numeric" required title="Fecha de nota" placeholder="Fecha de nota" className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100" />
              <div className="md:col-span-2">
                <button type="submit" className="h-10 rounded bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark">
                  Registrar nota
                </button>
              </div>
            </form>
          </article>

          <article className="rounded-md border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-text-primary dark:text-gray-100">Registrar observación</h2>
            <form action={registrarObservacionDocenteFormAction} className="mt-4 grid gap-4 md:grid-cols-2">
              <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
              <select name="matriculaId" required title="Seleccionar alumno para observacion" className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100">
                <option value="">Selecciona alumno</option>
                {matriculas.map((m) => (
                  <option key={m.matriculaId} value={m.matriculaId}>
                    {m.alumnoNombre} {m.alumnoApellido} ({m.alumnoRut ? formatearRut(m.alumnoRut) : "Sin credencial"})
                  </option>
                ))}
              </select>
                <input name="fechaRegistro" type="date" inputMode="numeric" required title="Fecha de observacion" placeholder="Fecha de observacion" className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100" />
              <textarea name="observacion" rows={3} required minLength={3} maxLength={500} placeholder="Detalle de la observación" className="md:col-span-2 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100" />
              <div className="md:col-span-2">
                <button type="submit" className="h-10 rounded bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark">
                  Guardar observación
                </button>
              </div>
            </form>
          </article>

          <article className="rounded-md border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-text-primary dark:text-gray-100">Histórico de notas y observaciones</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={notasCsvHref}
                download={`notas${anioParam ? `-${anioParam}` : ""}.csv`}
                className="inline-flex h-9 items-center rounded border border-primary px-3 text-xs font-semibold text-primary hover:bg-primary/10"
              >
                Exportar notas CSV
              </a>
              <a
                href={observacionesCsvHref}
                download={`observaciones${anioParam ? `-${anioParam}` : ""}.csv`}
                className="inline-flex h-9 items-center rounded border border-primary px-3 text-xs font-semibold text-primary hover:bg-primary/10"
              >
                Exportar observaciones CSV
              </a>
            </div>
            <div className="mt-4 grid gap-5 lg:grid-cols-2">
              <div className="overflow-x-auto">
                <h3 className="mb-2 text-sm font-semibold text-text-primary dark:text-gray-100">Notas</h3>
                <table className="min-w-full divide-y divide-gray-200 text-xs dark:divide-gray-700">
                  <thead>
                    <tr className="text-left uppercase tracking-wide text-text-secondary dark:text-gray-300">
                      <th className="px-2 py-2">Alumno</th>
                      <th className="px-2 py-2">RUT</th>
                      <th className="px-2 py-2">Nota</th>
                      <th className="px-2 py-2">Fecha</th>
                      <th className="px-2 py-2">Año</th>
                      <th className="px-2 py-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {notasFiltradas.map((n) => (
                      <tr key={n.id}>
                        <td className="px-2 py-2">{n.alumnoNombre} {n.alumnoApellido}</td>
                        <td className="px-2 py-2">{n.alumnoRut ? formatearRut(n.alumnoRut) : "-"}</td>
                        <td className="px-2 py-2">{n.nota}</td>
                        <td className="px-2 py-2">{n.fechaRegistro}</td>
                        <td className="px-2 py-2">{n.anioRegistro}</td>
                        <td className="px-2 py-2">
                          <details className="relative">
                            <summary className="cursor-pointer rounded px-2 py-1 text-xs text-primary hover:bg-primary/10">Editar</summary>
                            <form action={editarNotaDocenteFormAction} className="absolute right-0 z-10 mt-1 w-40 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                              <input type="hidden" name="notaId" value={n.id} />
                              <input type="hidden" name="asignaturaId" value={selectedAsignaturaId!} />
                              <input name="nota" type="number" defaultValue={n.nota} step="0.1" min={1} max={7} className="mb-2 w-full rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-900" />
                              <button type="submit" className="w-full rounded bg-primary px-2 py-1 text-xs font-semibold text-white hover:bg-primary-dark">Guardar</button>
                            </form>
                          </details>
                          <form action={eliminarNotaDocenteFormAction} className="inline">
                            <input type="hidden" name="notaId" value={n.id} />
                            <input type="hidden" name="asignaturaId" value={selectedAsignaturaId!} />
                            <button type="submit" className="ml-1 rounded px-2 py-1 text-xs text-danger hover:bg-danger/10" onClick={(e) => { if (!confirm("¿Eliminar esta nota?")) e.preventDefault(); }}>Eliminar</button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="overflow-x-auto">
                <h3 className="mb-2 text-sm font-semibold text-text-primary dark:text-gray-100">Observaciones</h3>
                <table className="min-w-full divide-y divide-gray-200 text-xs dark:divide-gray-700">
                  <thead>
                    <tr className="text-left uppercase tracking-wide text-text-secondary dark:text-gray-300">
                      <th className="px-2 py-2">Alumno</th>
                      <th className="px-2 py-2">RUT</th>
                      <th className="px-2 py-2">Fecha</th>
                      <th className="px-2 py-2">Año</th>
                      <th className="px-2 py-2">Observación</th>
                      <th className="px-2 py-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {observacionesFiltradas.map((o) => (
                      <tr key={o.id}>
                        <td className="px-2 py-2">{o.alumnoNombre} {o.alumnoApellido}</td>
                        <td className="px-2 py-2">{o.alumnoRut ? formatearRut(o.alumnoRut) : "-"}</td>
                        <td className="px-2 py-2">{o.fechaRegistro}</td>
                        <td className="px-2 py-2">{o.anioRegistro}</td>
                        <td className="max-w-[160px] truncate px-2 py-2" title={o.observacion}>{o.observacion}</td>
                        <td className="px-2 py-2">
                          <details className="relative">
                            <summary className="cursor-pointer rounded px-2 py-1 text-xs text-primary hover:bg-primary/10">Editar</summary>
                            <form action={editarObservacionDocenteFormAction} className="absolute right-0 z-10 mt-1 w-56 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                              <input type="hidden" name="observacionId" value={o.id} />
                              <input type="hidden" name="asignaturaId" value={selectedAsignaturaId!} />
                              <textarea name="observacion" rows={3} defaultValue={o.observacion} maxLength={300} className="mb-2 w-full rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-900" />
                              <button type="submit" className="w-full rounded bg-primary px-2 py-1 text-xs font-semibold text-white hover:bg-primary-dark">Guardar</button>
                            </form>
                          </details>
                          <form action={eliminarObservacionDocenteFormAction} className="inline">
                            <input type="hidden" name="observacionId" value={o.id} />
                            <input type="hidden" name="asignaturaId" value={selectedAsignaturaId!} />
                            <button type="submit" className="ml-1 rounded px-2 py-1 text-xs text-danger hover:bg-danger/10" onClick={(e) => { if (!confirm("¿Eliminar esta observación?")) e.preventDefault(); }}>Eliminar</button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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