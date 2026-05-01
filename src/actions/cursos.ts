"use server";

import { and, asc, count, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDb } from "@/db";
import { asignaturas, cursos, periodosAcademicos, usuarios } from "@/db/schema";
import { registrarAudit } from "@/lib/audit";
import { sanitizeText } from "@/lib/sanitize";

import { resolvePagination, type PaginationInput } from "./_pagination";
import { requireActionActor, type MutationResult } from "./_security";

// ---- Validaciones ----

const cursoInputSchema = z.object({
  nombre: z.string().trim().min(2).max(120),
  codigo: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9_-]+$/i, "Solo letras, números, guión y guión bajo.")
    .transform((v) => v.toUpperCase()),
  descripcion: z.string().trim().max(500).optional(),
  horasTeoricas: z.coerce.number().int().min(0).max(9999).default(0),
  horasPracticas: z.coerce.number().int().min(0).max(9999).default(0),
});

// ---- Listado ----

export async function listarCursos(
  pagination: PaginationInput = {},
  options?: { query?: string; incluirInactivos?: boolean },
) {
  const actorResult = await requireActionActor("listar_cursos", ["admin"]);
  if (!actorResult.ok) return [];

  const db = getDb();
  const { limit, offset } = resolvePagination(pagination);

  const conditions = [isNull(cursos.eliminadoAt)];
  if (!options?.incluirInactivos) conditions.push(eq(cursos.activo, true));
  if (options?.query) {
    const term = `%${options.query.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
    conditions.push(
      or(ilike(cursos.nombre, term), ilike(cursos.codigo, term))!,
    );
  }

  return db
    .select({
      id: cursos.id,
      nombre: cursos.nombre,
      codigo: cursos.codigo,
      descripcion: cursos.descripcion,
      horasTeoricas: cursos.horasTeoricas,
      horasPracticas: cursos.horasPracticas,
      activo: cursos.activo,
      createdAt: cursos.createdAt,
      totalSecciones: count(asignaturas.id).mapWith(Number),
    })
    .from(cursos)
    .leftJoin(
      asignaturas,
      and(eq(asignaturas.cursoId, cursos.id), isNull(asignaturas.eliminadoAt)),
    )
    .where(and(...conditions))
    .groupBy(
      cursos.id,
      cursos.nombre,
      cursos.codigo,
      cursos.descripcion,
      cursos.horasTeoricas,
      cursos.horasPracticas,
      cursos.activo,
      cursos.createdAt,
    )
    .orderBy(asc(cursos.nombre))
    .limit(limit)
    .offset(offset);
}

export async function contarCursos(options?: { query?: string; incluirInactivos?: boolean }) {
  const actorResult = await requireActionActor("contar_cursos", ["admin"]);
  if (!actorResult.ok) return 0;

  const db = getDb();
  const conditions = [isNull(cursos.eliminadoAt)];
  if (!options?.incluirInactivos) conditions.push(eq(cursos.activo, true));
  if (options?.query) {
    const term = `%${options.query.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
    conditions.push(or(ilike(cursos.nombre, term), ilike(cursos.codigo, term))!);
  }

  const [row] = await db
    .select({ total: count() })
    .from(cursos)
    .where(and(...conditions));

  return row?.total ?? 0;
}

export async function obtenerCurso(id: string) {
  const actorResult = await requireActionActor("obtener_curso", ["admin"]);
  if (!actorResult.ok) return null;

  const db = getDb();
  const [curso] = await db
    .select()
    .from(cursos)
    .where(and(eq(cursos.id, id), isNull(cursos.eliminadoAt)))
    .limit(1);

  return curso ?? null;
}

// Para comboboxes en formularios de secciones (todos los roles admin)
export async function listarCursosCombobox() {
  const actorResult = await requireActionActor("listar_cursos_combobox", ["admin"]);
  if (!actorResult.ok) return [];

  const db = getDb();
  return db
    .select({ id: cursos.id, nombre: cursos.nombre, codigo: cursos.codigo })
    .from(cursos)
    .where(and(eq(cursos.activo, true), isNull(cursos.eliminadoAt)))
    .orderBy(asc(cursos.nombre));
}

// ---- Mutaciones ----

export async function crearCurso(input: unknown): Promise<MutationResult> {
  const actorResult = await requireActionActor("crear_curso", ["admin"]);
  if (!actorResult.ok) return actorResult.result;

  const parsed = cursoInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid_input", message: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { nombre, codigo, descripcion, horasTeoricas, horasPracticas } = parsed.data;

  const db = getDb();

  const [existente] = await db
    .select({ id: cursos.id })
    .from(cursos)
    .where(and(eq(cursos.codigo, codigo), isNull(cursos.eliminadoAt)))
    .limit(1);

  if (existente) {
    return { ok: false, code: "codigo_duplicado", message: "Ya existe un curso con ese código." };
  }

  const [nuevo] = await db
    .insert(cursos)
    .values({
      nombre: sanitizeText(nombre),
      codigo,
      descripcion: descripcion ? sanitizeText(descripcion) : null,
      horasTeoricas,
      horasPracticas,
      createdBy: actorResult.actor.userId,
    })
    .returning({ id: cursos.id });

  await registrarAudit({
    correlationId: actorResult.actor.correlationId,
    userId: actorResult.actor.userId,
    userRol: actorResult.actor.userRol,
    accion: "crear",
    entidad: "cursos",
    entidadId: nuevo.id,
    payload: { nombre, codigo },
    exitoso: true,
  });

  revalidatePath("/admin/cursos");
  return { ok: true, code: "curso_creado" };
}

export async function editarCurso(id: string, input: unknown): Promise<MutationResult> {
  const actorResult = await requireActionActor("editar_curso", ["admin"]);
  if (!actorResult.ok) return actorResult.result;

  const parsed = cursoInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid_input", message: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { nombre, codigo, descripcion, horasTeoricas, horasPracticas } = parsed.data;

  const db = getDb();

  const [conflicto] = await db
    .select({ id: cursos.id })
    .from(cursos)
    .where(and(eq(cursos.codigo, codigo), isNull(cursos.eliminadoAt), sql`${cursos.id} != ${id}`))
    .limit(1);

  if (conflicto) {
    return { ok: false, code: "codigo_duplicado", message: "Ya existe otro curso con ese código." };
  }

  await db
    .update(cursos)
    .set({
      nombre: sanitizeText(nombre),
      codigo,
      descripcion: descripcion ? sanitizeText(descripcion) : null,
      horasTeoricas,
      horasPracticas,
      updatedAt: new Date(),
    })
    .where(and(eq(cursos.id, id), isNull(cursos.eliminadoAt)));

  await registrarAudit({
    correlationId: actorResult.actor.correlationId,
    userId: actorResult.actor.userId,
    userRol: actorResult.actor.userRol,
    accion: "editar",
    entidad: "cursos",
    entidadId: id,
    payload: { nombre, codigo },
    exitoso: true,
  });

  revalidatePath("/admin/cursos");
  return { ok: true, code: "curso_actualizado" };
}

export async function toggleActivoCurso(id: string): Promise<MutationResult> {
  const actorResult = await requireActionActor("toggle_activo_curso", ["admin"]);
  if (!actorResult.ok) return actorResult.result;

  const db = getDb();

  const [curso] = await db
    .select({ id: cursos.id, activo: cursos.activo })
    .from(cursos)
    .where(and(eq(cursos.id, id), isNull(cursos.eliminadoAt)))
    .limit(1);

  if (!curso) return { ok: false, code: "not_found", message: "Curso no encontrado." };

  await db
    .update(cursos)
    .set({ activo: !curso.activo, updatedAt: new Date() })
    .where(eq(cursos.id, id));

  revalidatePath("/admin/cursos");
  return { ok: true, code: curso.activo ? "curso_desactivado" : "curso_activado" };
}

export async function eliminarCurso(id: string): Promise<MutationResult> {
  const actorResult = await requireActionActor("eliminar_curso", ["admin"]);
  if (!actorResult.ok) return actorResult.result;

  const db = getDb();

  // Verificar que no tenga secciones activas
  const [conSecciones] = await db
    .select({ total: count() })
    .from(asignaturas)
    .where(and(eq(asignaturas.cursoId, id), isNull(asignaturas.eliminadoAt)));

  if ((conSecciones?.total ?? 0) > 0) {
    return { ok: false, code: "tiene_secciones", message: "No se puede eliminar: tiene secciones asociadas." };
  }

  await db
    .update(cursos)
    .set({ eliminadoAt: new Date(), eliminadoPor: actorResult.actor.userId })
    .where(eq(cursos.id, id));

  revalidatePath("/admin/cursos");
  return { ok: true, code: "curso_eliminado" };
}

// ---- Secciones de un curso ----

export async function listarSeccionesDeCurso(cursoId: string) {
  const actorResult = await requireActionActor("listar_secciones_curso", ["admin"]);
  if (!actorResult.ok) return [];

  const db = getDb();

  return db
    .select({
      id: asignaturas.id,
      nombre: asignaturas.nombre,
      codigo: asignaturas.codigo,
      turno: asignaturas.turno,
      estado: asignaturas.estado,
      fechaInicio: asignaturas.fechaInicio,
      fechaFin: asignaturas.fechaFin,
      docenteNombre: usuarios.nombre,
      docenteApellido: usuarios.apellido,
      periodoNombre: periodosAcademicos.nombre,
    })
    .from(asignaturas)
    .leftJoin(usuarios, eq(asignaturas.docenteId, usuarios.id))
    .leftJoin(periodosAcademicos, eq(asignaturas.periodoId, periodosAcademicos.id))
    .where(and(eq(asignaturas.cursoId, cursoId), isNull(asignaturas.eliminadoAt)))
    .orderBy(desc(asignaturas.fechaInicio));
}
