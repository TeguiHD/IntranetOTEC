"use server";

import { and, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDb } from "@/db";
import {
  asignaturas,
  entregas,
  evaluaciones,
  matriculas,
  notas,
  notificaciones,
  notificacionesDestinatarios,
  retroalimentacion,
  usuarios,
} from "@/db/schema";
import { sanitizeText } from "@/lib/sanitize";
import { uploadFile } from "@/lib/storage";

import { enviarPushADestinatarios } from "./notificaciones";
import { requireActionActor, type MutationResult } from "./_security";

// ---- Consultas ----

/** Estado de entrega de un alumno para una evaluación */
export async function obtenerEntregasAlumno(evaluacionId: string) {
  const actorResult = await requireActionActor("obtener_entregas_alumno", ["alumno"]);
  if (!actorResult.ok) return [];

  const db = getDb();

  // Buscar matrícula del alumno
  const evalRow = await db
    .select({ asignaturaId: evaluaciones.asignaturaId })
    .from(evaluaciones)
    .where(eq(evaluaciones.id, evaluacionId))
    .limit(1);

  if (!evalRow[0]) return [];

  const [matricula] = await db
    .select({ id: matriculas.id })
    .from(matriculas)
    .where(
      and(
        eq(matriculas.alumnoId, actorResult.actor.userId),
        eq(matriculas.asignaturaId, evalRow[0].asignaturaId),
        eq(matriculas.activa, true),
        isNull(matriculas.eliminadoAt),
      ),
    )
    .limit(1);

  if (!matricula) return [];

  return db
    .select({
      id: entregas.id,
      intento: entregas.intento,
      archivoUrl: entregas.archivoUrl,
      archivoNombre: entregas.archivoNombre,
      comentarioAlumno: entregas.comentarioAlumno,
      estado: entregas.estado,
      entregadoAt: entregas.entregadoAt,
    })
    .from(entregas)
    .where(
      and(
        eq(entregas.evaluacionId, evaluacionId),
        eq(entregas.matriculaId, matricula.id),
      ),
    )
    .orderBy(desc(entregas.intento));
}

/** Lista de entregas pendientes de un docente para una evaluación */
export async function listarEntregasParaDocente(evaluacionId: string) {
  const actorResult = await requireActionActor("listar_entregas_docente", ["docente", "admin"]);
  if (!actorResult.ok) return [];

  const db = getDb();

  const [scope] = await db
    .select({
      evaluacionId: evaluaciones.id,
      asignaturaId: evaluaciones.asignaturaId,
      docenteId: asignaturas.docenteId,
    })
    .from(evaluaciones)
    .innerJoin(asignaturas, eq(evaluaciones.asignaturaId, asignaturas.id))
    .where(and(eq(evaluaciones.id, evaluacionId), isNull(evaluaciones.eliminadoAt), isNull(asignaturas.eliminadoAt)))
    .limit(1);

  if (!scope) return [];

  if (actorResult.actor.userRol === "docente" && scope.docenteId !== actorResult.actor.userId) {
    return [];
  }

  return db
    .select({
      id: entregas.id,
      intento: entregas.intento,
      archivoUrl: entregas.archivoUrl,
      archivoNombre: entregas.archivoNombre,
      comentarioAlumno: entregas.comentarioAlumno,
      estado: entregas.estado,
      entregadoAt: entregas.entregadoAt,
      matriculaId: entregas.matriculaId,
      alumnoNombre: usuarios.nombre,
      alumnoApellido: usuarios.apellido,
      alumnoRut: usuarios.rut,
    })
    .from(entregas)
    .innerJoin(matriculas, eq(entregas.matriculaId, matriculas.id))
    .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
    .where(eq(entregas.evaluacionId, evaluacionId))
    .orderBy(desc(entregas.entregadoAt));
}

