"use server";

import { randomUUID } from "node:crypto";

import { and, count, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { asignaturas, historialEstadoAlumno, material, matriculas, usuarios } from "@/db/schema";
import { registrarAudit } from "@/lib/audit";
import { sendEmail, templateBienvenida } from "@/lib/email";
import { logEvent } from "@/lib/observability/logger";
import { derivarPinPredeterminado, formatearRut } from "@/lib/rut";
import { sanitizeText } from "@/lib/sanitize";
import {
  alumnoInputSchema,
  buscarPersonaPorRutInputSchema,
  comboboxSearchQuerySchema,
  docenteInputSchema,
  desactivarUsuarioInputSchema,
  editarAlumnoInputSchema,
  editarDocenteInputSchema,
} from "@/lib/validations/admin";

import { resolvePagination, type PaginationInput } from "./_pagination";
import { requireActionActor, type MutationResult } from "./_security";

const sanitizeName = (value: string): string =>
  sanitizeText(value)
    .replace(/\s+/g, " ")
    .trim();

const escapeLike = (s: string) => s.replace(/%/g, "\\%").replace(/_/g, "\\_");

const normalizeDirectorySearchQuery = (query?: string): string | undefined => {
  if (typeof query !== "string") {
    return undefined;
  }

  const parsed = comboboxSearchQuerySchema.safeParse(query);
  return parsed.success ? parsed.data : undefined;
};

const buildUserDirectoryWhere = (
  role: "admin" | "docente" | "alumno",
  options?: { incluirInactivos?: boolean; query?: string },
) => {
  const conditions = [eq(usuarios.rol, role), isNull(usuarios.eliminadoAt)];
  const searchQuery = normalizeDirectorySearchQuery(options?.query);

  if (!options?.incluirInactivos) {
    conditions.push(eq(usuarios.activo, true));
  }

  if (searchQuery) {
    const term = `%${escapeLike(searchQuery)}%`;

    conditions.push(
      or(
        ilike(usuarios.nombre, term),
        ilike(usuarios.apellido, term),
        ilike(usuarios.rut, term),
        ilike(usuarios.email, term),
        ilike(sql<string>`concat_ws(' ', ${usuarios.nombre}, ${usuarios.apellido})`, term),
      )!,
    );
  }

  return and(...conditions);
};

const getStringField = (formData: FormData, field: string): string => {
  const rawValue = formData.get(field);
  return typeof rawValue === "string" ? rawValue : "";
};

const toCount = (value: unknown): number => {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

type PersonaBase = {
  id: string;
  nombre: string;
  apellido: string;
  email: string | null;
  rut: string | null;
  rol: "docente" | "alumno";
  activo: boolean | null;
};

type AlumnoHistorialRow = {
  matriculaId: string;
  asignaturaId: string;
  asignaturaNombre: string;
  estadoAsignatura: "borrador" | "activo" | "finalizado" | "archivado" | null;
  estadoPago: "pendiente" | "pagado" | "mora" | "becado" | null;
  activa: boolean | null;
  fechaMatricula: Date | null;
};

type DocenteAsignaturaRow = {
  asignaturaId: string;
  asignaturaNombre: string;
  estadoAsignatura: "borrador" | "activo" | "finalizado" | "archivado" | null;
  totalEstudiantes: number;
};

export type BuscarPersonaPorRutAdminResult =
  | {
      ok: false;
      code: string;
      message: string;
    }
  | {
      ok: true;
      role: "alumno";
      persona: PersonaBase;
      metrics: {
        asignaturasHistoricas: number;
        asignaturasActivas: number;
      };
      historial: AlumnoHistorialRow[];
    }
  | {
      ok: true;
      role: "docente";
      persona: PersonaBase;
      metrics: {
        cursosHistoricos: number;
        materialCargado: number;
      };
      asignaturas: DocenteAsignaturaRow[];
    };

export async function listarUsuariosPorRol(
  role: "admin" | "docente" | "alumno",
  pagination: PaginationInput = {},
  options?: { incluirInactivos?: boolean; query?: string },
) {
  const actorResult = await requireActionActor("admin_user_list", ["admin"]);

  if (!actorResult.ok) {
    return [];
  }

  const db = getDb();
  const { limit, offset } = resolvePagination(pagination);

  const baseQuery = db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      apellido: usuarios.apellido,
      email: usuarios.email,
      rut: usuarios.rut,
      activo: usuarios.activo,
      estadoAlumno: usuarios.estadoAlumno,
      eliminadoAt: usuarios.eliminadoAt,
      createdAt: usuarios.createdAt,
    })
    .from(usuarios)
    .orderBy(desc(usuarios.createdAt))
    .limit(limit)
    .offset(offset);

  return baseQuery.where(buildUserDirectoryWhere(role, options));
}

export async function countUsuariosPorRol(
  role: "admin" | "docente" | "alumno",
  options?: { incluirInactivos?: boolean; query?: string },
): Promise<number> {
  const actorResult = await requireActionActor("admin_user_list", ["admin"]);

  if (!actorResult.ok) {
    return 0;
  }

  const db = getDb();

  const result = await db
    .select({ total: count() })
    .from(usuarios)
    .where(buildUserDirectoryWhere(role, options));

  return Number(result[0]?.total ?? 0);
}

export type AlumnoBusqueda = {
  id: string;
  nombre: string;
  apellido: string;
  rut: string | null;
};

export async function buscarAlumnosAction(query: string): Promise<AlumnoBusqueda[]> {
  const actorResult = await requireActionActor("admin_alumno_search", ["admin"]);

  if (!actorResult.ok) {
    return [];
  }

  const parsed = comboboxSearchQuerySchema.safeParse(query);

  if (!parsed.success) {
    return [];
  }

  const q = parsed.data;

  const db = getDb();
  const term = `%${escapeLike(q)}%`;

  return db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      apellido: usuarios.apellido,
      rut: usuarios.rut,
    })
    .from(usuarios)
    .where(
      and(
        eq(usuarios.rol, "alumno"),
        eq(usuarios.activo, true),
        isNull(usuarios.eliminadoAt),
        or(
          ilike(usuarios.nombre, term),
          ilike(usuarios.apellido, term),
          ilike(usuarios.rut, term),
        ),
      ),
    )
    .orderBy(desc(usuarios.createdAt))
    .limit(15);
}

