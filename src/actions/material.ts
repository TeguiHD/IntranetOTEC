"use server";

import { createHash } from "node:crypto";

import { and, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { asignaturas, clases, cursos, material, matriculas, usuarios } from "@/db/schema";
import { sendEmail, templateMaterialSubido } from "@/lib/email";
import { sanitizeText } from "@/lib/sanitize";
import { deleteFile, uploadFile } from "@/lib/storage";

import { type MutationResult, requireActionActor } from "./_security";

const BLOCKED_MIME_TYPES = new Set([
  "application/x-msdownload",
  "application/x-msdos-program",
  "application/x-dosexec",
  "application/x-executable",
  "application/x-elf",
  "application/x-mach-binary",
  "application/x-msi",
  "application/x-sh",
  "application/x-shellscript",
  "text/x-shellscript",
  "application/x-bat",
  "application/x-httpd-php",
  "text/x-php",
  "application/java-archive",
  "application/vnd.microsoft.portable-executable",
]);

const BLOCKED_MIME_KEYWORDS = [
  "javascript",
  "ecmascript",
  "powershell",
  "shellscript",
  "x-msdownload",
  "x-msdos-program",
  "x-dosexec",
  "x-executable",
  "x-elf",
  "x-mach-binary",
  "x-msi",
  "x-sh",
  "x-bat",
  "x-httpd-php",
];

const BLOCKED_EXTENSIONS = new Set([
  "exe",
  "msi",
  "msp",
  "bat",
  "cmd",
  "com",
  "scr",
  "pif",
  "ps1",
  "psm1",
  "sh",
  "bash",
  "zsh",
  "fish",
  "ksh",
  "csh",
  "js",
  "mjs",
  "cjs",
  "vbs",
  "vb",
  "jar",
  "war",
  "ear",
  "apk",
  "ipa",
  "appimage",
  "dmg",
  "pkg",
  "deb",
  "rpm",
  "dll",
  "so",
  "dylib",
  "elf",
  "php",
  "phar",
  "py",
  "pl",
  "rb",
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const DEFAULT_DOCENTE_MATERIAL_REDIRECT = "/docente/asignaturas";

const sanitizeDocenteMaterialRedirect = (value: string | null): string => {
  const trimmed = value?.trim() ?? "";
  if (!trimmed.startsWith("/")) return DEFAULT_DOCENTE_MATERIAL_REDIRECT;
  if (trimmed.startsWith("/docente/asignaturas") || trimmed.startsWith("/docente/materiales")) {
    return trimmed;
  }
  return DEFAULT_DOCENTE_MATERIAL_REDIRECT;
};

const getFileExtension = (fileName: string): string => {
  const normalized = fileName.trim().toLowerCase();
  const dotIndex = normalized.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === normalized.length - 1) {
    return "";
  }

  return normalized.slice(dotIndex + 1);
};

const isBlockedMaterialFile = (fileName: string, mimeType: string): boolean => {
  const ext = getFileExtension(fileName);
  if (ext && BLOCKED_EXTENSIONS.has(ext)) {
    return true;
  }

  const normalizedMime = mimeType.trim().toLowerCase();
  if (!normalizedMime) {
    return false;
  }

  if (BLOCKED_MIME_TYPES.has(normalizedMime)) {
    return true;
  }

  return BLOCKED_MIME_KEYWORDS.some((keyword) => normalizedMime.includes(keyword));
};

export type MaterialItem = {
  id: string;
  nombre: string;
  tamanioBytes: number | null;
  createdAt: Date | null;
  claseId: string;
  claseTitulo: string;
  claseNumeroSesion: number;
  habilitado: boolean;
};

export type MaterialAdminResumenItem = MaterialItem & {
  asignaturaId: string;
  asignaturaNombre: string;
  asignaturaCodigo: string | null;
  cursoNombre: string | null;
  cursoCodigo: string | null;
  docenteNombre: string | null;
  docenteApellido: string | null;
};

export async function listarMaterialPorAsignatura(
  asignaturaId: string,
): Promise<MaterialItem[]> {
  const actorResult = await requireActionActor("material_listar", [
    "docente",
    "alumno",
    "admin",
  ]);

  if (!actorResult.ok) return [];

  const db = getDb();

  const rows = await db
    .select({
      id: material.id,
      nombre: material.nombre,
      tamanioBytes: material.tamanioBytes,
      createdAt: material.createdAt,
      claseId: material.claseId,
      claseTitulo: clases.titulo,
      claseNumeroSesion: clases.numeroSesion,
      habilitado: material.habilitado,
    })
    .from(material)
    .innerJoin(clases, eq(material.claseId, clases.id))
    .where(
      and(
        eq(clases.asignaturaId, asignaturaId),
        isNull(material.eliminadoAt),
        actorResult.actor.userRol === "alumno" ? eq(material.habilitado, true) : undefined,
        isNull(clases.eliminadoAt),
      ),
    )
    .orderBy(clases.numeroSesion);

  return rows;
}

export async function listarMaterialAdminResumen(options?: {
  periodoId?: string;
  q?: string;
  limit?: number;
}): Promise<MaterialAdminResumenItem[]> {
  const actorResult = await requireActionActor("material_admin_resumen", ["admin"]);

  if (!actorResult.ok) return [];

  const db = getDb();
  const conditions: (SQL | undefined)[] = [
    isNull(material.eliminadoAt),
    isNull(clases.eliminadoAt),
    isNull(asignaturas.eliminadoAt),
    isNull(cursos.eliminadoAt),
  ];

  if (options?.periodoId) {
    conditions.push(eq(asignaturas.periodoId, options.periodoId));
  }

  const query = options?.q?.trim();
  if (query) {
    const term = `%${query.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
    conditions.push(
      or(
        ilike(material.nombre, term),
        ilike(clases.titulo, term),
        ilike(asignaturas.nombre, term),
        ilike(asignaturas.codigo, term),
        ilike(cursos.nombre, term),
        ilike(cursos.codigo, term),
        ilike(usuarios.nombre, term),
        ilike(usuarios.apellido, term),
      ),
    );
  }

  const limit = Number.isFinite(options?.limit)
    ? Math.max(1, Math.min(Math.trunc(options?.limit ?? 300), 500))
    : 300;

  return db
    .select({
      id: material.id,
      nombre: material.nombre,
      tamanioBytes: material.tamanioBytes,
      createdAt: material.createdAt,
      claseId: material.claseId,
      claseTitulo: clases.titulo,
      claseNumeroSesion: clases.numeroSesion,
      habilitado: material.habilitado,
      asignaturaId: asignaturas.id,
      asignaturaNombre: asignaturas.nombre,
      asignaturaCodigo: asignaturas.codigo,
      cursoNombre: cursos.nombre,
      cursoCodigo: cursos.codigo,
      docenteNombre: usuarios.nombre,
      docenteApellido: usuarios.apellido,
    })
    .from(material)
    .innerJoin(clases, eq(material.claseId, clases.id))
    .innerJoin(asignaturas, eq(clases.asignaturaId, asignaturas.id))
    .innerJoin(cursos, eq(asignaturas.cursoId, cursos.id))
    .leftJoin(usuarios, eq(asignaturas.docenteId, usuarios.id))
    .where(and(...conditions))
    .orderBy(desc(material.createdAt))
    .limit(limit);
}

export async function subirMaterialAction(
  formData: FormData,
): Promise<MutationResult> {
  const actorResult = await requireActionActor("material_subir", [
    "docente",
    "admin",
  ]);

  if (!actorResult.ok) return actorResult.result;

  const claseId = formData.get("claseId") as string | null;
  const asignaturaId = formData.get("asignaturaId") as string | null;
  const file = formData.get("archivo") as File | null;

  if (!claseId || !asignaturaId || !file || file.size === 0) {
    return { ok: false, code: "invalid_input", message: "Faltan campos requeridos." };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, code: "file_too_large", message: "El archivo excede 50 MB." };
  }

  if (isBlockedMaterialFile(file.name, file.type)) {
    return {
      ok: false,
      code: "invalid_type",
      message: "Archivo bloqueado por seguridad (ejecutable o script).",
    };
  }

  const db = getDb();

  // Verify the class belongs to an asignatura the docente teaches
  const [clase] = await db
    .select({
      id: clases.id,
      asigDocenteId: asignaturas.docenteId,
      asigNombre: asignaturas.nombre,
    })
    .from(clases)
    .innerJoin(asignaturas, eq(clases.asignaturaId, asignaturas.id))
    .where(
      and(
        eq(clases.id, claseId),
        eq(clases.asignaturaId, asignaturaId),
        isNull(clases.eliminadoAt),
      ),
    )
    .limit(1);

  if (!clase) {
    return { ok: false, code: "not_found", message: "Clase no encontrada." };
  }

  if (
    actorResult.actor.userRol === "docente" &&
    clase.asigDocenteId !== actorResult.actor.userId
  ) {
    return { ok: false, code: "forbidden", message: "No eres docente de esta asignatura." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const hashMd5 = createHash("md5").update(buffer).digest("hex");

  // Check deduplication by hash within the same class
  const [existing] = await db
    .select({ id: material.id })
    .from(material)
    .where(
      and(
        eq(material.claseId, claseId),
        eq(material.hashMd5, hashMd5),
        isNull(material.eliminadoAt),
      ),
    )
    .limit(1);

  if (existing) {
    return { ok: false, code: "duplicate", message: "Este archivo ya fue subido a esta clase." };
  }

  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
  const objectPath = `${actorResult.actor.userId}/${claseId}-${safeFileName}`;

  const storagePath = await uploadFile("material", objectPath, buffer, file.type);

  await db.insert(material).values({
    claseId,
    nombre: file.name,
    storagePath,
    hashMd5,
    tamanioBytes: buffer.length,
    subidoPor: actorResult.actor.userId,
  });

  revalidatePath("/docente/asignaturas");
  revalidatePath("/docente/materiales");
  revalidatePath("/alumno/asignaturas");
  revalidatePath("/alumno/materiales");
  revalidatePath("/admin/materiales");

  const enrolled = await db
    .select({
      nombre: usuarios.nombre,
      apellido: usuarios.apellido,
      email: usuarios.email,
    })
    .from(matriculas)
    .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
    .where(
      and(
        eq(matriculas.asignaturaId, asignaturaId),
        eq(matriculas.activa, true),
        isNull(matriculas.eliminadoAt),
        eq(usuarios.activo, true),
        isNull(usuarios.eliminadoAt),
      ),
    );

  for (const alumno of enrolled) {
    if (!alumno.email) {
      continue;
    }

    const { subject, html } = templateMaterialSubido({
      alumnoNombre: `${alumno.nombre} ${alumno.apellido}`.trim(),
      asignaturaNombre: clase.asigNombre,
      materialNombre: file.name,
    });

    sendEmail(alumno.email, subject, html).catch(() => {});
  }

  return { ok: true, code: "material_uploaded" };
}

export async function eliminarMaterialAction(
  formData: FormData,
): Promise<MutationResult> {
  const actorResult = await requireActionActor("material_eliminar", [
    "docente",
    "admin",
  ]);

  if (!actorResult.ok) return actorResult.result;

  const materialId = formData.get("materialId") as string | null;

  if (!materialId) {
    return { ok: false, code: "invalid_input", message: "Falta ID del material." };
  }

  const db = getDb();

  const [record] = await db
    .select({
      id: material.id,
      storagePath: material.storagePath,
      subidoPor: material.subidoPor,
      docenteId: asignaturas.docenteId,
    })
    .from(material)
    .innerJoin(clases, eq(material.claseId, clases.id))
    .innerJoin(asignaturas, eq(clases.asignaturaId, asignaturas.id))
    .where(and(eq(material.id, materialId), isNull(material.eliminadoAt)))
    .limit(1);

  if (!record) {
    return { ok: false, code: "not_found", message: "Material no encontrado." };
  }

  if (
    actorResult.actor.userRol === "docente" &&
    record.docenteId !== actorResult.actor.userId
  ) {
    return { ok: false, code: "forbidden", message: "No eres docente de esta asignatura." };
  }

  await db
    .update(material)
    .set({
      eliminadoAt: new Date(),
      eliminadoPor: actorResult.actor.userId,
    })
    .where(eq(material.id, materialId));

  // Delete physical file
  const [bucket, ...pathParts] = record.storagePath.split("/");
  if (bucket && pathParts.length > 0) {
    await deleteFile(bucket, pathParts.join("/")).catch(() => {});
  }

  revalidatePath("/docente/asignaturas");
  revalidatePath("/docente/materiales");
  revalidatePath("/alumno/asignaturas");
  revalidatePath("/alumno/materiales");
  revalidatePath("/admin/materiales");

  return { ok: true, code: "material_deleted" };
}

export async function editarMaterialAction(
  formData: FormData,
): Promise<MutationResult> {
  const actorResult = await requireActionActor("material_editar", [
    "docente",
    "admin",
  ]);

  if (!actorResult.ok) return actorResult.result;

  const materialId = formData.get("materialId") as string | null;
  const nombreRaw = formData.get("nombre") as string | null;
  const nombre = sanitizeText(nombreRaw ?? "").replace(/\s+/g, " ").trim().slice(0, 220);

  if (!materialId || nombre.length < 3) {
    return { ok: false, code: "invalid_input", message: "Falta el material o el titulo es muy corto." };
  }

  const db = getDb();

  const [record] = await db
    .select({
      id: material.id,
      docenteId: asignaturas.docenteId,
    })
    .from(material)
    .innerJoin(clases, eq(material.claseId, clases.id))
    .innerJoin(asignaturas, eq(clases.asignaturaId, asignaturas.id))
    .where(and(eq(material.id, materialId), isNull(material.eliminadoAt)))
    .limit(1);

  if (!record) {
    return { ok: false, code: "not_found", message: "Material no encontrado." };
  }

  if (
    actorResult.actor.userRol === "docente" &&
    record.docenteId !== actorResult.actor.userId
  ) {
    return { ok: false, code: "forbidden", message: "No eres docente de esta asignatura." };
  }

  await db
    .update(material)
    .set({ nombre })
    .where(eq(material.id, materialId));

  revalidatePath("/docente/asignaturas");
  revalidatePath("/docente/materiales");
  revalidatePath("/alumno/asignaturas");
  revalidatePath("/alumno/materiales");
  revalidatePath("/admin/materiales");

  return { ok: true, code: "material_updated" };
}

export async function cambiarEstadoMaterialAction(
  formData: FormData,
): Promise<MutationResult> {
  const actorResult = await requireActionActor("material_cambiar_estado", [
    "docente",
    "admin",
  ]);

  if (!actorResult.ok) return actorResult.result;

  const materialId = formData.get("materialId") as string | null;
  const habilitadoRaw = formData.get("habilitado") as string | null;
  const habilitado = habilitadoRaw === "true";

  if (!materialId || (habilitadoRaw !== "true" && habilitadoRaw !== "false")) {
    return { ok: false, code: "invalid_input", message: "Falta ID del material o estado." };
  }

  const db = getDb();

  const [record] = await db
    .select({
      id: material.id,
      docenteId: asignaturas.docenteId,
    })
    .from(material)
    .innerJoin(clases, eq(material.claseId, clases.id))
    .innerJoin(asignaturas, eq(clases.asignaturaId, asignaturas.id))
    .where(and(eq(material.id, materialId), isNull(material.eliminadoAt)))
    .limit(1);

  if (!record) {
    return { ok: false, code: "not_found", message: "Material no encontrado." };
  }

  if (
    actorResult.actor.userRol === "docente" &&
    record.docenteId !== actorResult.actor.userId
  ) {
    return { ok: false, code: "forbidden", message: "No eres docente de esta asignatura." };
  }

  await db
    .update(material)
    .set({ habilitado })
    .where(eq(material.id, materialId));

  revalidatePath("/docente/asignaturas");
  revalidatePath("/docente/materiales");
  revalidatePath("/alumno/asignaturas");
  revalidatePath("/alumno/materiales");
  revalidatePath("/admin/materiales");

  return {
    ok: true,
    code: habilitado ? "material_enabled" : "material_disabled",
  };
}

/**
 * Verifica si un alumno puede acceder a un material
 * (está matriculado en la asignatura que contiene esa clase)
 */
export async function alumnoTieneAccesoAMaterial(
  alumnoId: string,
  materialId: string,
): Promise<boolean> {
  const db = getDb();

  const [row] = await db
    .select({ id: sql<string>`1` })
    .from(material)
    .innerJoin(clases, eq(material.claseId, clases.id))
    .innerJoin(
      matriculas,
      and(
        eq(matriculas.asignaturaId, clases.asignaturaId),
        eq(matriculas.alumnoId, alumnoId),
        eq(matriculas.activa, true),
        isNull(matriculas.eliminadoAt),
      ),
    )
    .where(and(eq(material.id, materialId), eq(material.habilitado, true), isNull(material.eliminadoAt)))
    .limit(1);

  return Boolean(row);
}

export async function subirMaterialFormAction(formData: FormData): Promise<void> {
  const asignaturaId = formData.get("asignaturaId") as string | null;
  const redirectTo = sanitizeDocenteMaterialRedirect(formData.get("redirectTo") as string | null);
  const result = await subirMaterialAction(formData);
  const [pathname, search = ""] = redirectTo.split("?");
  const query = new URLSearchParams(search);
  query.set("state", result.code);
  if (asignaturaId) query.set("asignaturaId", asignaturaId);
  redirect(`${pathname}?${query.toString()}`);
}

export async function eliminarMaterialFormAction(formData: FormData): Promise<void> {
  const asignaturaId = formData.get("asignaturaId") as string | null;
  const redirectTo = sanitizeDocenteMaterialRedirect(formData.get("redirectTo") as string | null);
  const result = await eliminarMaterialAction(formData);
  const [pathname, search = ""] = redirectTo.split("?");
  const query = new URLSearchParams(search);
  query.set("state", result.code);
  if (asignaturaId) query.set("asignaturaId", asignaturaId);
  redirect(`${pathname}?${query.toString()}`);
}

export async function editarMaterialFormAction(formData: FormData): Promise<void> {
  const asignaturaId = formData.get("asignaturaId") as string | null;
  const redirectTo = sanitizeDocenteMaterialRedirect(formData.get("redirectTo") as string | null);
  const result = await editarMaterialAction(formData);
  const [pathname, search = ""] = redirectTo.split("?");
  const query = new URLSearchParams(search);
  query.set("state", result.code);
  if (asignaturaId) query.set("asignaturaId", asignaturaId);
  redirect(`${pathname}?${query.toString()}`);
}

export async function cambiarEstadoMaterialFormAction(formData: FormData): Promise<void> {
  const asignaturaId = formData.get("asignaturaId") as string | null;
  const redirectTo = sanitizeDocenteMaterialRedirect(formData.get("redirectTo") as string | null);
  const result = await cambiarEstadoMaterialAction(formData);
  const [pathname, search = ""] = redirectTo.split("?");
  const query = new URLSearchParams(search);
  query.set("state", result.code);
  if (asignaturaId) query.set("asignaturaId", asignaturaId);
  redirect(`${pathname}?${query.toString()}`);
}

export async function subirMaterialAdminFormAction(formData: FormData): Promise<void> {
  const periodoId = formData.get("periodoId") as string | null;
  const asignaturaId = formData.get("asignaturaId") as string | null;
  const result = await subirMaterialAction(formData);
  const query = new URLSearchParams({
    state: result.code,
  });

  if (periodoId) query.set("periodoId", periodoId);
  if (asignaturaId) query.set("asignaturaId", asignaturaId);

  redirect(`/admin/materiales?${query.toString()}`);
}

export async function eliminarMaterialAdminFormAction(formData: FormData): Promise<void> {
  const periodoId = formData.get("periodoId") as string | null;
  const asignaturaId = formData.get("asignaturaId") as string | null;
  const result = await eliminarMaterialAction(formData);
  const query = new URLSearchParams({
    state: result.code,
  });

  if (periodoId) query.set("periodoId", periodoId);
  if (asignaturaId) query.set("asignaturaId", asignaturaId);

  redirect(`/admin/materiales?${query.toString()}`);
}

export async function editarMaterialAdminFormAction(formData: FormData): Promise<void> {
  const periodoId = formData.get("periodoId") as string | null;
  const asignaturaId = formData.get("asignaturaId") as string | null;
  const result = await editarMaterialAction(formData);
  const query = new URLSearchParams({
    state: result.code,
  });

  if (periodoId) query.set("periodoId", periodoId);
  if (asignaturaId) query.set("asignaturaId", asignaturaId);

  redirect(`/admin/materiales?${query.toString()}`);
}

export async function cambiarEstadoMaterialAdminFormAction(formData: FormData): Promise<void> {
  const periodoId = formData.get("periodoId") as string | null;
  const asignaturaId = formData.get("asignaturaId") as string | null;
  const result = await cambiarEstadoMaterialAction(formData);
  const query = new URLSearchParams({
    state: result.code,
  });

  if (periodoId) query.set("periodoId", periodoId);
  if (asignaturaId) query.set("asignaturaId", asignaturaId);

  redirect(`/admin/materiales?${query.toString()}`);
}
