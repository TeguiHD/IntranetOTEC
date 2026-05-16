import Link from "next/link";
import { notFound } from "next/navigation";

import { and, asc, count, eq, gte, isNull, sql } from "drizzle-orm";
import {
  ArrowLeft,
  Award,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  IdCard,
  FolderOpen,
  Users,
} from "lucide-react";

import { getDb } from "@/db";
import {
  asignaturas,
  asistencia,
  bloquesHorario,
  certificados,
  clases,
  cursos,
  evaluaciones,
  matriculas,
  notasDocente,
  periodosAcademicos,
  usuarios,
} from "@/db/schema";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TABS = [
  { id: "resumen", label: "Resumen", Icon: BookOpen, href: null },
  { id: "carpeta", label: "Carpeta", Icon: FolderOpen, href: null },
  { id: "alumnos", label: "Alumnos", Icon: Users, href: "/admin/matriculas" },
  { id: "horario", label: "Horario", Icon: CalendarDays, href: "/admin/horarios" },
  { id: "clases", label: "Clases", Icon: ClipboardList, href: "/admin/clases" },
  { id: "evaluaciones", label: "Evaluaciones", Icon: GraduationCap, href: "/admin/evaluaciones" },
  { id: "asistencia", label: "Asistencia", Icon: ClipboardCheck, href: "/admin/asistencias" },
  { id: "notas", label: "Notas", Icon: Award, href: "/admin/notas" },
  { id: "certificados", label: "Certificados", Icon: IdCard, href: "/admin/certificados" },
] as const;

type TabId = (typeof TABS)[number]["id"];

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
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
};

const formatTime = (value: string | null | undefined): string =>
  value ? value.slice(0, 5) : "—";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
};

export const metadata = { title: "Ficha de sección" };