export async function buscarPersonaPorRutAdmin(input: {
  rut: string;
}): Promise<BuscarPersonaPorRutAdminResult> {
  const actorResult = await requireActionActor("admin_user_rut_lookup", ["admin"]);

  if (!actorResult.ok) {
    const deniedMessage = actorResult.result.ok
      ? "No autorizado para esta acción."
      : actorResult.result.message;

    return {
      ok: false,
      code: actorResult.result.code,
      message: deniedMessage,
    };
  }

  const parsed = buscarPersonaPorRutInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_rut",
      message: "El RUT ingresado no es válido.",
    };
  }

  const db = getDb();
  const rutNormalizado = parsed.data.rut;
  const rutFormateado = formatearRut(parsed.data.rut);

  const [persona] = await db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      apellido: usuarios.apellido,
      email: usuarios.email,
      rut: usuarios.rut,
      rol: usuarios.rol,
      activo: usuarios.activo,
    })
    .from(usuarios)
    .where(
      and(
        or(eq(usuarios.rut, rutNormalizado), eq(usuarios.rut, rutFormateado)),
        or(eq(usuarios.rol, "alumno"), eq(usuarios.rol, "docente")),
      ),
    )
    .limit(1);

  if (!persona) {
    return {
      ok: false,
      code: "not_found",
      message: "No existe una persona registrada con ese RUT.",
    };
  }

  if (persona.rol !== "alumno" && persona.rol !== "docente") {
    return {
      ok: false,
      code: "unsupported_role",
      message: "El RUT corresponde a un rol no soportado para esta búsqueda.",
    };
  }

  const personaBase: PersonaBase = {
    id: persona.id,
    nombre: persona.nombre,
    apellido: persona.apellido,
    email: persona.email,
    rut: persona.rut,
    rol: persona.rol,
    activo: persona.activo,
  };

  if (persona.rol === "alumno") {
    const historial = await db
      .select({
        matriculaId: matriculas.id,
        asignaturaId: asignaturas.id,
        asignaturaNombre: asignaturas.nombre,
        estadoAsignatura: asignaturas.estado,
        estadoPago: matriculas.estadoPago,
        activa: matriculas.activa,
        fechaMatricula: matriculas.createdAt,
      })
      .from(matriculas)
      .innerJoin(asignaturas, eq(matriculas.asignaturaId, asignaturas.id))
      .where(eq(matriculas.alumnoId, persona.id))
      .orderBy(desc(matriculas.createdAt));

    const asignaturasHistoricas = new Set(
      historial.map((row) => row.asignaturaId),
    ).size;
    const asignaturasActivas = historial.filter(
      (row) => row.activa && row.estadoAsignatura !== "archivado",
    ).length;

    return {
      ok: true,
      role: "alumno",
      persona: personaBase,
      metrics: {
        asignaturasHistoricas,
        asignaturasActivas,
      },
      historial,
    };
  }

  const [materialAggregated] = await db
    .select({
      totalMateriales: sql<number>`count(${material.id})`,
    })
    .from(material)
    .where(and(eq(material.subidoPor, persona.id), isNull(material.eliminadoAt)))
    .limit(1);

  const asignaturasDocente = await db
    .select({
      asignaturaId: asignaturas.id,
      asignaturaNombre: asignaturas.nombre,
      estadoAsignatura: asignaturas.estado,
      totalEstudiantes: sql<number>`coalesce(count(${matriculas.id}), 0)`,
    })
    .from(asignaturas)
    .leftJoin(
      matriculas,
      and(
        eq(matriculas.asignaturaId, asignaturas.id),
        eq(matriculas.activa, true),
        isNull(matriculas.eliminadoAt),
      ),
    )
    .where(eq(asignaturas.docenteId, persona.id))
    .groupBy(asignaturas.id, asignaturas.nombre, asignaturas.estado)
    .orderBy(desc(asignaturas.createdAt));

  const asignaturasConMetricas: DocenteAsignaturaRow[] = asignaturasDocente.map(
    (row) => ({
      asignaturaId: row.asignaturaId,
      asignaturaNombre: row.asignaturaNombre,
      estadoAsignatura: row.estadoAsignatura,
      totalEstudiantes: toCount(row.totalEstudiantes),
    }),
  );

  return {
    ok: true,
    role: "docente",
    persona: personaBase,
    metrics: {
      cursosHistoricos: asignaturasConMetricas.length,
      materialCargado: toCount(materialAggregated?.totalMateriales),
    },
    asignaturas: asignaturasConMetricas,
  };
}

export async function crearDocenteAction(input: {
  nombre: string;
  apellido: string;
  rut: string;
  email: string;
  password: string;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_docente_mutation", ["admin"]);

  if (!actorResult.ok) {
    return actorResult.result;
  }

  const parsed = docenteInputSchema.safeParse(input);

  if (!parsed.success) {
    const issuePaths = new Set(
      parsed.error.issues
        .map((issue) => issue.path[0])
        .filter((path): path is string => typeof path === "string"),
    );

    const code = issuePaths.has("rut")
      ? "invalid_rut"
      : issuePaths.has("email")
        ? "invalid_email"
        : issuePaths.has("password")
          ? "invalid_password_policy"
          : issuePaths.has("nombre") || issuePaths.has("apellido")
            ? "invalid_name"
            : "invalid_input";

    return {
      ok: false,
      code,
      message: "Datos inválidos para crear docente.",
    };
  }

  const db = getDb();
  const now = new Date();
  const nombre = sanitizeName(parsed.data.nombre);
  const apellido = sanitizeName(parsed.data.apellido);
  const rutNormalizado = parsed.data.rut;
  const rutFormateado = formatearRut(parsed.data.rut);
  const email = parsed.data.email;

  if (nombre.length < 2 || apellido.length < 2) {
    return {
      ok: false,
      code: "invalid_name",
      message: "Nombre y apellido deben tener al menos 2 caracteres.",
    };
  }

  try {
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const [existingByEmail] = await db
      .select({
        id: usuarios.id,
        rol: usuarios.rol,
        activo: usuarios.activo,
      })
      .from(usuarios)
      .where(eq(usuarios.email, email))
      .limit(1);

    const [existingDocenteByRut] = await db
      .select({
        id: usuarios.id,
        activo: usuarios.activo,
      })
      .from(usuarios)
      .where(
        and(
          eq(usuarios.rol, "docente"),
          or(eq(usuarios.rut, rutNormalizado), eq(usuarios.rut, rutFormateado)),
        ),
      )
      .limit(1);

    if (existingByEmail && existingByEmail.rol !== "docente") {
      return {
        ok: false,
        code: "email_conflict",
        message: "El correo ya está registrado por otro usuario.",
      };
    }

    if (
      existingByEmail &&
      existingDocenteByRut &&
      existingByEmail.id !== existingDocenteByRut.id
    ) {
      return {
        ok: false,
        code: "email_conflict",
        message: "Correo o RUT ya están asociados a otra cuenta.",
      };
    }

    const existing =
      existingByEmail && existingByEmail.rol === "docente"
        ? existingByEmail
        : existingDocenteByRut;
    const isRestore = Boolean(existing && !existing.activo);

    if (existing) {
      await db
        .update(usuarios)
        .set({
          nombre,
          apellido,
          rut: rutNormalizado,
          email,
          password: passwordHash,
          rol: "docente",
          activo: true,
          eliminadoAt: null,
          eliminadoPor: null,
          updatedAt: now,
        })
        .where(eq(usuarios.id, existing.id));

      await registrarAudit({
        correlationId: actorResult.actor.correlationId,
        userId: actorResult.actor.userId,
        userRol: actorResult.actor.userRol,
        accion: "editar",
        entidad: "usuarios",
        entidadId: existing.id,
        payload: {
          rol: "docente",
          restored: !existing.activo,
        },
        exitoso: true,
      });

      const { subject, html } = templateBienvenida({
        nombre: `${nombre} ${apellido}`.trim(),
        rol: "docente",
      });
      sendEmail(email, subject, html).catch((err) => {
        logEvent({
          correlationId: actorResult.actor.correlationId,
          action: "email_send_failed",
          result: "error",
          details: { reason: "smtp_error", message: err instanceof Error ? err.message : String(err) },
        });
      });

      return {
        ok: true,
        code: isRestore ? "docente_updated" : "docente_created",
      };
    }

    const userId = randomUUID();

    try {
      await db.insert(usuarios).values({
        id: userId,
        nombre,
        apellido,
        rut: rutFormateado,
        email,
        password: passwordHash,
        rol: "docente",
        activo: true,
        createdAt: now,
        updatedAt: now,
      });
    } catch (insertError: unknown) {
      const err = insertError as { code?: string };
      if (err.code === "23505" || String(err).includes("unique constraint")) {
        return {
          ok: false,
          code: "conflict_race_condition",
          message: "El usuario o correo fue registrado simultáneamente. Por favor, intenta de nuevo.",
        };
      }
      throw insertError;
    }

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "crear",
      entidad: "usuarios",
      entidadId: userId,
      payload: {
        rol: "docente",
      },
      exitoso: true,
    });

    const { subject, html } = templateBienvenida({
      nombre: `${nombre} ${apellido}`.trim(),
      rol: "docente",
    });
    sendEmail(email, subject, html).catch((err) => {
      logEvent({
        correlationId: actorResult.actor.correlationId,
        action: "email_send_failed",
        result: "error",
        details: { reason: "smtp_error", message: err instanceof Error ? err.message : String(err) },
      });
    });

    return { ok: true, code: "docente_created" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";

    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "admin_docente_mutation_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: {
        reason: message,
      },
    });

    return {
      ok: false,
      code: "docente_mutation_failed",
      message: "No fue posible crear el docente.",
    };
  }
}

