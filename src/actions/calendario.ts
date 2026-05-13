"use server";

import { and, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import {
  asignaturas,
  calendarioDocenteEventos,
  clases,
  cursos,
  evaluacionDestinatarios,
  evaluacionIntentos,
  evaluaciones,
  matriculas,
} from "@/db/schema";
import { requireActionActor } from "@/actions/_security";
import { sanitizeText } from "@/lib/sanitize";

export type EventoCalendario = {
  id: string;
  tipo: "clase" | "evaluacion" | "dia_libre" | "prueba" | "recordatorio";
  titulo: string;
  asignaturaNombre: string;
  fecha: string; // YYYY-MM-DD
  hora?: string | null;
  color: string;
  nota?: string | null;
  relevante?: boolean;
  personal?: boolean;
  href?: string | null;
  estado?: "futuro" | "pendiente" | "pasado" | null;
};

const COLORS = [
  "#8B3A9E", "#3B82F6", "#10B981", "#F59E0B", "#EC4899",
  "#6366F1", "#06B6D4", "#EF4444", "#14B8A6", "#F97316",
];
const PERSONAL_EVENT_TYPES = new Set(["clase", "dia_libre", "prueba", "recordatorio"]);
const PERSONAL_COLORS = new Set(["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#8B3A9E"]);

const normalizePersonalType = (value: string): EventoCalendario["tipo"] =>
  PERSONAL_EVENT_TYPES.has(value) ? (value as EventoCalendario["tipo"]) : "recordatorio";

const normalizeColor = (value: string): string =>
  PERSONAL_COLORS.has(value) ? value : "#6366F1";

// ── Alumno: clases y evaluaciones de sus cursos matriculados ──────────
export async function obtenerEventosCalendarioAlumno(
  mes: number,
  anio: number,
): Promise<EventoCalendario[]> {
  const actorResult = await requireActionActor("calendario_alumno", ["alumno"]);
  if (!actorResult.ok) return [];

  const db = getDb();
  const inicio = `${anio}-${String(mes).padStart(2, "0")}-01`;
  // Last day of month
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const fin = `${anio}-${String(mes).padStart(2, "0")}-${ultimoDia}`;

  // Get enrolled asignaturas
  const mats = await db
    .select({ id: matriculas.id, asignaturaId: matriculas.asignaturaId })
    .from(matriculas)
    .where(
      and(
        eq(matriculas.alumnoId, actorResult.actor.userId),
        eq(matriculas.activa, true),
        isNull(matriculas.eliminadoAt),
      ),
    );

  if (mats.length === 0) return [];
  const asigIds = mats.map((m) => m.asignaturaId);

  const hoyStr = new Date().toISOString().slice(0, 10);
  const ahoraMs = Date.now();
  const eventos: EventoCalendario[] = [];

  // Nombre de asignaturas para colores
  const asigs = await db
    .select({ id: asignaturas.id, nombre: asignaturas.nombre, cursoNombre: cursos.nombre })
    .from(asignaturas)
    .leftJoin(cursos, eq(asignaturas.cursoId, cursos.id))
    .where(eq(asignaturas.estado, "activo"));

  const colorMap: Record<string, string> = {};
  asigs.forEach((a, i) => {
    colorMap[a.id] = COLORS[i % COLORS.length];
  });
  const nombreMap: Record<string, string> = Object.fromEntries(
    asigs.map((a) => [a.id, a.cursoNombre ?? a.nombre]),
  );

  // Clases del mes
  for (const asigId of asigIds) {
    const clasesRows = await db
      .select({
        id: clases.id,
        titulo: clases.titulo,
        fecha: clases.fecha,
        horaInicio: clases.horaInicio,
        asignaturaId: clases.asignaturaId,
      })
      .from(clases)
      .where(
        and(
          eq(clases.asignaturaId, asigId),
          eq(clases.publicada, true),
          isNull(clases.eliminadoAt),
          gte(clases.fecha, inicio),
          lte(clases.fecha, fin),
        ),
      );

    for (const c of clasesRows) {
      eventos.push({
        id: c.id,
        tipo: "clase",
        titulo: c.titulo,
        asignaturaNombre: nombreMap[c.asignaturaId] ?? "",
        fecha: c.fecha,
        hora: c.horaInicio,
        color: colorMap[c.asignaturaId] ?? "#8B3A9E",
        href: "/alumno/clases",
        estado: c.fecha < hoyStr ? "pasado" : "futuro",
      });
    }

    // Evaluaciones del mes
    const evalRows = await db
      .select({
        id: evaluaciones.id,
        titulo: evaluaciones.titulo,
        fechaLimite: evaluaciones.fechaLimite,
        asignaturaId: evaluaciones.asignaturaId,
      })
      .from(evaluaciones)
      .where(
        and(
          eq(evaluaciones.asignaturaId, asigId),
          eq(evaluaciones.publicada, true),
          isNull(evaluaciones.eliminadoAt),
        ),
      );

    const destinatarios = evalRows.length
      ? await db
          .select({
            evaluacionId: evaluacionDestinatarios.evaluacionId,
            matriculaId: evaluacionDestinatarios.matriculaId,
          })
          .from(evaluacionDestinatarios)
          .where(inArray(evaluacionDestinatarios.evaluacionId, evalRows.map((row) => row.id)))
      : [];
    const destinatariosMap = new Map<string, Set<string>>();
    for (const row of destinatarios) {
      const current = destinatariosMap.get(row.evaluacionId) ?? new Set<string>();
      current.add(row.matriculaId);
      destinatariosMap.set(row.evaluacionId, current);
    }
    const matriculaId = mats.find((m) => m.asignaturaId === asigId)?.id ?? "";

    const evalIds = evalRows.map((row) => row.id);
    const intentosEnviados = evalIds.length && matriculaId
      ? await db
          .select({ evaluacionId: evaluacionIntentos.evaluacionId })
          .from(evaluacionIntentos)
          .where(
            and(
              inArray(evaluacionIntentos.evaluacionId, evalIds),
              eq(evaluacionIntentos.matriculaId, matriculaId),
            ),
          )
      : [];
    const respondidasSet = new Set(
      intentosEnviados.map((row) => row.evaluacionId),
    );

    for (const e of evalRows) {
      const habilitados = destinatariosMap.get(e.id);
      if (habilitados && !habilitados.has(matriculaId)) continue;
      if (!e.fechaLimite) continue;
      const fechaStr = e.fechaLimite.toISOString().slice(0, 10);
      if (fechaStr < inicio || fechaStr > fin) continue;
      const limiteMs = e.fechaLimite.getTime();
      const respondida = respondidasSet.has(e.id);
      const estado: EventoCalendario["estado"] = respondida
        ? "pasado"
        : limiteMs < ahoraMs
          ? "pasado"
          : "pendiente";
      eventos.push({
        id: e.id,
        tipo: "evaluacion",
        titulo: e.titulo,
        asignaturaNombre: nombreMap[e.asignaturaId] ?? "",
        fecha: fechaStr,
        hora: e.fechaLimite.toTimeString().slice(0, 5),
        color: colorMap[e.asignaturaId] ?? "#EF4444",
        href: "/alumno/evaluaciones",
        estado,
      });
    }
  }

  return eventos;
}

// ── Docente: clases y evaluaciones de sus asignaturas ─────────────────
export async function obtenerEventosCalendarioDocente(
  mes: number,
  anio: number,
): Promise<EventoCalendario[]> {
  const actorResult = await requireActionActor("calendario_docente", ["docente", "admin"]);
  if (!actorResult.ok) return [];

  const db = getDb();
  const inicio = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const fin = `${anio}-${String(mes).padStart(2, "0")}-${ultimoDia}`;

  const asigs = await db
    .select({ id: asignaturas.id, nombre: asignaturas.nombre, cursoNombre: cursos.nombre })
    .from(asignaturas)
    .leftJoin(cursos, eq(asignaturas.cursoId, cursos.id))
    .where(eq(asignaturas.docenteId, actorResult.actor.userId));

  const colorMap: Record<string, string> = {};
  asigs.forEach((a, i) => { colorMap[a.id] = COLORS[i % COLORS.length]; });
  const nombreMap: Record<string, string> = Object.fromEntries(
    asigs.map((a) => [a.id, a.cursoNombre ?? a.nombre]),
  );

  const eventos: EventoCalendario[] = [];

  for (const asig of asigs) {
    const clasesRows = await db
      .select({ id: clases.id, titulo: clases.titulo, fecha: clases.fecha, horaInicio: clases.horaInicio })
      .from(clases)
      .where(
        and(
          eq(clases.asignaturaId, asig.id),
          isNull(clases.eliminadoAt),
          gte(clases.fecha, inicio),
          lte(clases.fecha, fin),
        ),
      );

    for (const c of clasesRows) {
      eventos.push({
        id: c.id,
        tipo: "clase",
        titulo: c.titulo,
        asignaturaNombre: nombreMap[asig.id] ?? "",
        fecha: c.fecha,
        hora: c.horaInicio,
        color: colorMap[asig.id] ?? "#8B3A9E",
      });
    }

    const evalRows = await db
      .select({ id: evaluaciones.id, titulo: evaluaciones.titulo, fechaLimite: evaluaciones.fechaLimite })
      .from(evaluaciones)
      .where(eq(evaluaciones.asignaturaId, asig.id));

    for (const e of evalRows) {
      if (!e.fechaLimite) continue;
      const fechaStr = e.fechaLimite.toISOString().slice(0, 10);
      if (fechaStr < inicio || fechaStr > fin) continue;
      eventos.push({
        id: e.id,
        tipo: "evaluacion",
        titulo: e.titulo,
        asignaturaNombre: nombreMap[asig.id] ?? "",
        fecha: fechaStr,
        hora: e.fechaLimite.toTimeString().slice(0, 5),
        color: colorMap[asig.id] ?? "#EF4444",
      });
    }
  }

  const personales = await db
    .select({
      id: calendarioDocenteEventos.id,
      fecha: calendarioDocenteEventos.fecha,
      titulo: calendarioDocenteEventos.titulo,
      nota: calendarioDocenteEventos.nota,
      tipo: calendarioDocenteEventos.tipo,
      color: calendarioDocenteEventos.color,
      relevante: calendarioDocenteEventos.relevante,
    })
    .from(calendarioDocenteEventos)
    .where(
      and(
        eq(calendarioDocenteEventos.docenteId, actorResult.actor.userId),
        gte(calendarioDocenteEventos.fecha, inicio),
        lte(calendarioDocenteEventos.fecha, fin),
        isNull(calendarioDocenteEventos.eliminadoAt),
      ),
    );

  for (const evento of personales) {
    eventos.push({
      id: evento.id,
      tipo: normalizePersonalType(evento.tipo),
      titulo: evento.titulo,
      asignaturaNombre: "Personal",
      fecha: evento.fecha,
      hora: null,
      color: evento.color,
      nota: evento.nota,
      relevante: evento.relevante,
      personal: true,
    });
  }

  return eventos;
}

export async function crearEventoCalendarioDocenteFormAction(formData: FormData): Promise<void> {
  const actorResult = await requireActionActor("calendario_docente_event_create", ["docente", "admin"]);
  if (!actorResult.ok) redirect("/docente/calendario?state=error");

  const fecha = String(formData.get("fecha") ?? "").trim();
  const titulo = sanitizeText(String(formData.get("titulo") ?? ""))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  const nota = sanitizeText(String(formData.get("nota") ?? ""))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
  const tipo = normalizePersonalType(String(formData.get("tipo") ?? ""));
  const color = normalizeColor(String(formData.get("color") ?? ""));
  const relevante = formData.get("relevante") === "on";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !titulo) {
    redirect("/docente/calendario?state=error");
  }

  await getDb().insert(calendarioDocenteEventos).values({
    docenteId: actorResult.actor.userId,
    fecha,
    titulo,
    nota: nota || null,
    tipo,
    color,
    relevante,
  });

  revalidatePath("/docente/calendario");
  redirect("/docente/calendario?state=evento_created");
}

export async function eliminarEventoCalendarioDocenteFormAction(formData: FormData): Promise<void> {
  const actorResult = await requireActionActor("calendario_docente_event_delete", ["docente", "admin"]);
  if (!actorResult.ok) redirect("/docente/calendario?state=error");

  const eventoId = String(formData.get("eventoId") ?? "").trim();
  if (!eventoId) redirect("/docente/calendario?state=error");

  await getDb()
    .update(calendarioDocenteEventos)
    .set({
      eliminadoAt: new Date(),
      eliminadoPor: actorResult.actor.userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(calendarioDocenteEventos.id, eventoId),
        eq(calendarioDocenteEventos.docenteId, actorResult.actor.userId),
        isNull(calendarioDocenteEventos.eliminadoAt),
      ),
    );

  revalidatePath("/docente/calendario");
  redirect("/docente/calendario?state=evento_deleted");
}
