"use server";

import { and, asc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/db";
import {
  alumnoAccesosDocumentos,
  asignaturas,
  cursos,
  matriculas,
  periodosAcademicos,
  usuarios,
} from "@/db/schema";
import { registrarAudit } from "@/lib/audit";

import { requireActionActor, type MutationResult } from "./_security";

const uuidSchema = z.string().uuid();

const accesoInputSchema = z.object({
  alumnoId: uuidSchema,
  beneficioHabilitado: z.boolean(),
  credencialHabilitada: z.boolean(),
});

const accesoCursoInputSchema = z.object({
  asignaturaId: uuidSchema,
  beneficioHabilitado: z.boolean().optional(),
  credencialHabilitada: z.boolean().optional(),
}).refine(
  (value) => value.beneficioHabilitado !== undefined || value.credencialHabilitada !== undefined,
  "Debes indicar al menos un acceso para actualizar.",
);

const getStringField = (formData: FormData, field: string): string => {
  const rawValue = formData.get(field);
  return typeof rawValue === "string" ? rawValue : "";
};

const getBooleanField = (formData: FormData, field: string): boolean => {
  return getStringField(formData, field) === "true";
};

const escapeLike = (value: string): string => value.replace(/%/g, "\\%").replace(/_/g, "\\_");

export type AlumnoAccesoDocumentoRow = {
  alumnoId: string;
  nombre: string;
  apellido: string;
  rut: string | null;
  email: string | null;
  beneficioHabilitado: boolean;
  credencialHabilitada: boolean;
  secciones: string;
};

export async function listarAccesosDocumentosAdmin(options?: {
  query?: string;
  asignaturaId?: string;
}): Promise<AlumnoAccesoDocumentoRow[]> {
  const actorResult = await requireActionActor("admin_accesos_documentos_list", ["admin"]);
  if (!actorResult.ok) return [];

  const db = getDb();
  const conditions: (SQL | undefined)[] = [
    eq(usuarios.rol, "alumno"),
    isNull(usuarios.eliminadoAt),
  ];

  if (options?.query) {
    const term = `%${escapeLike(options.query)}%`;
    conditions.push(
      or(
        ilike(usuarios.nombre, term),
        ilike(usuarios.apellido, term),
        ilike(usuarios.rut, term),
        ilike(usuarios.email, term),
      ),
    );
  }

  if (options?.asignaturaId) {
    conditions.push(eq(matriculas.asignaturaId, options.asignaturaId));
  }

  const rows = await db
    .select({
      alumnoId: usuarios.id,
      nombre: usuarios.nombre,
      apellido: usuarios.apellido,
      rut: usuarios.rut,
      email: usuarios.email,
      beneficioHabilitado: sql<boolean>`coalesce(${alumnoAccesosDocumentos.beneficioHabilitado}, true)`,
      credencialHabilitada: sql<boolean>`coalesce(${alumnoAccesosDocumentos.credencialHabilitada}, true)`,
      secciones: sql<string>`coalesce(string_agg(distinct ${asignaturas.nombre}, ', ') filter (where ${asignaturas.id} is not null), '')`,
    })
    .from(usuarios)
    .leftJoin(alumnoAccesosDocumentos, eq(alumnoAccesosDocumentos.alumnoId, usuarios.id))
    .leftJoin(
      matriculas,
      and(
        eq(matriculas.alumnoId, usuarios.id),
        eq(matriculas.activa, true),
        isNull(matriculas.eliminadoAt),
      ),
    )
    .leftJoin(asignaturas, eq(matriculas.asignaturaId, asignaturas.id))
    .where(and(...conditions))
    .groupBy(
      usuarios.id,
      usuarios.nombre,
      usuarios.apellido,
      usuarios.rut,
      usuarios.email,
      alumnoAccesosDocumentos.beneficioHabilitado,
      alumnoAccesosDocumentos.credencialHabilitada,
    )
    .orderBy(asc(usuarios.apellido), asc(usuarios.nombre))
    .limit(200);

  return rows.map((row) => ({
    ...row,
    beneficioHabilitado: Boolean(row.beneficioHabilitado),
    credencialHabilitada: Boolean(row.credencialHabilitada),
    secciones: row.secciones || "Sin curso activo",
  }));
}

export async function listarSeccionesParaAccesosAdmin() {
  const actorResult = await requireActionActor("admin_accesos_documentos_secciones", ["admin"]);
  if (!actorResult.ok) return [];

  const db = getDb();

  return db
    .select({
      id: asignaturas.id,
      nombre: asignaturas.nombre,
      codigo: asignaturas.codigo,
      cursoId: asignaturas.cursoId,
      cursoNombre: cursos.nombre,
      cursoCodigo: cursos.codigo,
      periodoId: asignaturas.periodoId,
      periodoNombre: periodosAcademicos.nombre,
      periodoCodigo: periodosAcademicos.codigo,
      periodoEstado: periodosAcademicos.estado,
      matriculados: sql<number>`count(${matriculas.id})::int`,
    })
    .from(asignaturas)
    .innerJoin(cursos, eq(asignaturas.cursoId, cursos.id))
    .innerJoin(periodosAcademicos, eq(asignaturas.periodoId, periodosAcademicos.id))
    .leftJoin(
      matriculas,
      and(
        eq(matriculas.asignaturaId, asignaturas.id),
        eq(matriculas.activa, true),
        isNull(matriculas.eliminadoAt),
      ),
    )
    .where(isNull(asignaturas.eliminadoAt))
    .groupBy(
      asignaturas.id,
      asignaturas.nombre,
      asignaturas.codigo,
      asignaturas.cursoId,
      cursos.nombre,
      cursos.codigo,
      asignaturas.periodoId,
      periodosAcademicos.nombre,
      periodosAcademicos.codigo,
      periodosAcademicos.estado,
    )
    .orderBy(asc(cursos.nombre), asc(asignaturas.nombre));
}

export async function obtenerAccesoDocumentosAlumnoActual(): Promise<{
  beneficioHabilitado: boolean;
  credencialHabilitada: boolean;
} | null> {
  const actorResult = await requireActionActor("alumno_accesos_documentos_self", ["alumno"]);
  if (!actorResult.ok) return null;

  const db = getDb();
  const [row] = await db
    .select({
      beneficioHabilitado: sql<boolean>`coalesce(${alumnoAccesosDocumentos.beneficioHabilitado}, true)`,
      credencialHabilitada: sql<boolean>`coalesce(${alumnoAccesosDocumentos.credencialHabilitada}, true)`,
    })
    .from(usuarios)
    .leftJoin(alumnoAccesosDocumentos, eq(alumnoAccesosDocumentos.alumnoId, usuarios.id))
    .where(eq(usuarios.id, actorResult.actor.userId))
    .limit(1);

  if (!row) return null;

  return {
    beneficioHabilitado: Boolean(row.beneficioHabilitado),
    credencialHabilitada: Boolean(row.credencialHabilitada),
  };
}

export async function actualizarAccesoDocumentosAlumnoAction(
  input: z.infer<typeof accesoInputSchema>,
): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_accesos_documentos_update_alumno", ["admin"]);
  if (!actorResult.ok) return actorResult.result;

  const parsed = accesoInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid_input", message: "Datos inválidos para actualizar accesos." };
  }

  const db = getDb();
  const [alumno] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(and(eq(usuarios.id, parsed.data.alumnoId), eq(usuarios.rol, "alumno"), isNull(usuarios.eliminadoAt)))
    .limit(1);

  if (!alumno) {
    return { ok: false, code: "not_found", message: "Alumno no encontrado." };
  }

  await db
    .insert(alumnoAccesosDocumentos)
    .values({
      alumnoId: parsed.data.alumnoId,
      beneficioHabilitado: parsed.data.beneficioHabilitado,
      credencialHabilitada: parsed.data.credencialHabilitada,
      actualizadoPor: actorResult.actor.userId,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: alumnoAccesosDocumentos.alumnoId,
      set: {
        beneficioHabilitado: parsed.data.beneficioHabilitado,
        credencialHabilitada: parsed.data.credencialHabilitada,
        actualizadoPor: actorResult.actor.userId,
        updatedAt: new Date(),
      },
    });

  await registrarAudit({
    correlationId: actorResult.actor.correlationId,
    userId: actorResult.actor.userId,
    userRol: actorResult.actor.userRol,
    accion: "editar",
    entidad: "alumno_accesos_documentos",
    entidadId: parsed.data.alumnoId,
    payload: {
      beneficioHabilitado: parsed.data.beneficioHabilitado,
      credencialHabilitada: parsed.data.credencialHabilitada,
    },
    exitoso: true,
  });

  revalidatePath("/admin/beneficios-credenciales");
  revalidatePath("/alumno", "layout");
  return { ok: true, code: "acceso_alumno_actualizado" };
}