export async function crearAlumnoAction(input: {
  nombre: string;
  apellido: string;
  credencialTipo: "rut" | "extranjera";
  rut?: string;
  credencialExtranjera?: string;
  email?: string;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_alumno_mutation", ["admin"]);

  if (!actorResult.ok) {
    return actorResult.result;
  }

  const parsed = alumnoInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_input",
      message: "Datos inválidos para crear alumno.",
    };
  }

  const db = getDb();
  const now = new Date();
  const nombre = sanitizeName(parsed.data.nombre);
  const apellido = sanitizeName(parsed.data.apellido);
  const isRutCredential = parsed.data.credencialTipo === "rut";
  const rutNormalizado =
    isRutCredential && parsed.data.rut ? parsed.data.rut.replace(/[^0-9kK]/g, "").toUpperCase() : null;
  const rutFormateado =
    isRutCredential && rutNormalizado ? formatearRut(rutNormalizado) : null;
  const credencialExtranjera =
    parsed.data.credencialTipo === "extranjera"
      ? (parsed.data.credencialExtranjera ?? "").trim().toUpperCase()
      : null;
  const identificadorLogin = isRutCredential
    ? rutNormalizado
    : credencialExtranjera
      ? `EXT-${credencialExtranjera}`
      : null;
  const email = parsed.data.email ?? null;

  if (nombre.length < 2 || apellido.length < 2) {
    return {
      ok: false,
      code: "invalid_name",
      message: "Nombre y apellido deben tener al menos 2 caracteres.",
    };
  }

  if (!identificadorLogin) {
    return {
      ok: false,
      code: "invalid_credential",
      message: "Debes indicar una credencial válida para el alumno.",
    };
  }

  try {
    const [existingByRut] = await db
      .select({
        id: usuarios.id,
      })
      .from(usuarios)
      .where(
        and(
          eq(usuarios.rol, "alumno"),
          isRutCredential && rutNormalizado && rutFormateado
            ? or(eq(usuarios.rut, rutNormalizado), eq(usuarios.rut, rutFormateado))
            : eq(usuarios.rut, identificadorLogin),
        ),
      )
      .limit(1);

    if (email) {
      const [emailConflict] = await db
        .select({ id: usuarios.id })
        .from(usuarios)
        .where(eq(usuarios.email, email))
        .limit(1);

      if (emailConflict && emailConflict.id !== existingByRut?.id) {
        return {
          ok: false,
          code: "email_conflict",
          message: "El correo ya está registrado por otro usuario.",
        };
      }
    }

    if (existingByRut) {
      const pin = derivarPinPredeterminado(identificadorLogin);
      const passwordHash = await bcrypt.hash(pin, 12);

      await db
        .update(usuarios)
        .set({
          nombre,
          apellido,
          rut: identificadorLogin,
          email,
          password: passwordHash,
          pinCambiado: false,
          rol: "alumno",
          estadoAlumno: "activo",
          activo: true,
          eliminadoAt: null,
          eliminadoPor: null,
          updatedAt: now,
        })
        .where(eq(usuarios.id, existingByRut.id));

      await registrarAudit({
        correlationId: actorResult.actor.correlationId,
        userId: actorResult.actor.userId,
        userRol: actorResult.actor.userRol,
        accion: "editar",
        entidad: "usuarios",
        entidadId: existingByRut.id,
        payload: {
          rol: "alumno",
          restored: true,
        },
        exitoso: true,
      });

      if (email) {
        const { subject, html } = templateBienvenida({
          nombre: `${nombre} ${apellido}`.trim(),
          rol: "alumno",
        });
        sendEmail(email, subject, html).catch((err) => {
          logEvent({
            correlationId: actorResult.actor.correlationId,
            action: "email_send_failed",
            result: "error",
            details: { reason: "smtp_error", message: err instanceof Error ? err.message : String(err) },
          });
        });
      }

      return { ok: true, code: "alumno_updated" };
    }

    const userId = randomUUID();
    const pin = derivarPinPredeterminado(identificadorLogin);
    const passwordHash = await bcrypt.hash(pin, 12);

    try {
      await db.insert(usuarios).values({
        id: userId,
        nombre,
        apellido,
        rut: identificadorLogin,
        email,
        password: passwordHash,
        pinCambiado: false,
        rol: "alumno",
        estadoAlumno: "activo",
        activo: true,
        createdAt: now,
        updatedAt: now,
      });
    } catch (insertError: unknown) {
      const err = insertError as { code?: string };
      if (err.code === "23505" || String(err).includes("unique constraint")) {
        return {
          ok: false,
          code: "conflict_race_condition",
          message: "El alumno o correo fue registrado simultáneamente. Por favor, intenta de nuevo.",
        };
      }
      throw insertError;
    }

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "crear",
      entidad: "usuarios",
      entidadId: userId,
      payload: {
        rol: "alumno",
      },
      exitoso: true,
    });

    if (email) {
      const { subject, html } = templateBienvenida({
        nombre: `${nombre} ${apellido}`.trim(),
        rol: "alumno",
      });
      sendEmail(email, subject, html).catch((err) => {
        logEvent({
          correlationId: actorResult.actor.correlationId,
          action: "email_send_failed",
          result: "error",
          details: { reason: "smtp_error", message: err instanceof Error ? err.message : String(err) },
        });
      });
    }

    return { ok: true, code: "alumno_created" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";

    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "admin_alumno_mutation_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: {
        reason: message,
      },
    });

    return {
      ok: false,
      code: "alumno_mutation_failed",
      message: "No fue posible crear el alumno.",
    };
  }
}

