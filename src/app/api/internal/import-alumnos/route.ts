import { randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";
import { and, eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { auth } from "@/auth";
import { getDb } from "@/db";
import { usuarios } from "@/db/schema";
import { registrarAudit } from "@/lib/audit";
import { parseAppRole } from "@/lib/authz";
import { formatearRut, normalizarRut, validarRut } from "@/lib/rut";

const sanitizeName = (value: string): string =>
  value.replace(/[<>]/g, "").replace(/\s+/g, " ").trim();

export async function POST(request: Request) {
  // Auth check
  const session = await auth();
  const role = parseAppRole(session?.user?.rol);
  if (!role || role !== "admin") {
    return NextResponse.json(
      { message: "No autorizado." },
      { status: 403 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { message: "No se proporcionó un archivo válido." },
        { status: 400 },
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { message: "El archivo excede el tamaño máximo permitido (5MB)." },
        { status: 400 },
      );
    }

    // Read file
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      return NextResponse.json(
        { message: "El archivo no contiene hojas de datos." },
        { status: 400 },
      );
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
    });

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "El archivo está vacío." },
        { status: 400 },
      );
    }

    const db = getDb();
    const rutSalt = process.env.RUT_SALT;

    if (!rutSalt) {
      return NextResponse.json(
        { message: "Configuración interna incompleta (RUT_SALT)." },
        { status: 500 },
      );
    }

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const lineNum = i + 2; // 1-based + header row

      // Extract fields (case-insensitive)
      const rawRut = String(row.rut ?? row.RUT ?? row.Rut ?? "").trim();
      const rawNombre = String(row.nombre ?? row.Nombre ?? row.NOMBRE ?? "").trim();
      const rawApellido = String(row.apellido ?? row.Apellido ?? row.APELLIDO ?? "").trim();
      const rawEmail = String(row.email ?? row.Email ?? row.EMAIL ?? row.correo ?? row.Correo ?? "").trim().toLowerCase();

      // Validate required fields
      if (!rawRut) {
        errors.push(`Fila ${lineNum}: RUT vacío.`);
        continue;
      }

      const rutNormalizado = normalizarRut(rawRut);

      if (!rutNormalizado || !validarRut(rutNormalizado)) {
        errors.push(`Fila ${lineNum}: RUT inválido (${rawRut}).`);
        continue;
      }

      const nombre = sanitizeName(rawNombre);
      const apellido = sanitizeName(rawApellido);

      if (nombre.length < 2) {
        errors.push(`Fila ${lineNum}: Nombre muy corto o vacío.`);
        continue;
      }

      if (apellido.length < 2) {
        errors.push(`Fila ${lineNum}: Apellido muy corto o vacío.`);
        continue;
      }

      const rutFormateado = formatearRut(rutNormalizado);
      const email = rawEmail && rawEmail.includes("@") ? rawEmail : null;

      try {
        // Check if alumni exists by RUT
        const [existing] = await db
          .select({ id: usuarios.id })
          .from(usuarios)
          .where(
            and(
              eq(usuarios.rol, "alumno"),
              or(
                eq(usuarios.rut, rutNormalizado),
                eq(usuarios.rut, rutFormateado),
              ),
            ),
          )
          .limit(1);

        const now = new Date();

        if (existing) {
          // Update existing
          const updateFields: Record<string, unknown> = {
            nombre,
            apellido,
            activo: true,
            eliminadoAt: null,
            eliminadoPor: null,
            updatedAt: now,
          };

          if (email) {
            updateFields.email = email;
          }

          await db
            .update(usuarios)
            .set(updateFields)
            .where(eq(usuarios.id, existing.id));

          updated++;
        } else {
          // Create new
          const userId = randomUUID();
          const derivedPassword = `${rutSalt}${rutNormalizado}${userId}`;
          const passwordHash = await bcrypt.hash(derivedPassword, 12);

          await db.insert(usuarios).values({
            id: userId,
            nombre,
            apellido,
            rut: rutNormalizado,
            email,
            password: passwordHash,
            rol: "alumno",
            activo: true,
            createdAt: now,
            updatedAt: now,
          });

          created++;
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
      payload: {
        action: "importar_excel",
        fileName: file instanceof File ? file.name : "upload.csv",
        created,
        updated,
        erroresCount: errors.length,
        total: rows.length,
      },
      exitoso: true,
    });

    return NextResponse.json({
      created,
      updated,
      errors,
      total: rows.length,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "unknown";
    return NextResponse.json(
      { message: `Error al procesar archivo: ${msg}` },
      { status: 500 },
    );
  }
}