export default async function FichaSeccionPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await (searchParams ?? Promise.resolve({} as { tab?: string }));

  if (!UUID_REGEX.test(id)) notFound();

  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const [seccion] = await db
    .select({
      id: asignaturas.id,
      nombre: asignaturas.nombre,
      codigo: asignaturas.codigo,
      descripcion: asignaturas.descripcion,
      estado: asignaturas.estado,
      turno: asignaturas.turno,
      fechaInicio: asignaturas.fechaInicio,
      fechaFin: asignaturas.fechaFin,
      duracionMeses: asignaturas.duracionMeses,
      maxAlumnos: asignaturas.maxAlumnos,
      cursoId: asignaturas.cursoId,
      cursoNombre: cursos.nombre,
      cursoCodigo: cursos.codigo,
      periodoId: asignaturas.periodoId,
      periodoNombre: periodosAcademicos.nombre,
      periodoCodigo: periodosAcademicos.codigo,
      periodoEstado: periodosAcademicos.estado,
      docenteId: asignaturas.docenteId,
      docenteNombre: usuarios.nombre,
      docenteApellido: usuarios.apellido,
      docenteEmail: usuarios.email,
    })
    .from(asignaturas)
    .innerJoin(cursos, eq(asignaturas.cursoId, cursos.id))
    .innerJoin(periodosAcademicos, eq(asignaturas.periodoId, periodosAcademicos.id))
    .leftJoin(usuarios, eq(asignaturas.docenteId, usuarios.id))
    .where(and(eq(asignaturas.id, id), isNull(asignaturas.eliminadoAt)))
    .limit(1);

  if (!seccion) notFound();

  const [{ alumnos = 0 } = { alumnos: 0 }] = await db
    .select({ alumnos: count(matriculas.id) })
    .from(matriculas)
    .where(
      and(
        eq(matriculas.asignaturaId, id),
        eq(matriculas.activa, true),
        isNull(matriculas.eliminadoAt),
      ),
    );

  const proximasClases = await db
    .select({
      id: clases.id,
      titulo: clases.titulo,
      numeroSesion: clases.numeroSesion,
      fecha: clases.fecha,
      horaInicio: clases.horaInicio,
      horaFin: clases.horaFin,
      publicada: clases.publicada,
    })
    .from(clases)
    .where(
      and(
        eq(clases.asignaturaId, id),
        gte(clases.fecha, today),
        isNull(clases.eliminadoAt),
      ),
    )
    .orderBy(asc(clases.fecha), asc(clases.horaInicio))
    .limit(5);

  const [bloquesRow] = await db
    .select({ n: count(bloquesHorario.id) })
    .from(bloquesHorario)
    .where(and(eq(bloquesHorario.asignaturaId, id), isNull(bloquesHorario.eliminadoAt)));
  const totalBloques = Number(bloquesRow?.n ?? 0);

  const [clasesRow] = await db
    .select({ n: count(clases.id) })
    .from(clases)
    .where(and(eq(clases.asignaturaId, id), isNull(clases.eliminadoAt)));
  const totalClasesActivas = Number(clasesRow?.n ?? 0);

  const proximasEvaluaciones = await db
    .select({
      id: evaluaciones.id,
      titulo: evaluaciones.titulo,
      tipo: evaluaciones.tipo,
      fechaInicio: evaluaciones.fechaInicio,
      fechaLimite: evaluaciones.fechaLimite,
      publicada: evaluaciones.publicada,
    })
    .from(evaluaciones)
    .where(
      and(
        eq(evaluaciones.asignaturaId, id),
        isNull(evaluaciones.eliminadoAt),
        eq(evaluaciones.esEncuesta, false),
      ),
    )
    .orderBy(asc(evaluaciones.fechaLimite))
    .limit(5);

  const [alumnosCarpeta, notasCarpeta, asistenciaCarpeta, certificadosCarpeta] = await Promise.all([
    db
      .select({
        matriculaId: matriculas.id,
        alumnoId: usuarios.id,
        alumnoNombre: usuarios.nombre,
        alumnoApellido: usuarios.apellido,
        alumnoRut: usuarios.rut,
        estadoPago: matriculas.estadoPago,
        activa: matriculas.activa,
        fechaMatricula: matriculas.createdAt,
      })
      .from(matriculas)
      .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
      .where(and(eq(matriculas.asignaturaId, id), isNull(matriculas.eliminadoAt)))
      .orderBy(asc(usuarios.apellido), asc(usuarios.nombre)),
    db
      .select({
        matriculaId: notasDocente.matriculaId,
        totalNotas: sql<number>`count(${notasDocente.id})::int`,
        promedio: sql<number | null>`avg(${notasDocente.nota}::numeric)::float`,
      })
      .from(notasDocente)
      .where(eq(notasDocente.asignaturaId, id))
      .groupBy(notasDocente.matriculaId),
    db
      .select({
        matriculaId: asistencia.matriculaId,
        totalRegistros: sql<number>`count(${asistencia.id})::int`,
        presentes: sql<number>`count(*) filter (where ${asistencia.estado} in ('presente', 'tardanza', 'justificado'))::int`,
      })
      .from(asistencia)
      .innerJoin(clases, eq(asistencia.claseId, clases.id))
      .where(and(eq(clases.asignaturaId, id), isNull(clases.eliminadoAt)))
      .groupBy(asistencia.matriculaId),
    db
      .select({
        matriculaId: certificados.matriculaId,
        totalCertificados: sql<number>`count(${certificados.id})::int`,
      })
      .from(certificados)
      .innerJoin(matriculas, eq(certificados.matriculaId, matriculas.id))
      .where(and(eq(matriculas.asignaturaId, id), eq(certificados.valido, true)))
      .groupBy(certificados.matriculaId),
  ]);

  const notasByMatricula = new Map(notasCarpeta.map((row) => [row.matriculaId, row]));
  const asistenciaByMatricula = new Map(asistenciaCarpeta.map((row) => [row.matriculaId, row]));
  const certificadosByMatricula = new Map(certificadosCarpeta.map((row) => [row.matriculaId, row]));
  const carpetaAcademica = alumnosCarpeta.map((alumno) => {
    const nota = notasByMatricula.get(alumno.matriculaId);
    const asist = asistenciaByMatricula.get(alumno.matriculaId);
    const cert = certificadosByMatricula.get(alumno.matriculaId);
    const totalAsistencia = Number(asist?.totalRegistros ?? 0);
    const presentes = Number(asist?.presentes ?? 0);
    const asistenciaPct = totalAsistencia > 0 ? Math.round((presentes / totalAsistencia) * 100) : null;

    return {
      ...alumno,
      totalNotas: Number(nota?.totalNotas ?? 0),
      promedio: nota?.promedio ?? null,
      asistenciaPct,
      asistenciaDetalle: `${presentes}/${totalAsistencia}`,
      totalCertificados: Number(cert?.totalCertificados ?? 0),
    };
  });

  const activeTab: TabId = (TABS.find((t) => t.id === sp.tab)?.id ?? "resumen") as TabId;
  const estadoMeta = ESTADO_LABELS[seccion.estado ?? "borrador"] ?? ESTADO_LABELS.borrador;
  const docenteFullName = seccion.docenteId
    ? `${seccion.docenteNombre ?? ""} ${seccion.docenteApellido ?? ""}`.trim()
    : null;

  return (
    <section className="space-y-5">
      <div>
        <Link
          href="/admin/asignaturas"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary transition-colors hover:text-primary dark:text-gray-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a Secciones
        </Link>
      </div>

      <header className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-text-secondary dark:text-gray-400">
              {seccion.cursoCodigo ? `${seccion.cursoCodigo} · ` : ""}
              {seccion.cursoNombre}
            </p>
            <h1 className="text-xl font-bold text-text-primary dark:text-white sm:text-2xl">
              {seccion.nombre}
            </h1>
            <p className="text-sm text-text-secondary dark:text-gray-400">
              {seccion.codigo ? `Código ${seccion.codigo} · ` : ""}
              Periodo {seccion.periodoCodigo ?? seccion.periodoNombre} · Turno {seccion.turno}
            </p>
          </div>
          <span
            className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold ${estadoMeta.tone}`}
          >
            {estadoMeta.label}
          </span>
        </div>
      </header>

      <nav className="overflow-x-auto rounded-2xl border border-gray-200/80 bg-white p-1.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <ul className="flex min-w-max items-center gap-1">
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            const Icon = tab.Icon;
            return (
              <li key={tab.id}>
                <Link
                  href={`/admin/secciones/${id}?tab=${tab.id}`}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-primary text-white shadow-sm"
                      : "text-text-secondary hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {activeTab === "resumen" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <article className="lg:col-span-2 space-y-4">
            <ConfiguracionPipeline
              seccionId={id}
              tieneBloques={totalBloques > 0}
              tieneClases={totalClasesActivas > 0}
              tieneDocente={Boolean(seccion.docenteId)}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard
                label="Alumnos matriculados"
                value={`${alumnos}${seccion.maxAlumnos ? ` / ${seccion.maxAlumnos}` : ""}`}
              />
              <MetricCard
                label="Duración"
                value={`${seccion.duracionMeses} mes${seccion.duracionMeses === 1 ? "" : "es"}`}
              />
              <MetricCard label="Inicio" value={formatDate(seccion.fechaInicio)} />
              <MetricCard label="Fin" value={formatDate(seccion.fechaFin)} />
            </div>

            {seccion.descripcion ? (
              <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                  Descripción
                </p>
                <p className="mt-2 whitespace-pre-line text-sm text-text-primary dark:text-gray-200">
                  {seccion.descripcion}
                </p>
              </div>
            ) : null}

            <ListPanel
              title="Próximas clases"
              emptyText="Sin clases programadas a futuro."
              items={proximasClases.map((c) => ({
                key: c.id,
                title: `${c.numeroSesion ? `S${c.numeroSesion} · ` : ""}${c.titulo}`,
                meta: `${formatDate(c.fecha)} · ${formatTime(c.horaInicio)}-${formatTime(c.horaFin)}`,
                badge: c.publicada ? "Publicada" : "Borrador",
              }))}
            />

            <ListPanel
              title="Próximas evaluaciones"
              emptyText="Sin evaluaciones programadas."
              items={proximasEvaluaciones.map((e) => ({
                key: e.id,
                title: e.titulo,
                meta: `${e.tipo}${e.fechaLimite ? ` · ${formatDate(e.fechaLimite.toString().slice(0, 10))}` : ""}`,
                badge: e.publicada ? "Publicada" : "Borrador",
              }))}
            />
          </article>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                Docente asignado
              </p>
              {docenteFullName ? (
                <div className="mt-2 space-y-1">
                  <p className="text-sm font-semibold text-text-primary dark:text-white">
                    {docenteFullName}
                  </p>
                  {seccion.docenteEmail ? (
                    <p className="text-xs text-text-secondary dark:text-gray-400">
                      {seccion.docenteEmail}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-sm text-text-secondary dark:text-gray-400">
                  Sin docente asignado.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                Periodo académico
              </p>
              <p className="mt-2 text-sm font-semibold text-text-primary dark:text-white">
                {seccion.periodoNombre}
              </p>
              <p className="text-xs text-text-secondary dark:text-gray-400">
                Estado: {seccion.periodoEstado}
              </p>
            </div>
          </aside>
        </div>
      ) : activeTab === "carpeta" ? (
        <article className="rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-text-primary dark:text-white">
                  Carpeta académica de la sección
                </h2>
                <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
                  Vista integrada por alumno: matrícula, pago, asistencia, notas y certificados.
                </p>
              </div>
              <span className="mt-2 inline-flex w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light sm:mt-0">
                {carpetaAcademica.length} alumno(s)
              </span>
            </div>
          </div>

          {carpetaAcademica.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-text-secondary dark:text-gray-400">
              No hay matrículas registradas para esta sección.
            </p>
          ) : (
            <>
              <div className="space-y-3 p-4 sm:hidden">
                {carpetaAcademica.map((row) => (
                  <CarpetaAlumnoCard key={row.matriculaId} row={row} />
                ))}
              </div>
              <div className="hidden overflow-x-auto sm:block">
                <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                      <th className="px-4 py-3">Alumno</th>
                      <th className="px-4 py-3">Matrícula</th>
                      <th className="px-4 py-3">Asistencia</th>
                      <th className="px-4 py-3">Notas</th>
                      <th className="px-4 py-3">Certificados</th>
                      <th className="px-4 py-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                    {carpetaAcademica.map((row) => (
                      <tr key={row.matriculaId} className="hover:bg-primary/[0.02] dark:hover:bg-primary/5">
                        <td className="px-4 py-3">
                          <p className="font-medium text-text-primary dark:text-white">
                            {row.alumnoNombre} {row.alumnoApellido}
                          </p>
                          <p className="mt-0.5 text-xs text-text-secondary dark:text-gray-400">
                            {row.alumnoRut ?? "Sin RUT"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-text-secondary dark:text-gray-400">
                          <p>{row.activa ? "Activa" : "Inactiva"}</p>
                          <p className="text-xs">Pago: {row.estadoPago ?? "-"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-text-primary dark:text-white">
                            {row.asistenciaPct === null ? "Sin registros" : `${row.asistenciaPct}%`}
                          </p>
                          <p className="text-xs text-text-secondary dark:text-gray-400">{row.asistenciaDetalle}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-text-primary dark:text-white">
                            {row.promedio === null ? "Sin notas" : Number(row.promedio).toFixed(1)}
                          </p>
                          <p className="text-xs text-text-secondary dark:text-gray-400">{row.totalNotas} registro(s)</p>
                        </td>
                        <td className="px-4 py-3 text-text-secondary dark:text-gray-400">
                          {row.totalCertificados}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/historial?periodoId=${seccion.periodoId}`}
                            className="inline-flex rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 dark:border-primary-light/30 dark:text-primary-light"
                          >
                            Ver historial
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </article>
      ) : (
        <TabHub tabId={activeTab} asignaturaId={id} periodoId={seccion.periodoId} />
      )}
    </section>
  );
}