export async function desactivarUsuarioAction(input: {
  userId: string;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_user_deactivate", ["admin"]);

  if (!actorResult.ok) {
    return actorResult.result;
  }

  const parsed = desactivarUsuarioInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_input",
      message: "Usuario inválido.",
    };
  }

  if (parsed.data.userId === actorResult.actor.userId) {
    return {
      ok: false,
      code: "self_deactivate_denied",
      message: "No puedes desactivar tu propio usuario.",
    };
  }

  const db = getDb();

  try {
    const [target] = await db
      .select({
        id: usuarios.id,
        rol: usuarios.rol,
        activo: usuarios.activo,
      })
      .from(usuarios)
      .where(eq(usuarios.id, parsed.data.userId))
      .limit(1);

    if (!target) {
      return {
        ok: false,
        code: "user_not_found",
        message: "No se encontró el usuario.",
      };
    }

    if (!target.activo) {
      return {
        ok: true,
        code: "already_inactive",
      };
    }

    await db
      .update(usuarios)
      .set({
        activo: false,
        estadoAlumno: target.rol === "alumno" ? "retirado" : undefined,
        updatedAt: new Date(),
      })
      .where(eq(usuarios.id, target.id));

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "desactivar",
      entidad: "usuarios",
      entidadId: target.id,
      payload: {
        rolObjetivo: target.rol,
      },
      exitoso: true,
    });

    return {
      ok: true,
      code: "user_deactivated",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";

    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "admin_user_deactivate_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: {
        reason: message,
      },
    });

    return {
      ok: false,
      code: "deactivate_failed",
      message: "No fue posible desactivar el usuario.",
    };
  }
}

export async function activarUsuarioAction(input: {
  userId: string;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_user_activate", ["admin"]);

  if (!actorResult.ok) {
    return actorResult.result;
  }

  const parsed = desactivarUsuarioInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_input",
      message: "Usuario inválido.",
    };
  }

  const db = getDb();

  try {
    const [target] = await db
      .select({
        id: usuarios.id,
        rol: usuarios.rol,
        activo: usuarios.activo,
      })
      .from(usuarios)
      .where(eq(usuarios.id, parsed.data.userId))
      .limit(1);

    if (!target) {
      return {
        ok: false,
        code: "user_not_found",
        message: "No se encontró el usuario.",
      };
    }

    if (target.activo) {
      return {
        ok: true,
        code: "already_active",
      };
    }

    await db
      .update(usuarios)
      .set({
        activo: true,
        estadoAlumno: target.rol === "alumno" ? "activo" : undefined,
        eliminadoAt: null,
        eliminadoPor: null,
        updatedAt: new Date(),
      })
      .where(eq(usuarios.id, target.id));

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "editar",
      entidad: "usuarios",
      entidadId: target.id,
      payload: {
        rolObjetivo: target.rol,
        reactivado: true,
      },
      exitoso: true,
    });

    return {
      ok: true,
      code: "user_activated",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";

    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "admin_user_activate_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: {
        reason: message,
      },
    });

    return {
      ok: false,
      code: "activate_failed",
      message: "No fue posible activar el usuario.",
    };
  }
}

// removed: unused legacy FormAction
// crearDocenteFormAction was removed — use crearDocenteAction directly

export async function crearAlumnoFormAction(formData: FormData): Promise<void> {
  const result = await crearAlumnoAction({
    nombre: getStringField(formData, "nombre"),
    apellido: getStringField(formData, "apellido"),
    credencialTipo:
      getStringField(formData, "credencialTipo") === "extranjera"
        ? "extranjera"
        : "rut",
    rut: getStringField(formData, "rut"),
    credencialExtranjera: getStringField(formData, "credencialExtranjera"),
    email: getStringField(formData, "email"),
  });

  revalidatePath("/admin/alumnos");
  redirect(`/admin/alumnos?state=${result.ok ? result.code : "error"}`);
}

export async function desactivarDocenteFormAction(
  formData: FormData,
): Promise<void> {
  const result = await desactivarUsuarioAction({
    userId: getStringField(formData, "userId"),
  });

  revalidatePath("/admin/docentes");
  redirect(`/admin/docentes?state=${result.ok ? result.code : "error"}`);
}

export async function activarDocenteFormAction(
  formData: FormData,
): Promise<void> {
  const result = await activarUsuarioAction({
    userId: getStringField(formData, "userId"),
  });

  revalidatePath("/admin/docentes");
  redirect(`/admin/docentes?state=${result.ok ? result.code : "error"}`);
}

export async function desactivarAlumnoFormAction(
  formData: FormData,
): Promise<void> {
  const result = await desactivarUsuarioAction({
    userId: getStringField(formData, "userId"),
  });

  revalidatePath("/admin/alumnos");
  redirect(`/admin/alumnos?state=${result.code}`);
}

export async function activarAlumnoFormAction(
  formData: FormData,
): Promise<void> {
  const result = await activarUsuarioAction({
    userId: getStringField(formData, "userId"),
  });

  revalidatePath("/admin/alumnos");
  redirect(`/admin/alumnos?state=${result.ok ? result.code : "error"}`);
}

// ── Edit actions ──────────────────────────────────────────────────

export async function editarDocenteAction(input: {
  userId: string;
  nombre: string;
  apellido: string;
  email: string;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_edit_docente", ["admin"]);

  if (!actorResult.ok) return actorResult.result;

  const parsed = editarDocenteInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_input",
      message: "Datos inválidos. Verifica los campos e intenta de nuevo.",
    };
  }

  const db = getDb();

  try {
    const [target] = await db
      .select({ id: usuarios.id, rol: usuarios.rol })
      .from(usuarios)
      .where(and(eq(usuarios.id, parsed.data.userId), eq(usuarios.rol, "docente")))
      .limit(1);

    if (!target) {
      return { ok: false, code: "user_not_found", message: "Docente no encontrado." };
    }

    // Check email uniqueness (excluding self)
    const [emailConflict] = await db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(
        and(
          eq(usuarios.email, parsed.data.email),
          sql`${usuarios.id} != ${target.id}`,
        ),
      )
      .limit(1);

    if (emailConflict) {
      return { ok: false, code: "email_conflict", message: "El correo ya está en uso por otro usuario." };
    }

    await db
      .update(usuarios)
      .set({
        nombre: sanitizeName(parsed.data.nombre),
        apellido: sanitizeName(parsed.data.apellido),
        email: parsed.data.email,
        updatedAt: new Date(),
      })
      .where(eq(usuarios.id, target.id));

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "editar",
      entidad: "usuarios",
      entidadId: target.id,
      payload: { nombre: parsed.data.nombre, apellido: parsed.data.apellido, email: parsed.data.email },
      exitoso: true,
    });

    return { ok: true, code: "docente_updated" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";

    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "admin_edit_docente_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message },
    });

    return { ok: false, code: "edit_failed", message: "No fue posible actualizar el docente." };
  }
}