export async function actualizarAccesosCursoAction(
  input: z.infer<typeof accesoCursoInputSchema>,
): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_accesos_documentos_update_curso", ["admin"]);
  if (!actorResult.ok) return actorResult.result;

  const parsed = accesoCursoInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid_input", message: "Datos inválidos para actualizar el curso." };
  }

  const db = getDb();
  const [seccion] = await db
    .select({ id: asignaturas.id })
    .from(asignaturas)
    .where(and(eq(asignaturas.id, parsed.data.asignaturaId), isNull(asignaturas.eliminadoAt)))
    .limit(1);

  if (!seccion) {
    return { ok: false, code: "not_found", message: "Curso no encontrado." };
  }

  await db.execute(sql`
    insert into alumno_accesos_documentos (
      alumno_id,
      beneficio_habilitado,
      credencial_habilitada,
      actualizado_por,
      updated_at,
      created_at
    )
    select
      m.alumno_id,
      ${parsed.data.beneficioHabilitado ?? true},
      ${parsed.data.credencialHabilitada ?? true},
      ${actorResult.actor.userId},
      now(),
      now()
    from matriculas m
    inner join usuarios u on u.id = m.alumno_id
    where m.asignatura_id = ${parsed.data.asignaturaId}
      and m.activa = true
      and m.eliminado_at is null
      and u.rol = 'alumno'
      and u.eliminado_at is null
    on conflict (alumno_id) do update set
      beneficio_habilitado = ${parsed.data.beneficioHabilitado === undefined
        ? sql`alumno_accesos_documentos.beneficio_habilitado`
        : sql`${parsed.data.beneficioHabilitado}`},
      credencial_habilitada = ${parsed.data.credencialHabilitada === undefined
        ? sql`alumno_accesos_documentos.credencial_habilitada`
        : sql`${parsed.data.credencialHabilitada}`},
      actualizado_por = ${actorResult.actor.userId},
      updated_at = now()
  `);

  await registrarAudit({
    correlationId: actorResult.actor.correlationId,
    userId: actorResult.actor.userId,
    userRol: actorResult.actor.userRol,
    accion: "editar",
    entidad: "alumno_accesos_documentos",
    entidadId: parsed.data.asignaturaId,
    payload: {
      alcance: "curso",
      beneficioHabilitado: parsed.data.beneficioHabilitado,
      credencialHabilitada: parsed.data.credencialHabilitada,
    },
    exitoso: true,
  });

  revalidatePath("/admin/beneficios-credenciales");
  revalidatePath("/alumno", "layout");
  return { ok: true, code: "acceso_curso_actualizado" };
}

export async function actualizarAccesoDocumentosAlumnoFormAction(formData: FormData): Promise<void> {
  const result = await actualizarAccesoDocumentosAlumnoAction({
    alumnoId: getStringField(formData, "alumnoId"),
    beneficioHabilitado: getBooleanField(formData, "beneficioHabilitado"),
    credencialHabilitada: getBooleanField(formData, "credencialHabilitada"),
  });

  redirect(`/admin/beneficios-credenciales?state=${result.ok ? result.code : result.code}`);
}

export async function actualizarAccesosCursoFormAction(formData: FormData): Promise<void> {
  const tipoAcceso = getStringField(formData, "tipoAcceso");
  const habilitado = getBooleanField(formData, "habilitado");

  const result = await actualizarAccesosCursoAction({
    asignaturaId: getStringField(formData, "asignaturaId"),
    beneficioHabilitado: tipoAcceso === "beneficio" || tipoAcceso === "ambos" ? habilitado : undefined,
    credencialHabilitada: tipoAcceso === "credencial" || tipoAcceso === "ambos" ? habilitado : undefined,
  });

  redirect(`/admin/beneficios-credenciales?state=${result.ok ? result.code : result.code}`);
}
