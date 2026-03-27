import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { getDb } from "@/db";
import { pushSubscriptions } from "@/db/schema";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id || session.user.rol !== "alumno") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { endpoint: string; keys: { p256dh: string; auth: string } };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const db = getDb();

  // Upsert: si el endpoint ya existe para este alumno, actualizar; si no, insertar
  await db
    .insert(pushSubscriptions)
    .values({
      alumnoId: session.user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        alumnoId: session.user.id,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
      },
    });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { endpoint: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const db = getDb();

  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, body.endpoint));

  return NextResponse.json({ ok: true });
}