export async function editarAlumnoAction(input: {
  userId: string;
  nombre: string;
  apellido: string;
  email?: string;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_edit_alumno", ["admin"]);

  if (!actorResult.ok) return actorResult.result;

  const parsed = editarAlumnoInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_input",
      message: "Datos inválidos. Verifica los campos e intenta de nuevo.",
    };
  }

  const db = getDb();

  try {
    const [target] = await db
      .select({ id: usuarios.id, rol: usuarios.rol })
      .from(usuarios)
      .where(and(eq(usuarios.id, parsed.data.userId), eq(usuarios.rol, "alumno")))
      .limit(1);

    if (!target) {
      return { ok: false, code: "user_not_found", message: "Alumno no encontrado." };
    }

    // Check email uniqueness if provided (excluding self)
    if (parsed.data.email) {
      const [emailConflict] = await db
        .select({ id: usuarios.id })
        .from(usuarios)
        .where(
          and(
            eq(usuarios.email, parsed.data.email),
            sql`${usuarios.id} != ${target.id}`,
          ),
        )
        .limit(1);

      if (emailConflict) {
        return { ok: false, code: "email_conflict", message: "El correo ya está en uso por otro usuario." };
      }
    }

    await db
      .update(usuarios)
      .set({
        nombre: sanitizeName(parsed.data.nombre),
        apellido: sanitizeName(parsed.data.apellido),
        email: parsed.data.email ?? null,
        updatedAt: new Date(),
      })
      .where(eq(usuarios.id, target.id));

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "editar",
      entidad: "usuarios",
      entidadId: target.id,
      payload: { nombre: parsed.data.nombre, apellido: parsed.data.apellido },
      exitoso: true,
    });

    return { ok: true, code: "alumno_updated" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";

    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "admin_edit_alumno_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message },
    });

    return { ok: false, code: "edit_failed", message: "No fue posible actualizar el alumno." };
  }
}

export async function editarDocenteFormAction(formData: FormData): Promise<void> {
  const result = await editarDocenteAction({
    userId: getStringField(formData, "userId"),
    nombre: getStringField(formData, "nombre"),
    apellido: getStringField(formData, "apellido"),
    email: getStringField(formData, "email"),
  });

  revalidatePath("/admin/docentes");
  redirect(`/admin/docentes?state=${result.ok ? result.code : result.code}`);
}

export async function editarAlumnoFormAction(formData: FormData): Promise<void> {
  const result = await editarAlumnoAction({
    userId: getStringField(formData, "userId"),
    nombre: getStringField(formData, "nombre"),
    apellido: getStringField(formData, "apellido"),
    email: getStringField(formData, "email") || undefined,
  });

  revalidatePath("/admin/alumnos");
  redirect(`/admin/alumnos?state=${result.ok ? result.code : result.code}`);
}

export async function crearAdminAction(input: {
  nombre: string;
  apellido: string;
  rut: string;
  email: string;
  password: string;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_admin_mutation", ["admin"]);

  if (!actorResult.ok) {
    return actorResult.result;
  }

  const parsed = docenteInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_input",
      message: "Datos inválidos para crear administrador.",
    };
  }

  const db = getDb();
  const now = new Date();
  const nombre = sanitizeName(parsed.data.nombre);
  const apellido = sanitizeName(parsed.data.apellido);
  const rutNormalizado = parsed.data.rut;
  const rutFormateado = formatearRut(parsed.data.rut);
  const email = parsed.data.email;

  try {
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const [existingByEmail] = await db
      .select({ id: usuarios.id, rol: usuarios.rol, activo: usuarios.activo })
      .from(usuarios)
      .where(eq(usuarios.email, email))
      .limit(1);

    const [existingAdminByRut] = await db
      .select({ id: usuarios.id, activo: usuarios.activo })
      .from(usuarios)
      .where(
        and(
          eq(usuarios.rol, "admin"),
          or(eq(usuarios.rut, rutNormalizado), eq(usuarios.rut, rutFormateado)),
        ),
      )
      .limit(1);

    if (existingByEmail && existingByEmail.rol !== "admin") {
      return {
        ok: false,
        code: "email_conflict",
        message: "El correo ya está registrado por otro usuario.",
      };
    }

    if (
      existingByEmail &&
      existingAdminByRut &&
      existingByEmail.id !== existingAdminByRut.id
    ) {
      return {
        ok: false,
        code: "email_conflict",
        message: "Correo o RUT ya están asociados a otra cuenta.",
      };
    }

    const existing = existingByEmail?.rol === "admin" ? existingByEmail : existingAdminByRut;

    if (existing) {
      await db
        .update(usuarios)
        .set({
          nombre,
          apellido,
          rut: rutNormalizado,
          email,
          password: passwordHash,
          rol: "admin",
          activo: true,
          eliminadoAt: null,
          eliminadoPor: null,
          updatedAt: now,
        })
        .where(eq(usuarios.id, existing.id));

      return { ok: true, code: !existing.activo ? "admin_updated" : "admin_created" };
    }

    const userId = randomUUID();

    await db.insert(usuarios).values({
      id: userId,
      nombre,
      apellido,
      rut: rutNormalizado,
      email,
      password: passwordHash,
      rol: "admin",
      activo: true,
      createdAt: now,
      updatedAt: now,
    });

    return { ok: true, code: "admin_created" };
  } catch {
    return {
      ok: false,
      code: "admin_mutation_failed",
      message: "No fue posible crear el administrador.",
    };
  }
}

export async function editarAdministradorAction(input: {
  userId: string;
  nombre: string;
  apellido: string;
  email: string;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_user_edit", ["admin"]);

  if (!actorResult.ok) {
    return actorResult.result;
  }

  const parsed = editarDocenteInputSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, code: "invalid_input", message: "Datos inválidos para editar admin." };
  }

  const db = getDb();

  try {
    const [target] = await db
      .select({ id: usuarios.id, rol: usuarios.rol })
      .from(usuarios)
      .where(and(eq(usuarios.id, parsed.data.userId), eq(usuarios.rol, "admin")))
      .limit(1);

    if (!target) {
      return { ok: false, code: "not_found", message: "Administrador no encontrado." };
    }

    if (parsed.data.email) {
      const [emailConflict] = await db
        .select({ id: usuarios.id })
        .from(usuarios)
        .where(eq(usuarios.email, parsed.data.email))
        .limit(1);

      if (emailConflict && emailConflict.id !== target.id) {
        return { ok: false, code: "email_conflict", message: "El correo ya está en uso por otro usuario." };
      }
    }

    await db
      .update(usuarios)
      .set({
        nombre: sanitizeName(parsed.data.nombre),
        apellido: sanitizeName(parsed.data.apellido),
        email: parsed.data.email,
        updatedAt: new Date(),
      })
      .where(eq(usuarios.id, target.id));

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "editar",
      entidad: "usuarios",
      entidadId: target.id,
      payload: { nombre: parsed.data.nombre, apellido: parsed.data.apellido },
      exitoso: true,
    });

    return { ok: true, code: "admin_updated" };
  } catch {
    return { ok: false, code: "edit_failed", message: "No fue posible actualizar el administrador." };
  }
}