/** Retroalimentación de una entrega */
export async function obtenerRetroalimentacion(entregaId: string) {
  const actorResult = await requireActionActor("obtener_retroalimentacion", ["alumno", "docente", "admin"]);
  if (!actorResult.ok) return [];

  const db = getDb();

  const [scope] = await db
    .select({
      entregaId: entregas.id,
      alumnoId: matriculas.alumnoId,
      docenteId: asignaturas.docenteId,
    })
    .from(entregas)
    .innerJoin(matriculas, eq(entregas.matriculaId, matriculas.id))
    .innerJoin(evaluaciones, eq(entregas.evaluacionId, evaluaciones.id))
    .innerJoin(asignaturas, eq(evaluaciones.asignaturaId, asignaturas.id))
    .where(eq(entregas.id, entregaId))
    .limit(1);

  if (!scope) return [];

  if (actorResult.actor.userRol === "alumno" && scope.alumnoId !== actorResult.actor.userId) {
    return [];
  }

  if (actorResult.actor.userRol === "docente" && scope.docenteId !== actorResult.actor.userId) {
    return [];
  }

  return db
    .select({
      id: retroalimentacion.id,
      comentario: retroalimentacion.comentario,
      archivoUrl: retroalimentacion.archivoUrl,
      nota: retroalimentacion.nota,
      createdAt: retroalimentacion.createdAt,
      docenteNombre: usuarios.nombre,
      docenteApellido: usuarios.apellido,
    })
    .from(retroalimentacion)
    .innerJoin(usuarios, eq(retroalimentacion.docenteId, usuarios.id))
    .where(eq(retroalimentacion.entregaId, entregaId))
    .orderBy(desc(retroalimentacion.createdAt));
}

// ---- Mutaciones ----

const entregaInputSchema = z.object({
  evaluacionId: z.string().uuid(),
  comentarioAlumno: z.string().trim().max(2000).optional(),
});