type CarpetaRow = {
  matriculaId: string;
  alumnoNombre: string;
  alumnoApellido: string;
  alumnoRut: string | null;
  activa: boolean | null;
  estadoPago: "pendiente" | "pagado" | "mora" | "becado" | null;
  asistenciaPct: number | null;
  asistenciaDetalle: string;
  totalNotas: number;
  promedio: number | null;
  totalCertificados: number;
};

function CarpetaAlumnoCard({ row }: { row: CarpetaRow }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-800/60">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-text-primary dark:text-white">
            {row.alumnoNombre} {row.alumnoApellido}
          </p>
          <p className="mt-0.5 text-xs text-text-secondary dark:text-gray-400">{row.alumnoRut ?? "Sin RUT"}</p>
        </div>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-text-secondary shadow-sm dark:bg-gray-900 dark:text-gray-300">
          {row.estadoPago ?? "-"}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-white p-2 dark:bg-gray-900">
          <p className="font-bold text-text-primary dark:text-white">{row.asistenciaPct === null ? "-" : `${row.asistenciaPct}%`}</p>
          <p className="text-text-secondary dark:text-gray-400">Asistencia</p>
        </div>
        <div className="rounded-lg bg-white p-2 dark:bg-gray-900">
          <p className="font-bold text-text-primary dark:text-white">{row.promedio === null ? "-" : Number(row.promedio).toFixed(1)}</p>
          <p className="text-text-secondary dark:text-gray-400">Promedio</p>
        </div>
        <div className="rounded-lg bg-white p-2 dark:bg-gray-900">
          <p className="font-bold text-text-primary dark:text-white">{row.totalCertificados}</p>
          <p className="text-text-secondary dark:text-gray-400">Docs</p>
        </div>
      </div>
    </div>
  );
}

