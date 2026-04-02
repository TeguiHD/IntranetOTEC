import { randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";
import { and, eq, ilike, or } from "drizzle-orm";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getDb } from "@/db";
import { asignaturas, matriculas, usuarios } from "@/db/schema";
import { registrarAudit } from "@/lib/audit";
import { parseAppRole } from "@/lib/authz";
import { formatearRut, normalizarRut, validarRut } from "@/lib/rut";
import { parseSpreadsheetRowsFromBuffer } from "@/lib/spreadsheet";

const sanitizeName = (value: string): string =>
  value.replace(/[<>]/g, "").replace(/\s+/g, " ").trim();

const splitNombreCompleto = (raw: string): { nombre: string; apellido: string } => {
  const parts = raw.trim().split(/\s+/);
  if (parts.length === 1) return { nombre: parts[0] ?? "", apellido: "-" };
  const apellido = parts[parts.length - 1] ?? "-";
  const nombre = parts.slice(0, -1).join(" ");
  return { nombre, apellido };
};

export async function POST(request: Request) {
  const session = await auth();
  const role = parseAppRole(session?.user?.rol);
  if (!role || role !== "admin") {
    return NextResponse.json({ message: "No autorizado." }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ message: "No se proporcionó un archivo válido." }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ message: "El archivo excede el tamaño máximo permitido (5MB)." }, { status: 400 });
    }

    const fileName = file.name.trim();
    if (!/\.(csv|xlsx)$/i.test(fileName)) {
      return NextResponse.json({ message: "Solo se permiten archivos .csv o .xlsx." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = await parseSpreadsheetRowsFromBuffer(buffer, fileName);

    if (rows.length === 0) {
      return NextResponse.json({ message: "El archivo está vacío." }, { status: 400 });
    }

    const db = getDb();
    const rutSalt = process.env.RUT_SALT;
    if (!rutSalt) {
      return NextResponse.json({ message: "Configuración interna incompleta (RUT_SALT)." }, { status: 500 });
    }

    const adminId = session?.user?.id ?? null;
    const today = new Date().toISOString().split("T")[0]!;

    const cursoMap = new Map<string, string>();

    for (const row of rows) {
      const rawCurso = String(row["Curso"] ?? row["curso"] ?? row["CURSO"] ?? "").trim();
      if (!rawCurso || cursoMap.has(rawCurso)) continue;

      const rawDiasHora = String(
        row["Dias/Hora"] ?? row["dias/hora"] ?? row["DIAS/HORA"] ?? row["Dias Hora"] ?? row["DiasHora"] ?? ""
      ).trim();

      const [existing] = await db
        .select({ id: asignaturas.id })
        .from(asignaturas)
        .where(ilike(asignaturas.nombre, rawCurso))
        .limit(1);

      if (existing) {
        cursoMap.set(rawCurso, existing.id);
      } else {
        const asignaturaId = randomUUID();
        await db.insert(asignaturas).values({
          id: asignaturaId,
          nombre: rawCurso,
          descripcion: rawDiasHora || null,
          fechaInicio: today,
          duracionMeses: 6,
          estado: "borrador",
          docenteId: null,
          createdBy: adminId,
        });
        cursoMap.set(rawCurso, asignaturaId);
      }
    }

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const lineNum = i + 2;

      const rawRut = String(row["Rut"] ?? row["RUT"] ?? row["rut"] ?? "").trim();
      const rawNombreCompleto = String(row["Nombre"] ?? row["NOMBRE"] ?? row["nombre"] ?? "").trim();
      const rawCurso = String(row["Curso"] ?? row["curso"] ?? row["CURSO"] ?? "").trim();

      if (!rawRut) { errors.push(`Fila ${lineNum}: RUT vacío.`); continue; }

      const rutNormalizado = normalizarRut(rawRut);
      if (!rutNormalizado || !validarRut(rutNormalizado)) {
        errors.push(`Fila ${lineNum}: RUT inválido (${rawRut}).`); continue;
      }

      if (!rawNombreCompleto) { errors.push(`Fila ${lineNum}: Nombre vacío.`); continue; }

      const { nombre: rawNombre, apellido: rawApellido } = splitNombreCompleto(rawNombreCompleto);
      const nombre = sanitizeName(rawNombre);
      const apellido = sanitizeName(rawApellido);

      if (nombre.length < 2) { errors.push(`Fila ${lineNum}: Nombre muy corto.`); continue; }

      const rutFormateado = formatearRut(rutNormalizado);
      const asignaturaId = rawCurso ? cursoMap.get(rawCurso) ?? null : null;

      try {
        const [existing] = await db
          .select({ id: usuarios.id })
          .from(usuarios)
          .where(and(eq(usuarios.rol, "alumno"), or(eq(usuarios.rut, rutNormalizado), eq(usuarios.rut, rutFormateado))))
          .limit(1);

        const now = new Date();
        let alumnoId: string;

        if (existing) {
          alumnoId = existing.id;
          await db.update(usuarios).set({ nombre, apellido, activo: true, eliminadoAt: null, eliminadoPor: null, updatedAt: now }).where(eq(usuarios.id, existing.id));
          updated++;
        } else {
          alumnoId = randomUUID();
          const derivedPassword = `${rutSalt}${rutNormalizado}${alumnoId}`;
          const passwordHash = await bcrypt.hash(derivedPassword, 12);
          await db.insert(usuarios).values({ id: alumnoId, nombre, apellido, rut: rutNormalizado, email: null, password: passwordHash, rol: "alumno", activo: true, createdAt: now, updatedAt: now });
          created++;
        }

        if (asignaturaId) {
          await db.insert(matriculas).values({ id: randomUUID(), alumnoId, asignaturaId, activa: true, createdAt: now }).onConflictDoNothing();
        }
      } catch (rowError) {
        const msg = rowError instanceof Error ? rowError.message : "unknown";
        if (msg.includes("duplicate key") || msg.includes("unique")) {
          errors.push(`Fila ${lineNum}: Conflicto de datos (${rutFormateado}).`);
        } else {
          errors.push(`Fila ${lineNum}: Error inesperado.`);
        }
      }
    }

    const correlationId = request.headers.get("x-correlation-id") ?? randomUUID();
    await registrarAudit({
      correlationId,
      userId: session?.user?.id ?? "unknown",
      userRol: "admin",
      accion: "crear",
      entidad: "usuarios",
      payload: { action: "importar_excel", fileName: file instanceof File ? file.name : "upload.csv", created, updated, cursosCreados: cursoMap.size, erroresCount: errors.length, total: rows.length },
      exitoso: true,
    });

    return NextResponse.json({ created, updated, errors, total: rows.length });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "unknown";
    return NextResponse.json({ message: `Error al procesar archivo: ${msg}` }, { status: 500 });
  }
}