/** El alumno envía una entrega (archivo opcional + comentario) */
export async function enviarEntrega(formData: FormData): Promise<MutationResult> {
  const actorResult = await requireActionActor("enviar_entrega", ["alumno"]);
  if (!actorResult.ok) return actorResult.result;

  const parsed = entregaInputSchema.safeParse({
    evaluacionId: formData.get("evaluacionId"),
    comentarioAlumno: formData.get("comentarioAlumno"),
  });
  if (!parsed.success) {
    return { ok: false, code: "invalid_input", message: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { evaluacionId, comentarioAlumno } = parsed.data;

  const db = getDb();

  // Verificar que la evaluación acepta entregas
  const [eval_] = await db
    .select({ asignaturaId: evaluaciones.asignaturaId, tipo: evaluaciones.tipo, intentosMax: evaluaciones.intentosMax, fechaLimite: evaluaciones.fechaLimite })
    .from(evaluaciones)
    .where(and(eq(evaluaciones.id, evaluacionId), isNull(evaluaciones.eliminadoAt)))
    .limit(1);

  if (!eval_) return { ok: false, code: "not_found", message: "Evaluación no encontrada." };

  if (eval_.tipo !== "tarea" && eval_.tipo !== "proyecto") {
    return { ok: false, code: "tipo_invalido", message: "Solo se pueden entregar tareas y proyectos." };
  }

  if (eval_.fechaLimite && new Date() > new Date(eval_.fechaLimite)) {
    return { ok: false, code: "fuera_plazo", message: "La fecha límite de entrega ha pasado." };
  }

  // Obtener matrícula
  const [matricula] = await db
    .select({ id: matriculas.id })
    .from(matriculas)
    .where(
      and(
        eq(matriculas.alumnoId, actorResult.actor.userId),
        eq(matriculas.asignaturaId, eval_.asignaturaId),
        eq(matriculas.activa, true),
        isNull(matriculas.eliminadoAt),
      ),
    )
    .limit(1);

  if (!matricula) return { ok: false, code: "no_matriculado", message: "No estás matriculado en esta asignatura." };

  // Contar intentos previos
  const previas = await db
    .select({ intento: entregas.intento })
    .from(entregas)
    .where(and(eq(entregas.evaluacionId, evaluacionId), eq(entregas.matriculaId, matricula.id)))
    .orderBy(desc(entregas.intento));

  const intentoActual = (previas[0]?.intento ?? 0) + 1;

  if (eval_.intentosMax && intentoActual > eval_.intentosMax) {
    return { ok: false, code: "max_intentos", message: "Has alcanzado el máximo de intentos." };
  }

  // Subir archivo si existe
  let archivoUrl: string | null = null;
  let archivoNombre: string | null = null;
  const archivo = formData.get("archivo");

  if (archivo instanceof File && archivo.size > 0) {
    if (archivo.size > 50 * 1024 * 1024) {
      return { ok: false, code: "archivo_grande", message: "El archivo no puede superar 50 MB." };
    }
    const buffer = Buffer.from(await archivo.arrayBuffer());
    const ext = archivo.name.split(".").pop() ?? "bin";
    const path = `${actorResult.actor.userId}/${evaluacionId}/${intentoActual}.${ext}`;
    archivoUrl = await uploadFile("entregas", path, buffer, archivo.type);
    archivoNombre = sanitizeText(archivo.name).slice(0, 200);
  }

  await db.insert(entregas).values({
    evaluacionId,
    matriculaId: matricula.id,
    intento: intentoActual,
    archivoUrl,
    archivoNombre,
    comentarioAlumno: comentarioAlumno ? sanitizeText(comentarioAlumno) : null,
    estado: "pendiente",
  });

  revalidatePath(`/alumno/evaluaciones/${evaluacionId}`);
  return { ok: true, code: "entrega_enviada" };
}

const retroSchema = z.object({
  entregaId: z.string().uuid(),
  comentario: z.string().trim().min(1).max(3000),
  nota: z.coerce.number().min(1).max(7).optional(),
  requiereCorreccion: z.coerce.boolean().optional(),
});

/** El docente envía retroalimentación sobre una entrega */
export async function agregarRetroalimentacion(input: unknown): Promise<MutationResult> {
  const actorResult = await requireActionActor("agregar_retroalimentacion", ["docente", "admin"]);
  if (!actorResult.ok) return actorResult.result;

  const parsed = retroSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid_input", message: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { entregaId, comentario, nota, requiereCorreccion } = parsed.data;

  const db = getDb();

  const [entrega] = await db
    .select({
      id: entregas.id,
      evaluacionId: entregas.evaluacionId,
      matriculaId: entregas.matriculaId,
      alumnoId: matriculas.alumnoId,
      asignaturaId: evaluaciones.asignaturaId,
      docenteId: asignaturas.docenteId,
    })
    .from(entregas)
    .innerJoin(matriculas, eq(entregas.matriculaId, matriculas.id))
    .innerJoin(evaluaciones, eq(entregas.evaluacionId, evaluaciones.id))
    .innerJoin(asignaturas, eq(evaluaciones.asignaturaId, asignaturas.id))
    .where(and(eq(entregas.id, entregaId), isNull(asignaturas.eliminadoAt), isNull(evaluaciones.eliminadoAt)))
    .limit(1);

  if (!entrega) return { ok: false, code: "not_found", message: "Entrega no encontrada." };

  if (actorResult.actor.userRol === "docente" && entrega.docenteId !== actorResult.actor.userId) {
    return {
      ok: false,
      code: "forbidden",
      message: "No tienes permisos para retroalimentar esta entrega.",
    };
  }

  const nuevoEstado = requiereCorreccion ? "requiere_correccion" : "revisado";

  await db.transaction(async (tx) => {
    // Actualizar estado de la entrega
    await tx
      .update(entregas)
      .set({ estado: nuevoEstado })
      .where(eq(entregas.id, entregaId));

    // Crear registro de retroalimentación
    await tx.insert(retroalimentacion).values({
      entregaId,
      docenteId: actorResult.actor.userId,
      comentario: sanitizeText(comentario),
      nota: nota != null ? String(nota) : null,
    });

    // Si hay nota, upsert en tabla notas
    if (nota != null) {
      const existing = await tx
        .select({ id: notas.id })
        .from(notas)
        .where(and(eq(notas.evaluacionId, entrega.evaluacionId), eq(notas.matriculaId, entrega.matriculaId), isNull(notas.eliminadoAt)))
        .limit(1);

      if (existing[0]) {
        await tx
          .update(notas)
          .set({ nota: String(nota), entregaId, calificadoPor: actorResult.actor.userId, fechaNota: new Date() })
          .where(eq(notas.id, existing[0].id));
      } else {
        await tx.insert(notas).values({
          evaluacionId: entrega.evaluacionId,
          matriculaId: entrega.matriculaId,
          nota: String(nota),
          entregaId,
          calificadoPor: actorResult.actor.userId,
        });
      }
    }
  });

  const notifTitulo = requiereCorreccion
    ? "Tu entrega requiere correccion"
    : "Tu entrega fue revisada";
  const notifContenido = sanitizeText(comentario).slice(0, 500);

  const [notif] = await db
    .insert(notificaciones)
    .values({
      titulo: notifTitulo,
      contenido: notifContenido,
      tipo: "individual",
      emisorId: actorResult.actor.userId,
      asignaturaId: entrega.asignaturaId,
    })
    .returning({ id: notificaciones.id });

  if (notif) {
    await db.insert(notificacionesDestinatarios).values({
      notificacionId: notif.id,
      usuarioId: entrega.alumnoId,
    });
    enviarPushADestinatarios([entrega.alumnoId], notifTitulo, notifContenido).catch(() => {});
  }

  revalidatePath(`/docente/asignaturas`);
  revalidatePath(`/alumno/evaluaciones/${entrega.evaluacionId}`);
  revalidatePath("/alumno/notificaciones");
  return { ok: true, code: "retroalimentacion_agregada" };
}
