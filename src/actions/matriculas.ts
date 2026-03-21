"use server";

import { and, count, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { asignaturas, matriculas, usuarios } from "@/db/schema";
import { registrarAudit } from "@/lib/audit";
import { finalizarAsignaturasVencidas } from "@/lib/courseLifecycle";
import {
  sendEmail,
  templateMatriculaCreada,
  templateMatriculaDesactivada,
} from "@/lib/email";
import { logEvent } from "@/lib/observability/logger";
import {
  desmatricularInputSchema,
  editarMatriculaInputSchema,
  matricularAlumnoInputSchema,
} from "@/lib/validations/admin";

import { resolvePagination, type PaginationInput } from "./_pagination";
import { requireActionActor, type MutationResult } from "./_security";

const getStringField = (formData: FormData, field: string): string => {
  const rawValue = formData.get(field);
  return typeof rawValue === "string" ? rawValue : "";
};

const parseMoneyField = (value: string): number | undefined => {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const parsed = Number.parseFloat(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const formatMoneyForDb = (value: number | undefined): string | null => {
  if (value === undefined) {
    return null;
  }

  return value.toFixed(2);
};

const parsePageField = (value: string): number | null => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
};

export async function listarMatriculasAdmin(
  pagination: PaginationInput = {},
  options?: { asignaturaId?: string; incluirInactivas?: boolean },
) {
  const actorResult = await requireActionActor("admin_matricula_list", ["admin"]);

  if (!actorResult.ok) {
    return [];
  }

  await finalizarAsignaturasVencidas();

  const db = getDb();
  const { limit, offset } = resolvePagination(pagination);

  const baseQuery = db
    .select({
      id: matriculas.id,
      asignaturaId: matriculas.asignaturaId,
      alumnoId: matriculas.alumnoId,
      montoArancel: matriculas.montoArancel,
      estadoPago: matriculas.estadoPago,
      fechaPago: matriculas.fechaPago,
      activa: matriculas.activa,
      eliminadoAt: matriculas.eliminadoAt,
      createdAt: matriculas.createdAt,
      asignaturaNombre: asignaturas.nombre,
      alumnoNombre: usuarios.nombre,
      alumnoApellido: usuarios.apellido,
      alumnoRut: usuarios.rut,
      alumnoEmail: usuarios.email,
    })
    .from(matriculas)
    .innerJoin(asignaturas, eq(matriculas.asignaturaId, asignaturas.id))
    .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
    .orderBy(desc(matriculas.createdAt))
    .limit(limit)
    .offset(offset);

  const byAsignatura = options?.asignaturaId
    ? eq(matriculas.asignaturaId, options.asignaturaId)
    : undefined;

  if (options?.incluirInactivas) {
    if (byAsignatura) {
      return baseQuery.where(byAsignatura);
    }

    return baseQuery;
  }

  if (byAsignatura) {
    return baseQuery.where(
      and(
        byAsignatura,
        eq(matriculas.activa, true),
        isNull(matriculas.eliminadoAt),
      ),
    );
  }

  return baseQuery.where(
    and(eq(matriculas.activa, true), isNull(matriculas.eliminadoAt)),
  );
}

export async function countMatriculasAdmin(
  options?: { asignaturaId?: string; incluirInactivas?: boolean },
): Promise<number> {
  const actorResult = await requireActionActor("admin_matricula_list", ["admin"]);

  if (!actorResult.ok) {
    return 0;
  }

  const db = getDb();

  const byAsignatura = options?.asignaturaId
    ? eq(matriculas.asignaturaId, options.asignaturaId)
    : undefined;

  const baseQuery = db.select({ total: count() }).from(matriculas);

  let result;

  if (options?.incluirInactivas) {
    result = byAsignatura
      ? await baseQuery.where(byAsignatura)
      : await baseQuery;
  } else if (byAsignatura) {
    result = await baseQuery.where(
      and(byAsignatura, eq(matriculas.activa, true), isNull(matriculas.eliminadoAt)),
    );
  } else {
    result = await baseQuery.where(
      and(eq(matriculas.activa, true), isNull(matriculas.eliminadoAt)),
    );
  }

  return Number(result[0]?.total ?? 0);
}

export async function matricularAlumnoAction(input: {
  asignaturaId: string;
  alumnoId: string;
  estadoPago: "pendiente" | "pagado" | "mora" | "becado";
  montoArancel?: number;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_matricula_create", ["admin"]);

  if (!actorResult.ok) {
    return actorResult.result;
  }

  await finalizarAsignaturasVencidas();

  const parsed = matricularAlumnoInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_input",
      message: "Datos inválidos para matrícula.",
    };
  }

  const db = getDb();
  const now = new Date();

  try {
    const [subject] = await db
      .select({
        id: asignaturas.id,
        nombre: asignaturas.nombre,
        estado: asignaturas.estado,
        maxAlumnos: asignaturas.maxAlumnos,
      })
      .from(asignaturas)
      .where(eq(asignaturas.id, parsed.data.asignaturaId))
      .limit(1);

    if (!subject) {
      return {
        ok: false,
        code: "asignatura_not_found",
        message: "Asignatura no encontrada.",
      };
    }

    if (subject.estado === "archivado" || subject.estado === "finalizado") {
      return {
        ok: false,
        code: "asignatura_closed",
        message: "No puedes matricular en una asignatura cerrada.",
      };
    }

    // Check capacity before inserting (skip if the alumno already has an existing matricula being reactivated)
    const [existingCheck] = await db
      .select({ id: matriculas.id })
      .from(matriculas)
      .where(
        and(
          eq(matriculas.alumnoId, parsed.data.alumnoId),
          eq(matriculas.asignaturaId, parsed.data.asignaturaId),
        ),
      )
      .limit(1);

    if (!existingCheck && subject.maxAlumnos !== null) {
      const [countResult] = await db
        .select({ total: count() })
        .from(matriculas)
        .where(
          and(
            eq(matriculas.asignaturaId, parsed.data.asignaturaId),
            eq(matriculas.activa, true),
            isNull(matriculas.eliminadoAt),
          ),
        );
      const currentCount = Number(countResult?.total ?? 0);
      if (currentCount >= subject.maxAlumnos) {
        return {
          ok: false,
          code: "max_alumnos_reached",
          message: "La asignatura ha alcanzado el cupo máximo de alumnos",
        };
      }
    }

    const [student] = await db
      .select({
        id: usuarios.id,
        nombre: usuarios.nombre,
        apellido: usuarios.apellido,
        email: usuarios.email,
      })
      .from(usuarios)
      .where(
        and(
          eq(usuarios.id, parsed.data.alumnoId),
          eq(usuarios.rol, "alumno"),
          eq(usuarios.activo, true),
          isNull(usuarios.eliminadoAt),
        ),
      )
      .limit(1);

    if (!student) {
      return {
        ok: false,
        code: "alumno_not_found",
        message: "Alumno no disponible para matrícula.",
      };
    }

    const [existing] = await db
      .select({
        id: matriculas.id,
      })
      .from(matriculas)
      .where(
        and(
          eq(matriculas.alumnoId, parsed.data.alumnoId),
          eq(matriculas.asignaturaId, parsed.data.asignaturaId),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .update(matriculas)
        .set({
          estadoPago: parsed.data.estadoPago,
          montoArancel: formatMoneyForDb(parsed.data.montoArancel),
          activa: true,
          eliminadoAt: null,
          eliminadoPor: null,
        })
        .where(eq(matriculas.id, existing.id));

      await registrarAudit({
        correlationId: actorResult.actor.correlationId,
        userId: actorResult.actor.userId,
        userRol: actorResult.actor.userRol,
        accion: "editar",
        entidad: "matriculas",
        entidadId: existing.id,
        payload: {
          estadoPago: parsed.data.estadoPago,
          reactivada: true,
        },
        exitoso: true,
      });

      if (student.email) {
        const { subject: emailSubject, html } = templateMatriculaCreada({
          alumnoNombre: `${student.nombre} ${student.apellido}`.trim(),
          asignaturaNombre: subject.nombre,
          estadoPago: parsed.data.estadoPago,
        });

        sendEmail(student.email, emailSubject, html).catch(() => {});
      }

      return { ok: true, code: "matricula_updated" };
    }

    const [created] = await db
      .insert(matriculas)
      .values({
        alumnoId: parsed.data.alumnoId,
        asignaturaId: parsed.data.asignaturaId,
        estadoPago: parsed.data.estadoPago,
        montoArancel: formatMoneyForDb(parsed.data.montoArancel),
        activa: true,
        createdAt: now,
      })
      .returning({ id: matriculas.id });

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "crear",
      entidad: "matriculas",
      entidadId: created.id,
      payload: {
        estadoPago: parsed.data.estadoPago,
      },
      exitoso: true,
    });

    if (student.email) {
      const { subject: emailSubject, html } = templateMatriculaCreada({
        alumnoNombre: `${student.nombre} ${student.apellido}`.trim(),
        asignaturaNombre: subject.nombre,
        estadoPago: parsed.data.estadoPago,
      });

      sendEmail(student.email, emailSubject, html).catch(() => {});
    }

    return { ok: true, code: "matricula_created" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";

    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "admin_matricula_create_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message },
    });

    return {
      ok: false,
      code: "matricula_create_failed",
      message: "No fue posible registrar la matrícula.",
    };
  }
}