export async function crearAdministradorFormAction(formData: FormData): Promise<void> {
  const result = await crearAdminAction({
    nombre: getStringField(formData, "nombre"),
    apellido: getStringField(formData, "apellido"),
    rut: getStringField(formData, "rut"),
    email: getStringField(formData, "email"),
    password: getStringField(formData, "password"),
  });

  revalidatePath("/admin/administradores");
  redirect(`/admin/administradores?state=${result.ok ? result.code : result.code}`);
}

export async function editarAdministradorFormAction(formData: FormData): Promise<void> {
  const result = await editarAdministradorAction({
    userId: getStringField(formData, "userId"),
    nombre: getStringField(formData, "nombre"),
    apellido: getStringField(formData, "apellido"),
    email: getStringField(formData, "email"),
  });

  revalidatePath("/admin/administradores");
  redirect(`/admin/administradores?state=${result.ok ? result.code : result.code}`);
}

export async function desactivarAdministradorFormAction(formData: FormData): Promise<void> {
  const result = await desactivarUsuarioAction({
    userId: getStringField(formData, "userId"),
  });

  revalidatePath("/admin/administradores");
  redirect(`/admin/administradores?state=${result.ok ? result.code : result.code}`);
}

export async function activarAdministradorFormAction(formData: FormData): Promise<void> {
  const result = await activarUsuarioAction({
    userId: getStringField(formData, "userId"),
  });

  revalidatePath("/admin/administradores");
  redirect(`/admin/administradores?state=${result.ok ? result.code : result.code}`);
}

// ── Baja definitiva logica (sin hard-delete) ──────────────────────

export async function eliminarUsuarioPermanenteAction(input: {
  userId: string;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_user_deactivate", ["admin"]);

  if (!actorResult.ok) return actorResult.result;

  const parsed = desactivarUsuarioInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid_input", message: "Usuario inválido." };
  }

  if (parsed.data.userId === actorResult.actor.userId) {
    return { ok: false, code: "self_delete_denied", message: "No puedes eliminarte a ti mismo." };
  }

  const db = getDb();

  const [target] = await db
    .select({
      id: usuarios.id,
      rol: usuarios.rol,
      activo: usuarios.activo,
      eliminadoAt: usuarios.eliminadoAt,
    })
    .from(usuarios)
    .where(eq(usuarios.id, parsed.data.userId))
    .limit(1);

  if (!target) {
    return { ok: false, code: "user_not_found", message: "Usuario no encontrado." };
  }

  if (target.activo === false && target.eliminadoAt) {
    return {
      ok: true,
      code: "already_soft_deleted",
    };
  }

  try {
    const now = new Date();

    await db.transaction(async (tx) => {
      if (target.rol === "alumno") {
        await tx
          .update(matriculas)
          .set({
            activa: false,
            eliminadoAt: now,
            eliminadoPor: actorResult.actor.userId,
          })
          .where(and(eq(matriculas.alumnoId, target.id), eq(matriculas.activa, true), isNull(matriculas.eliminadoAt)));
      }

      await tx
        .update(usuarios)
        .set({
          activo: false,
          estadoAlumno: target.rol === "alumno" ? "retirado" : undefined,
          eliminadoAt: target.eliminadoAt ?? now,
          eliminadoPor: actorResult.actor.userId,
          updatedAt: now,
        })
        .where(eq(usuarios.id, target.id));
    });

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "desactivar",
      entidad: "usuarios",
      entidadId: target.id,
      payload: {
        rolObjetivo: target.rol,
        bajaDefinitivaLogica: true,
        hardDeleteDeshabilitado: true,
      },
      exitoso: true,
    });

    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "admin_user_soft_deleted_enforced",
      result: "success",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { targetId: target.id, targetRol: target.rol },
    });

    return { ok: true, code: "user_soft_deleted" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "admin_user_soft_delete_enforced_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message },
    });
    return {
      ok: false,
      code: "delete_failed",
      message: "No fue posible eliminar el usuario. Puede tener datos históricos asociados.",
    };
  }
}

export async function eliminarAlumnosMasivoAction(input: {
  userIds: string[];
}): Promise<MutationResult & { procesados?: number; omitidos?: number }> {
  const actorResult = await requireActionActor("admin_alumnos_bulk_delete", ["admin"]);

  if (!actorResult.ok) return actorResult.result;

  const userIds = Array.from(new Set(input.userIds.filter((id) => id && id !== actorResult.actor.userId)));
  if (userIds.length === 0) {
    return { ok: false, code: "invalid_input", message: "Debes seleccionar al menos un alumno." };
  }

  const db = getDb();

  const alumnosObjetivo = await db
    .select({
      id: usuarios.id,
      eliminadoAt: usuarios.eliminadoAt,
    })
    .from(usuarios)
    .where(and(inArray(usuarios.id, userIds), eq(usuarios.rol, "alumno")));

  if (alumnosObjetivo.length === 0) {
    return { ok: false, code: "invalid_input", message: "No se encontraron alumnos validos." };
  }

  const eligibleIds = alumnosObjetivo
    .filter((alumno) => !alumno.eliminadoAt)
    .map((alumno) => alumno.id);

  if (eligibleIds.length === 0) {
    return {
      ok: false,
      code: "alumnos_bulk_none",
      message: "No hay alumnos visibles disponibles para baja.",
      procesados: 0,
      omitidos: alumnosObjetivo.length,
    };
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(matriculas)
      .set({
        activa: false,
        eliminadoAt: now,
        eliminadoPor: actorResult.actor.userId,
      })
      .where(and(inArray(matriculas.alumnoId, eligibleIds), eq(matriculas.activa, true), isNull(matriculas.eliminadoAt)));

    await tx
      .update(usuarios)
      .set({
        activo: false,
        estadoAlumno: "retirado",
        eliminadoAt: now,
        eliminadoPor: actorResult.actor.userId,
        updatedAt: now,
      })
      .where(inArray(usuarios.id, eligibleIds));
  });

  await registrarAudit({
    correlationId: actorResult.actor.correlationId,
    userId: actorResult.actor.userId,
    userRol: actorResult.actor.userRol,
    accion: "desactivar",
    entidad: "usuarios",
    payload: {
      rolObjetivo: "alumno",
      bajaMasivaLogica: true,
      totalSolicitados: userIds.length,
      totalProcesados: eligibleIds.length,
      totalOmitidos: alumnosObjetivo.length - eligibleIds.length,
    },
    exitoso: true,
  });

  const omitidos = alumnosObjetivo.length - eligibleIds.length;
  return {
    ok: true,
    code: omitidos > 0 ? "alumnos_bulk_partial" : "alumnos_bulk_deleted",
    procesados: eligibleIds.length,
    omitidos,
  };
}

