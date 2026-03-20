"use server";

import { createHash } from "node:crypto";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { asignaturas, clases, material, matriculas, usuarios } from "@/db/schema";
import { sendEmail, templateMaterialSubido } from "@/lib/email";
import { deleteFile, uploadFile } from "@/lib/storage";

import { type MutationResult, requireActionActor } from "./_security";

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "text/plain",
  "text/csv",
  "video/mp4",
  "video/webm",
  "application/zip",
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export type MaterialItem = {
  id: string;
  nombre: string;
  tamanioBytes: number | null;
  createdAt: Date | null;
  claseId: string;
  claseTitulo: string;
  claseNumeroSesion: number;
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
    })
    .from(material)
    .innerJoin(clases, eq(material.claseId, clases.id))
    .where(
      and(
        eq(clases.asignaturaId, asignaturaId),
        isNull(material.eliminadoAt),
        isNull(clases.eliminadoAt),
      ),
    )
    .orderBy(clases.numeroSesion);

  return rows;
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

  if (!ALLOWED_MIME.has(file.type)) {
    return { ok: false, code: "invalid_type", message: "Tipo de archivo no permitido." };
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
  revalidatePath("/alumno/asignaturas");

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
  revalidatePath("/alumno/asignaturas");

  return { ok: true, code: "material_deleted" };
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
    .where(and(eq(material.id, materialId), isNull(material.eliminadoAt)))
    .limit(1);

  return Boolean(row);
}

export async function subirMaterialFormAction(formData: FormData): Promise<void> {
  const asignaturaId = formData.get("asignaturaId") as string | null;
  const result = await subirMaterialAction(formData);
  redirect(`/docente/asignaturas?state=${result.code}&asignaturaId=${encodeURIComponent(asignaturaId ?? "")}`);
}

export async function eliminarMaterialFormAction(formData: FormData): Promise<void> {
  const result = await eliminarMaterialAction(formData);
  redirect(`/docente/asignaturas?state=${result.code}`);
}
