"use server";

import { randomUUID } from "node:crypto";

import { and, count, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import {
  asignaturas,
  asistencia,
  clases,
  evaluaciones,
  material,
  matriculas,
  notas,
  observacionesDocente,
  usuarios,
} from "@/db/schema";
import { registrarAudit } from "@/lib/audit";
import { logEvent } from "@/lib/observability/logger";
import { formatearRut } from "@/lib/rut";
import { sanitizeText } from "@/lib/sanitize";
import { buildLikeTerm } from "@/lib/search";
import {
  alumnoInputSchema,
  buscarPersonaPorRutInputSchema,
  cambiarPasswordInputSchema,
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
  role: "docente" | "alumno",
  pagination: PaginationInput = {},
  options?: { incluirInactivos?: boolean },
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
      eliminadoAt: usuarios.eliminadoAt,
      createdAt: usuarios.createdAt,
    })
    .from(usuarios)
    .orderBy(desc(usuarios.createdAt))
    .limit(limit)
    .offset(offset);

  if (options?.incluirInactivos) {
    return baseQuery.where(eq(usuarios.rol, role));
  }

  return baseQuery.where(
    and(
      eq(usuarios.rol, role),
      eq(usuarios.activo, true),
      isNull(usuarios.eliminadoAt),
    ),
  );
}