export async function desmatricularAlumnoAction(input: {
  matriculaId: string;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_matricula_deactivate", [
    "admin",
  ]);

  if (!actorResult.ok) {
    return actorResult.result;
  }

  const parsed = desmatricularInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_input",
      message: "Matrícula inválida.",
    };
  }

  const db = getDb();

  try {
    const [row] = await db
      .select({
        id: matriculas.id,
        activa: matriculas.activa,
        alumnoNombre: usuarios.nombre,
        alumnoApellido: usuarios.apellido,
        alumnoEmail: usuarios.email,
        asignaturaNombre: asignaturas.nombre,
      })
      .from(matriculas)
      .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
      .innerJoin(asignaturas, eq(matriculas.asignaturaId, asignaturas.id))
      .where(eq(matriculas.id, parsed.data.matriculaId))
      .limit(1);

    if (!row) {
      return {
        ok: false,
        code: "matricula_not_found",
        message: "Matrícula no encontrada.",
      };
    }

    if (!row.activa) {
      return { ok: true, code: "already_inactive" };
    }

    await db
      .update(matriculas)
      .set({
        activa: false,
        eliminadoAt: new Date(),
        eliminadoPor: actorResult.actor.userId,
      })
      .where(eq(matriculas.id, row.id));

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "desactivar",
      entidad: "matriculas",
      entidadId: row.id,
      exitoso: true,
    });

    if (row.alumnoEmail) {
      const { subject: emailSubject, html } = templateMatriculaDesactivada({
        alumnoNombre: `${row.alumnoNombre} ${row.alumnoApellido}`.trim(),
        asignaturaNombre: row.asignaturaNombre,
      });

      sendEmail(row.alumnoEmail, emailSubject, html).catch(() => {});
    }

    return { ok: true, code: "matricula_deactivated" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";

    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "admin_matricula_deactivate_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message },
    });

    return {
      ok: false,
      code: "deactivate_failed",
      message: "No fue posible desmatricular al alumno.",
    };
  }
}

