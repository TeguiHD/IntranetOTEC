"use server";

import { and, desc, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db";
import { anuncios, asignaturas, usuarios } from "@/db/schema";
import { requireActionCapability } from "./_security";

export type AnuncioItem = {
  id: string;
  titulo: string;
  contenido: string;
  fijado: boolean;
  autorNombre: string;
  createdAt: Date | null;
};

export async function listarAnunciosAsignatura(asignaturaId: string): Promise<AnuncioItem[]> {
  const actorResult = await requireActionCapability("anuncios_listar", "anuncios.read");
  if (!actorResult.ok || !asignaturaId) return [];

  const db = getDb();
  const rows = await db
    .select({
      id: anuncios.id,
      titulo: anuncios.titulo,
      contenido: anuncios.contenido,
      fijado: anuncios.fijado,
      autorNombre: usuarios.nombre,
      autorApellido: usuarios.apellido,
      createdAt: anuncios.createdAt,
    })
    .from(anuncios)
    .innerJoin(usuarios, eq(anuncios.autorId, usuarios.id))
    .where(and(eq(anuncios.asignaturaId, asignaturaId), isNull(anuncios.eliminadoAt)))
    .orderBy(desc(anuncios.fijado), desc(anuncios.createdAt))
    .limit(20);

  return rows.map((r) => ({
    id: r.id,
    titulo: r.titulo,
    contenido: r.contenido,
    fijado: r.fijado,
    autorNombre: `${r.autorNombre} ${r.autorApellido}`,
    createdAt: r.createdAt,
  }));
}

export async function publicarAnuncioFormAction(formData: FormData): Promise<void> {
  const actorResult = await requireActionCapability("anuncios_publicar", "anuncios.write");
  if (!actorResult.ok) {
    redirect("/?state=forbidden");
  }

  const asignaturaId = (formData.get("asignaturaId") as string | null)?.trim() ?? "";
  const titulo = (formData.get("titulo") as string | null)?.trim() ?? "";
  const contenido = (formData.get("contenido") as string | null)?.trim() ?? "";
  const fijado = formData.get("fijado") === "on";

  if (!asignaturaId || titulo.length < 3 || contenido.length < 3 || titulo.length > 200) {
    redirect(`/docente/asignaturas?asignaturaId=${asignaturaId}&state=anuncio_invalid`);
  }

  // Docente ownership check
  if (actorResult.actor.userRol === "docente") {
    const db = getDb();
    const [asig] = await db
      .select({ docenteId: asignaturas.docenteId })
      .from(asignaturas)
      .where(eq(asignaturas.id, asignaturaId))
      .limit(1);
    if (asig?.docenteId !== actorResult.actor.userId) {
      redirect(`/docente/asignaturas?state=forbidden`);
    }
  }

  const db = getDb();
  await db.insert(anuncios).values({
    asignaturaId,
    autorId: actorResult.actor.userId,
    titulo,
    contenido,
    fijado,
  });

  revalidatePath("/docente/asignaturas");
  revalidatePath("/alumno/asignaturas");
  redirect(`/docente/asignaturas?asignaturaId=${asignaturaId}&state=anuncio_publicado`);
}

export async function eliminarAnuncioFormAction(formData: FormData): Promise<void> {
  const actorResult = await requireActionCapability("anuncios_eliminar", "anuncios.write");
  if (!actorResult.ok) redirect("/?state=forbidden");

  const anuncioId = (formData.get("anuncioId") as string | null)?.trim() ?? "";
  const asignaturaId = (formData.get("asignaturaId") as string | null)?.trim() ?? "";
  if (!anuncioId) redirect(`/docente/asignaturas?state=error`);

  const db = getDb();
  const [anuncio] = await db
    .select({ autorId: anuncios.autorId })
    .from(anuncios)
    .where(eq(anuncios.id, anuncioId))
    .limit(1);

  if (!anuncio) redirect(`/docente/asignaturas?state=anuncio_not_found`);

  // Docentes can only delete their own announcements
  if (actorResult.actor.userRol === "docente" && anuncio.autorId !== actorResult.actor.userId) {
    redirect(`/docente/asignaturas?state=forbidden`);
  }

  await db
    .update(anuncios)
    .set({ eliminadoAt: new Date() })
    .where(eq(anuncios.id, anuncioId));

  revalidatePath("/docente/asignaturas");
  revalidatePath("/alumno/asignaturas");
  redirect(`/docente/asignaturas?asignaturaId=${asignaturaId}&state=anuncio_eliminado`);
}
