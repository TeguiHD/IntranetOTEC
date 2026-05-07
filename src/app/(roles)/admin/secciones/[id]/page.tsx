import Link from "next/link";
import { notFound } from "next/navigation";

import { and, asc, count, eq, gte, isNull } from "drizzle-orm";
import {
  ArrowLeft,
  Award,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  IdCard,
  Users,
} from "lucide-react";

import { getDb } from "@/db";
import {
  asignaturas,
  clases,
  cursos,
  evaluaciones,
  matriculas,
  periodosAcademicos,
  usuarios,
} from "@/db/schema";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TABS = [
  { id: "resumen", label: "Resumen", Icon: BookOpen, href: null },
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
      ) : (
        <TabHub tabId={activeTab} asignaturaId={id} periodoId={seccion.periodoId} />
      )}
    </section>
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