export async function editarMatriculaAction(input: {
  matriculaId: string;
  estadoPago: "pendiente" | "pagado" | "mora" | "becado";
  montoArancel?: number;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_matricula_edit", ["admin"]);

  if (!actorResult.ok) {
    return actorResult.result;
  }

  const parsed = editarMatriculaInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_input",
      message: "Datos inválidos para edición de matrícula.",
    };
  }

  const db = getDb();

  try {
    const [row] = await db
      .select({ id: matriculas.id, activa: matriculas.activa })
      .from(matriculas)
      .where(eq(matriculas.id, parsed.data.matriculaId))
      .limit(1);

    if (!row) {
      return {
        ok: false,
        code: "matricula_not_found",
        message: "Matrícula no encontrada.",
      };
    }

    await db
      .update(matriculas)
      .set({
        estadoPago: parsed.data.estadoPago,
        montoArancel: formatMoneyForDb(parsed.data.montoArancel),
      })
      .where(eq(matriculas.id, row.id));

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "editar",
      entidad: "matriculas",
      entidadId: row.id,
      payload: {
        estadoPago: parsed.data.estadoPago,
        montoArancel: parsed.data.montoArancel,
      },
      exitoso: true,
    });

    return { ok: true, code: "matricula_edited" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";

    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "admin_matricula_edit_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message },
    });

    return {
      ok: false,
      code: "edit_failed",
      message: "No fue posible editar la matrícula.",
    };
  }
}

export async function editarMatriculaFormAction(formData: FormData): Promise<void> {
  const asignaturaId = getStringField(formData, "asignaturaId");
  const page = parsePageField(getStringField(formData, "page"));
  const result = await editarMatriculaAction({
    matriculaId: getStringField(formData, "matriculaId"),
    estadoPago: (getStringField(formData, "estadoPago") ||
      "pendiente") as "pendiente" | "pagado" | "mora" | "becado",
    montoArancel: parseMoneyField(getStringField(formData, "montoArancel")),
  });

  revalidatePath("/admin/matriculas");
  const filterQuery = asignaturaId
    ? `&asignaturaId=${encodeURIComponent(asignaturaId)}`
    : "";
  const pageQuery = page ? `&page=${page}` : "";

  redirect(`/admin/matriculas?state=${result.ok ? result.code : "error"}${filterQuery}${pageQuery}`);
}

export async function matricularAlumnoFormAction(formData: FormData): Promise<void> {
  const asignaturaId = getStringField(formData, "asignaturaId");
  const page = parsePageField(getStringField(formData, "page"));
  const result = await matricularAlumnoAction({
    asignaturaId,
    alumnoId: getStringField(formData, "alumnoId"),
    estadoPago: (getStringField(formData, "estadoPago") ||
      "pendiente") as "pendiente" | "pagado" | "mora" | "becado",
    montoArancel: parseMoneyField(getStringField(formData, "montoArancel")),
  });

  revalidatePath("/admin/matriculas");
  const filterQuery = asignaturaId
    ? `&asignaturaId=${encodeURIComponent(asignaturaId)}`
    : "";
  const pageQuery = page ? `&page=${page}` : "";

  redirect(`/admin/matriculas?state=${result.ok ? result.code : "error"}${filterQuery}${pageQuery}`);
}

export async function desmatricularAlumnoFormAction(
  formData: FormData,
): Promise<void> {
  const asignaturaId = getStringField(formData, "asignaturaId");
  const page = parsePageField(getStringField(formData, "page"));
  const result = await desmatricularAlumnoAction({
    matriculaId: getStringField(formData, "matriculaId"),
  });

  revalidatePath("/admin/matriculas");
  const filterQuery = asignaturaId
    ? `&asignaturaId=${encodeURIComponent(asignaturaId)}`
    : "";
  const pageQuery = page ? `&page=${page}` : "";

  redirect(`/admin/matriculas?state=${result.ok ? result.code : "error"}${filterQuery}${pageQuery}`);
}