export async function desactivarAlumnosMasivoAction(input: {
  userIds: string[];
}): Promise<MutationResult & { procesados?: number; omitidos?: number }> {
  const actorResult = await requireActionActor("admin_alumnos_bulk_deactivate", ["admin"]);

  if (!actorResult.ok) return actorResult.result;

  const userIds = Array.from(new Set(input.userIds.filter((id) => id && id !== actorResult.actor.userId)));
  if (userIds.length === 0) {
    return { ok: false, code: "invalid_input", message: "Debes seleccionar al menos un alumno." };
  }

  const db = getDb();
  const alumnosObjetivo = await db
    .select({
      id: usuarios.id,
      activo: usuarios.activo,
      eliminadoAt: usuarios.eliminadoAt,
    })
    .from(usuarios)
    .where(and(inArray(usuarios.id, userIds), eq(usuarios.rol, "alumno")));

  const eligibleIds = alumnosObjetivo
    .filter((alumno) => alumno.activo && !alumno.eliminadoAt)
    .map((alumno) => alumno.id);

  if (eligibleIds.length === 0) {
    return {
      ok: false,
      code: "alumnos_deactivate_none",
      message: "No hay alumnos activos disponibles para desactivar.",
      procesados: 0,
      omitidos: alumnosObjetivo.length,
    };
  }

  const now = new Date();
  await db
    .update(usuarios)
    .set({
      activo: false,
      estadoAlumno: "retirado",
      updatedAt: now,
    })
    .where(inArray(usuarios.id, eligibleIds));

  await registrarAudit({
    correlationId: actorResult.actor.correlationId,
    userId: actorResult.actor.userId,
    userRol: actorResult.actor.userRol,
    accion: "desactivar",
    entidad: "usuarios",
    payload: {
      rolObjetivo: "alumno",
      desactivacionMasiva: true,
      totalSolicitados: userIds.length,
      totalProcesados: eligibleIds.length,
      totalOmitidos: alumnosObjetivo.length - eligibleIds.length,
    },
    exitoso: true,
  });

  const omitidos = alumnosObjetivo.length - eligibleIds.length;
  return {
    ok: true,
    code: omitidos > 0 ? "alumnos_deactivate_partial" : "alumnos_deactivated",
    procesados: eligibleIds.length,
    omitidos,
  };
}

export async function eliminarAlumnoPermanenteFormAction(formData: FormData): Promise<void> {
  const result = await eliminarUsuarioPermanenteAction({
    userId: getStringField(formData, "userId"),
  });
  revalidatePath("/admin/alumnos");
  redirect(`/admin/alumnos?state=${result.ok ? result.code : result.code}`);
}

export async function desactivarAlumnosMasivoFormAction(formData: FormData): Promise<void> {
  const result = await desactivarAlumnosMasivoAction({
    userIds: formData.getAll("userId").filter((value): value is string => typeof value === "string"),
  });
  revalidatePath("/admin/alumnos");
  redirect(`/admin/alumnos?state=${result.ok ? result.code : result.code}`);
}

export async function eliminarAlumnosMasivoFormAction(formData: FormData): Promise<void> {
  const result = await eliminarAlumnosMasivoAction({
    userIds: formData.getAll("userId").filter((value): value is string => typeof value === "string"),
  });
  revalidatePath("/admin/alumnos");
  redirect(`/admin/alumnos?state=${result.ok ? result.code : result.code}`);
}

export async function eliminarDocentePermanenteFormAction(formData: FormData): Promise<void> {
  const result = await eliminarUsuarioPermanenteAction({
    userId: getStringField(formData, "userId"),
  });
  revalidatePath("/admin/docentes");
  redirect(`/admin/docentes?state=${result.ok ? result.code : result.code}`);
}

export async function eliminarAdministradorPermanenteFormAction(formData: FormData): Promise<void> {
  const result = await eliminarUsuarioPermanenteAction({
    userId: getStringField(formData, "userId"),
  });
  revalidatePath("/admin/administradores");
  redirect(`/admin/administradores?state=${result.ok ? result.code : result.code}`);
}

const PIN_REGEX = /^\d{4}$/;