function ConfiguracionPipeline({
  seccionId,
  tieneBloques,
  tieneClases,
  tieneDocente,
}: {
  seccionId: string;
  tieneBloques: boolean;
  tieneClases: boolean;
  tieneDocente: boolean;
}) {
  const pasos = [
    {
      id: "docente",
      label: "Docente asignado",
      ok: tieneDocente,
      cta: "Asignar docente",
      href: `/admin/asignaturas?asignaturaId=${seccionId}`,
    },
    {
      id: "bloques",
      label: "Bloques horarios",
      ok: tieneBloques,
      cta: "Definir bloques",
      href: `/admin/horarios?asignaturaId=${seccionId}`,
    },
    {
      id: "clases",
      label: "Clases del calendario",
      ok: tieneClases,
      cta: "Crear / generar clases",
      href: `/admin/clases?asignaturaId=${seccionId}`,
    },
  ];
  const pendientes = pasos.filter((p) => !p.ok);
  if (pendientes.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
        <p className="font-semibold">Sección lista</p>
        <p className="mt-0.5">Docente, bloques y clases configurados. Ya puede operar.</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
      <p className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
        Configuración pendiente · {pendientes.length} paso{pendientes.length === 1 ? "" : "s"}
      </p>
      <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
        Flujo: <strong>Docente → Bloques horarios → Clases del calendario</strong>. Completa para
        habilitar asistencia, notas y evaluaciones.
      </p>
      <ul className="mt-3 space-y-2">
        {pasos.map((p) => (
          <li
            key={p.id}
            className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 ${
              p.ok
                ? "border-emerald-200 bg-white text-emerald-700 dark:border-emerald-900 dark:bg-gray-900 dark:text-emerald-300"
                : "border-amber-200 bg-white text-amber-800 dark:border-amber-900 dark:bg-gray-900 dark:text-amber-200"
            }`}
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold">
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                  p.ok
                    ? "bg-emerald-500 text-white"
                    : "border border-amber-400 bg-white text-amber-700 dark:bg-gray-800"
                }`}
              >
                {p.ok ? "✓" : "·"}
              </span>
              {p.label}
            </span>
            {!p.ok ? (
              <Link
                href={p.href}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-amber-600 px-3 text-[11px] font-semibold text-white transition hover:bg-amber-700"
              >
                {p.cta}
              </Link>
            ) : (
              <span className="text-[11px] font-medium opacity-70">Listo</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs font-medium uppercase tracking-wide text-text-secondary dark:text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-text-primary dark:text-white">{value}</p>
    </article>
  );
}

type ListItem = { key: string; title: string; meta: string; badge?: string };

function ListPanel({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: ListItem[];
  emptyText: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-text-secondary dark:text-gray-400">{emptyText}</p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100 dark:divide-gray-800">
          {items.map((it) => (
            <li key={it.key} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text-primary dark:text-gray-200">
                  {it.title}
                </p>
                <p className="text-xs text-text-secondary dark:text-gray-400">{it.meta}</p>
              </div>
              {it.badge ? (
                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {it.badge}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TabHub({
  tabId,
  asignaturaId,
  periodoId,
}: {
  tabId: TabId;
  asignaturaId: string;
  periodoId: string;
}) {
  const tab = TABS.find((t) => t.id === tabId);
  if (!tab || !tab.href) return null;

  const params = new URLSearchParams();
  params.set("asignaturaId", asignaturaId);
  if (periodoId) params.set("periodoId", periodoId);
  const href = `${tab.href}?${params.toString()}`;

  return (
    <article className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <p className="text-sm text-text-secondary dark:text-gray-400">
        La gestión avanzada de <strong>{tab.label.toLowerCase()}</strong> vive en su módulo
        especializado. Te llevamos allá con esta sección preseleccionada.
      </p>
      <Link
        href={href}
        className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-dark"
      >
        Abrir {tab.label}
      </Link>
    </article>
  );
}