export async function countUsuariosPorRol(
  role: "docente" | "alumno",
  options?: { incluirInactivos?: boolean },
): Promise<number> {
  const actorResult = await requireActionActor("admin_user_list", ["admin"]);

  if (!actorResult.ok) {
    return 0;
  }

  const db = getDb();

  const baseQuery = db.select({ total: count() }).from(usuarios);

  if (options?.incluirInactivos) {
    const result = await baseQuery.where(eq(usuarios.rol, role));
    return Number(result[0]?.total ?? 0);
  }

  const result = await baseQuery.where(
    and(eq(usuarios.rol, role), eq(usuarios.activo, true), isNull(usuarios.eliminadoAt)),
  );
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
  const term = buildLikeTerm(q);

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
          rut: rutFormateado,
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

      return {
        ok: true,
        code: isRestore ? "docente_updated" : "docente_created",
      };
    }

    const userId = randomUUID();

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

    return { ok: true, code: "docente_created" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";

    // Bug #1: handle unique constraint race condition
    if (message.includes("unique") || message.includes("duplicate")) {
      return {
        ok: false,
        code: "email_conflict",
        message: "El RUT o correo ya está registrado. Intenta nuevamente.",
      };
    }

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
    ? rutFormateado
    : credencialExtranjera
      ? `EXT-${credencialExtranjera}`
      : null;
  const email = parsed.data.email ?? null;
  const rutSalt = process.env.RUT_SALT;

  if (!rutSalt) {
    return {
      ok: false,
      code: "missing_rut_salt",
      message: "Configuración de seguridad incompleta: RUT_SALT.",
    };
  }

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
      const derivedPassword = `${rutSalt}${identificadorLogin}${existingByRut.id}`;
      const passwordHash = await bcrypt.hash(derivedPassword, 12);

      await db
        .update(usuarios)
        .set({
          nombre,
          apellido,
          rut: identificadorLogin,
          email,
          password: passwordHash,
          rol: "alumno",
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

      return { ok: true, code: "alumno_updated" };
    }

    const userId = randomUUID();
    const derivedPassword = `${rutSalt}${identificadorLogin}${userId}`;
    const passwordHash = await bcrypt.hash(derivedPassword, 12);

    await db.insert(usuarios).values({
      id: userId,
      nombre,
      apellido,
      rut: identificadorLogin,
      email,
      password: passwordHash,
      rol: "alumno",
      activo: true,
      createdAt: now,
      updatedAt: now,
    });

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

    return { ok: true, code: "alumno_created" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";

    // Bug #1: handle unique constraint race condition
    if (message.includes("unique") || message.includes("duplicate")) {
      return {
        ok: false,
        code: "email_conflict",
        message: "El RUT o correo ya está registrado. Intenta nuevamente.",
      };
    }

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
        eliminadoAt: new Date(),
        eliminadoPor: actorResult.actor.userId,
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

export async function crearDocenteFormAction(formData: FormData): Promise<void> {
  const result = await crearDocenteAction({
    nombre: getStringField(formData, "nombre"),
    apellido: getStringField(formData, "apellido"),
    rut: getStringField(formData, "rut"),
    email: getStringField(formData, "email"),
    password: getStringField(formData, "password"),
  });

  revalidatePath("/admin/docentes");
  redirect(`/admin/docentes?state=${result.code}`);
}

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
      message: "Datos inválidos. Verifica los campos e intenta nuevamente.",
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
      message: parsed.error.issues.map((i) => i.message).join(", "),
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

// ─── Admin alumno detail ──────────────────────────────────────────────────────

export type DetalleAlumnoMatricula = {
  matriculaId: string;
  asignaturaId: string;
  asignaturaNombre: string;
  estadoAsignatura: "borrador" | "activo" | "finalizado" | "archivado" | null;
  estadoPago: "pendiente" | "pagado" | "mora" | "becado" | null;
  activa: boolean | null;
  fechaMatricula: Date | null;
};

export type DetalleAlumnoNota = {
  notaId: string;
  matriculaId: string;
  asignaturaNombre: string;
  evaluacionTitulo: string;
  tipoEval: "formulario" | "tarea" | "examen" | "proyecto" | null;
  nota: string | null;
  observacion: string | null;
  fechaNota: Date | null;
};

export type DetalleAlumnoAsistencia = {
  asignaturaId: string;
  asignaturaNombre: string;
  presente: number;
  ausente: number;
  tardanza: number;
  justificado: number;
};

export type DetalleAlumnoObservacion = {
  observacionId: string;
  asignaturaNombre: string;
  docenteNombre: string;
  observacion: string;
  fechaRegistro: string;
};

export type DetalleAlumnoAdminResult =
  | { ok: false; code: string; message: string }
  | {
      ok: true;
      alumno: {
        id: string;
        nombre: string;
        apellido: string;
        rut: string | null;
        email: string | null;
        activo: boolean | null;
        fechaCreacion: Date | null;
      };
      matriculas: DetalleAlumnoMatricula[];
      notas: DetalleAlumnoNota[];
      asistencias: DetalleAlumnoAsistencia[];
      observaciones: DetalleAlumnoObservacion[];
    };

export async function obtenerDetalleAlumnoAdmin(
  alumnoId: string,
): Promise<DetalleAlumnoAdminResult> {
  const actorResult = await requireActionActor("admin_alumno_detail", ["admin"]);

  if (!actorResult.ok) {
    const res = actorResult.result;
    return {
      ok: false,
      code: res.code,
      message: res.ok ? "No autorizado para esta acción." : res.message,
    };
  }

  if (!alumnoId || typeof alumnoId !== "string") {
    return { ok: false, code: "invalid_input", message: "ID de alumno inválido." };
  }

  const db = getDb();

  // 1. Fetch the alumno
  const [alumno] = await db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      apellido: usuarios.apellido,
      rut: usuarios.rut,
      email: usuarios.email,
      activo: usuarios.activo,
      fechaCreacion: usuarios.createdAt,
    })
    .from(usuarios)
    .where(and(eq(usuarios.id, alumnoId), eq(usuarios.rol, "alumno")))
    .limit(1);

  if (!alumno) {
    return { ok: false, code: "not_found", message: "Alumno no encontrado." };
  }

  // 2. Fetch matriculas
  const alumnoMatriculas = await db
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
    .where(and(eq(matriculas.alumnoId, alumnoId), isNull(matriculas.eliminadoAt)))
    .orderBy(desc(matriculas.createdAt));

  // 3. Fetch notas (via evaluaciones)
  const alumnoNotas = await db
    .select({
      notaId: notas.id,
      matriculaId: notas.matriculaId,
      asignaturaNombre: asignaturas.nombre,
      evaluacionTitulo: evaluaciones.titulo,
      tipoEval: evaluaciones.tipo,
      nota: notas.nota,
      observacion: notas.observacion,
      fechaNota: notas.fechaNota,
    })
    .from(notas)
    .innerJoin(matriculas, eq(notas.matriculaId, matriculas.id))
    .innerJoin(evaluaciones, eq(notas.evaluacionId, evaluaciones.id))
    .innerJoin(asignaturas, eq(evaluaciones.asignaturaId, asignaturas.id))
    .where(
      and(
        eq(matriculas.alumnoId, alumnoId),
        isNull(notas.eliminadoAt),
      ),
    )
    .orderBy(desc(notas.fechaNota));

  // 4. Fetch asistencias aggregated per asignatura
  const rawAsistencias = await db
    .select({
      asignaturaId: asignaturas.id,
      asignaturaNombre: asignaturas.nombre,
      estado: asistencia.estado,
      cantidad: count(asistencia.id),
    })
    .from(asistencia)
    .innerJoin(matriculas, eq(asistencia.matriculaId, matriculas.id))
    .innerJoin(clases, eq(asistencia.claseId, clases.id))
    .innerJoin(asignaturas, eq(clases.asignaturaId, asignaturas.id))
    .where(eq(matriculas.alumnoId, alumnoId))
    .groupBy(asignaturas.id, asignaturas.nombre, asistencia.estado)
    .orderBy(asignaturas.nombre);

  // Aggregate into per-asignatura summary
  const asistenciasMap = new Map<
    string,
    DetalleAlumnoAsistencia
  >();
  for (const row of rawAsistencias) {
    const key = row.asignaturaId;
    if (!asistenciasMap.has(key)) {
      asistenciasMap.set(key, {
        asignaturaId: row.asignaturaId,
        asignaturaNombre: row.asignaturaNombre,
        presente: 0,
        ausente: 0,
        tardanza: 0,
        justificado: 0,
      });
    }
    const entry = asistenciasMap.get(key)!;
    const cant = Number(row.cantidad);
    if (row.estado === "presente") entry.presente = cant;
    else if (row.estado === "ausente") entry.ausente = cant;
    else if (row.estado === "tardanza") entry.tardanza = cant;
    else if (row.estado === "justificado") entry.justificado = cant;
  }

  // 5. Fetch observaciones
  const alumnoObservaciones = await db
    .select({
      observacionId: observacionesDocente.id,
      asignaturaNombre: asignaturas.nombre,
      docenteNombre: sql<string>`concat(${usuarios.nombre}, ' ', ${usuarios.apellido})`,
      observacion: observacionesDocente.observacion,
      fechaRegistro: observacionesDocente.fechaRegistro,
    })
    .from(observacionesDocente)
    .innerJoin(asignaturas, eq(observacionesDocente.asignaturaId, asignaturas.id))
    .innerJoin(usuarios, eq(observacionesDocente.docenteId, usuarios.id))
    .innerJoin(matriculas, eq(observacionesDocente.matriculaId, matriculas.id))
    .where(eq(matriculas.alumnoId, alumnoId))
    .orderBy(desc(observacionesDocente.createdAt));

  return {
    ok: true,
    alumno,
    matriculas: alumnoMatriculas,
    notas: alumnoNotas.map((n) => ({ ...n, nota: n.nota ?? null })),
    asistencias: Array.from(asistenciasMap.values()),
    observaciones: alumnoObservaciones,
  };
}

// ── Cambiar contraseña ───────────────────────────────────────────

export async function cambiarPasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("staff_password_change", [
    "admin",
    "docente",
  ]);

  if (!actorResult.ok) {
    return actorResult.result;
  }

  const parsed = cambiarPasswordInputSchema.safeParse(input);

  if (!parsed.success) {
    const firstMessage =
      parsed.error.issues[0]?.message ?? "Datos inválidos.";

    return {
      ok: false,
      code: "invalid_input",
      message: firstMessage,
    };
  }

  const db = getDb();

  try {
    const [user] = await db
      .select({
        id: usuarios.id,
        password: usuarios.password,
      })
      .from(usuarios)
      .where(eq(usuarios.id, actorResult.actor.userId))
      .limit(1);

    if (!user || !user.password) {
      return {
        ok: false,
        code: "user_not_found",
        message: "No se encontró el usuario.",
      };
    }

    const passwordMatch = await bcrypt.compare(
      parsed.data.currentPassword,
      user.password,
    );

    if (!passwordMatch) {
      return {
        ok: false,
        code: "wrong_password",
        message: "La contraseña actual es incorrecta.",
      };
    }

    const newHash = await bcrypt.hash(parsed.data.newPassword, 12);

    await db
      .update(usuarios)
      .set({
        password: newHash,
        updatedAt: new Date(),
      })
      .where(eq(usuarios.id, user.id));

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "cambiar_password",
      entidad: "usuarios",
      entidadId: user.id,
      payload: {},
      exitoso: true,
    });

    return {
      ok: true,
      code: "password_changed",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";

    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "staff_password_change_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: {
        reason: message,
      },
    });

    return {
      ok: false,
      code: "password_change_failed",
      message: "No fue posible cambiar la contraseña.",
    };
  }
}

export async function cambiarPasswordFormAction(
  formData: FormData,
): Promise<void> {
  const headerStore = await headers();
  const referer = headerStore.get("referer") ?? "/";

  const result = await cambiarPasswordAction({
    currentPassword: getStringField(formData, "currentPassword"),
    newPassword: getStringField(formData, "newPassword"),
    confirmPassword: getStringField(formData, "confirmPassword"),
  });

  redirect(`${referer.split("?")[0]}?state=${result.ok ? result.code : result.code}`);
}