export async function cambiarPinAlumnoAction(input: {
  pinActual: string;
  pinNuevo: string;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("alumno_cambiar_pin", ["alumno"]);

  if (!actorResult.ok) {
    return actorResult.result;
  }

  const { pinActual, pinNuevo } = input;

  if (!PIN_REGEX.test(pinActual) || !PIN_REGEX.test(pinNuevo)) {
    return {
      ok: false,
      code: "invalid_pin",
      message: "La clave debe ser de exactamente 4 dígitos numéricos.",
    };
  }

  const db = getDb();

  const [user] = await db
    .select({ id: usuarios.id, password: usuarios.password })
    .from(usuarios)
    .where(eq(usuarios.id, actorResult.actor.userId))
    .limit(1);

  if (!user || !user.password) {
    return { ok: false, code: "not_found", message: "Usuario no encontrado." };
  }

  const pinOk = await bcrypt.compare(pinActual, user.password);

  if (!pinOk) {
    return { ok: false, code: "pin_mismatch", message: "La clave actual es incorrecta." };
  }

  const newHash = await bcrypt.hash(pinNuevo, 12);

  await db
    .update(usuarios)
    .set({
      password: newHash,
      pinCambiado: true,
      updatedAt: new Date(),
    })
    .where(eq(usuarios.id, actorResult.actor.userId));

  await registrarAudit({
    correlationId: actorResult.actor.correlationId,
    userId: actorResult.actor.userId,
    userRol: actorResult.actor.userRol,
    accion: "cambiar_password",
    entidad: "usuarios",
    entidadId: actorResult.actor.userId,
    payload: { metodo: "pin_alumno" },
    exitoso: true,
  });

  return { ok: true, code: "pin_changed" };
}

// ──────────────────────────────────────────────────────────────────────────────
// ADMIN: Restablecer contraseña / PIN de un usuario
// ──────────────────────────────────────────────────────────────────────────────

export async function resetearPasswordAdminAction(input: {
  userId: string;
  rol: "alumno" | "docente" | "admin";
}): Promise<MutationResult & { nuevaPassword?: string }> {
  const actorResult = await requireActionActor("admin_reset_password", ["admin"]);
  if (!actorResult.ok) return actorResult.result;

  if (!input.userId) {
    return { ok: false, code: "invalid_input", message: "ID de usuario requerido." };
  }

  const db = getDb();

  const [user] = await db
    .select({ id: usuarios.id, rut: usuarios.rut, rol: usuarios.rol, nombre: usuarios.nombre, activo: usuarios.activo })
    .from(usuarios)
    .where(and(eq(usuarios.id, input.userId), isNull(usuarios.eliminadoAt)))
    .limit(1);

  if (!user) {
    return { ok: false, code: "not_found", message: "Usuario no encontrado." };
  }

  let nuevaPassword: string;

  if (user.rol === "alumno") {
    // Restore default PIN derived from RUT
    nuevaPassword = user.rut ? derivarPinPredeterminado(user.rut) : "0000";
  } else {
    // Generate a random 10-character temporary password for docente/admin
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!";
    nuevaPassword = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }

  const hash = await bcrypt.hash(nuevaPassword, 12);

  await db
    .update(usuarios)
    .set({
      password: hash,
      pinCambiado: false,
      updatedAt: new Date(),
    })
    .where(eq(usuarios.id, input.userId));

  await registrarAudit({
    correlationId: actorResult.actor.correlationId,
    userId: actorResult.actor.userId,
    userRol: actorResult.actor.userRol,
    accion: "cambiar_password",
    entidad: "usuarios",
    entidadId: input.userId,
    payload: { metodo: "admin_reset", targetRol: user.rol },
    exitoso: true,
  });

  logEvent({
    correlationId: actorResult.actor.correlationId,
    action: "admin_password_reset",
    result: "success",
    userId: actorResult.actor.userId,
    role: actorResult.actor.userRol,
    details: { targetUserId: input.userId, targetRol: user.rol },
  });

  return { ok: true, code: "password_reset", nuevaPassword };
}

export async function establecerPasswordDocenteAction(input: {
  userId: string;
  nuevaPassword: string;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_establecer_password_docente", ["admin"]);
  if (!actorResult.ok) return actorResult.result;

  const { userId, nuevaPassword } = input;

  if (!userId) {
    return { ok: false, code: "invalid_input", message: "ID de usuario requerido." };
  }

  // Política intermedia: mínimo 8 caracteres, letras y números
  if (!nuevaPassword || nuevaPassword.length < 8) {
    return { ok: false, code: "invalid_password_policy", message: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (!/[a-zA-Z]/.test(nuevaPassword) || !/[0-9]/.test(nuevaPassword)) {
    return { ok: false, code: "invalid_password_policy", message: "La contraseña debe contener letras y números." };
  }

  const db = getDb();

  const [user] = await db
    .select({ id: usuarios.id, rol: usuarios.rol, activo: usuarios.activo })
    .from(usuarios)
    .where(and(eq(usuarios.id, userId), eq(usuarios.rol, "docente"), isNull(usuarios.eliminadoAt)))
    .limit(1);

  if (!user) {
    return { ok: false, code: "not_found", message: "Docente no encontrado." };
  }

  const hash = await bcrypt.hash(nuevaPassword, 12);

  await db
    .update(usuarios)
    .set({
      password: hash,
      pinCambiado: true,
      updatedAt: new Date(),
    })
    .where(eq(usuarios.id, userId));

  await registrarAudit({
    correlationId: actorResult.actor.correlationId,
    userId: actorResult.actor.userId,
    userRol: actorResult.actor.userRol,
    accion: "cambiar_password",
    entidad: "usuarios",
    entidadId: userId,
    payload: { metodo: "admin_set_custom", targetRol: "docente" },
    exitoso: true,
  });

  logEvent({
    correlationId: actorResult.actor.correlationId,
    action: "admin_set_docente_password",
    result: "success",
    userId: actorResult.actor.userId,
    role: actorResult.actor.userRol,
    details: { targetUserId: userId },
  });

  return { ok: true, code: "password_set" };
}

// ---------- Estado del alumno ----------

const estadosAlumnoValidos = ["activo", "egresado", "retirado", "suspendido", "desertor"] as const;
type EstadoAlumno = (typeof estadosAlumnoValidos)[number];

export async function cambiarEstadoAlumno(
  alumnoId: string,
  nuevoEstado: EstadoAlumno,
  motivo?: string,
): Promise<MutationResult> {
  const actorResult = await requireActionActor("cambiar_estado_alumno", ["admin"]);
  if (!actorResult.ok) return actorResult.result;

  if (!estadosAlumnoValidos.includes(nuevoEstado)) {
    return { ok: false, code: "invalid_state", message: "Estado no válido." };
  }

  const db = getDb();

  const [alumno] = await db
    .select({ id: usuarios.id, estadoAlumno: usuarios.estadoAlumno, rol: usuarios.rol })
    .from(usuarios)
    .where(and(eq(usuarios.id, alumnoId), eq(usuarios.rol, "alumno"), isNull(usuarios.eliminadoAt)))
    .limit(1);

  if (!alumno) {
    return { ok: false, code: "not_found", message: "Alumno no encontrado." };
  }

  if (alumno.estadoAlumno === nuevoEstado) {
    return { ok: false, code: "no_change", message: "El alumno ya tiene ese estado." };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(usuarios)
      .set({ estadoAlumno: nuevoEstado, updatedAt: new Date() })
      .where(eq(usuarios.id, alumnoId));

    await tx.insert(historialEstadoAlumno).values({
      alumnoId,
      estadoAnterior: alumno.estadoAlumno ?? null,
      estadoNuevo: nuevoEstado,
      motivo: motivo ? sanitizeText(motivo) : null,
      cambiadoPor: actorResult.actor.userId,
    });
  });

  await registrarAudit({
    correlationId: actorResult.actor.correlationId,
    userId: actorResult.actor.userId,
    userRol: actorResult.actor.userRol,
    accion: "editar",
    entidad: "usuarios",
    entidadId: alumnoId,
    payload: { campo: "estado_alumno", anterior: alumno.estadoAlumno, nuevo: nuevoEstado },
    exitoso: true,
  });

  revalidatePath("/admin/alumnos");
  return { ok: true, code: "estado_actualizado" };
}

export async function obtenerHistorialEstadoAlumno(alumnoId: string) {
  const actorResult = await requireActionActor("obtener_historial_estado_alumno", ["admin"]);
  if (!actorResult.ok) return [];

  const db = getDb();

  return db
    .select({
      id: historialEstadoAlumno.id,
      estadoAnterior: historialEstadoAlumno.estadoAnterior,
      estadoNuevo: historialEstadoAlumno.estadoNuevo,
      motivo: historialEstadoAlumno.motivo,
      createdAt: historialEstadoAlumno.createdAt,
      cambiadoPorNombre: usuarios.nombre,
      cambiadoPorApellido: usuarios.apellido,
    })
    .from(historialEstadoAlumno)
    .innerJoin(usuarios, eq(historialEstadoAlumno.cambiadoPor, usuarios.id))
    .where(eq(historialEstadoAlumno.alumnoId, alumnoId))
    .orderBy(desc(historialEstadoAlumno.createdAt));
}
