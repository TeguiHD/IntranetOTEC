import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getDb } from "@/db";
import { periodosAcademicos } from "@/db/schema";
import { resolveAcademicPeriodForDate } from "@/lib/academicPeriods";
import { parseAppRole } from "@/lib/authz";

const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const PERIOD_CODE_REGEX = /^[A-Z0-9][A-Z0-9._-]{1,29}$/;

const normalizeDate = (value: unknown): string => String(value ?? "").trim();

const isValidIsoDate = (value: string): boolean => {
  if (!ISO_DATE_REGEX.test(value)) {
    return false;
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number.parseInt(yearText ?? "", 10);
  const month = Number.parseInt(monthText ?? "", 10);
  const day = Number.parseInt(dayText ?? "", 10);
  const candidate = new Date(Date.UTC(year, month - 1, day));

  return (
    candidate.getUTCFullYear() === year
    && candidate.getUTCMonth() === month - 1
    && candidate.getUTCDate() === day
  );
};

const toEstadoPeriodo = (value: unknown): "planificado" | "activo" | "cerrado" =>
  value === "planificado" || value === "cerrado" ? value : "activo";

const isAdminRequest = async () => {
  const session = await auth();
  const role = parseAppRole(session?.user?.rol);
  return role === "admin";
};

const loadPeriods = async () => {
  const db = getDb();

  return db
    .select({
      id: periodosAcademicos.id,
      codigo: periodosAcademicos.codigo,
      nombre: periodosAcademicos.nombre,
      estado: periodosAcademicos.estado,
      fechaInicio: periodosAcademicos.fechaInicio,
      fechaFin: periodosAcademicos.fechaFin,
    })
    .from(periodosAcademicos)
    .orderBy(desc(periodosAcademicos.fechaInicio), desc(periodosAcademicos.createdAt));
};

export async function GET() {
  const isAdmin = await isAdminRequest();

  if (!isAdmin) {
    return NextResponse.json({ message: "No autorizado." }, { status: 403 });
  }

  try {
    const db = getDb();

    let periods = await loadPeriods();

    if (periods.length === 0) {
      await resolveAcademicPeriodForDate(db, toIsoDate(new Date()));
      periods = await loadPeriods();
    }

    return NextResponse.json({ periods });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    return NextResponse.json({ message: `No se pudieron cargar los periodos: ${message}` }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const isAdmin = await isAdminRequest();

  if (!isAdmin) {
    return NextResponse.json({ message: "No autorizado." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      codigo?: unknown;
      nombre?: unknown;
      fechaInicio?: unknown;
      fechaFin?: unknown;
      estado?: unknown;
    };

    const codigo = String(body.codigo ?? "").trim().toUpperCase();
    const nombre = String(body.nombre ?? "").replace(/\s+/g, " ").trim();
    const fechaInicio = normalizeDate(body.fechaInicio);
    const fechaFin = normalizeDate(body.fechaFin);
    const estado = toEstadoPeriodo(body.estado);

    if (!PERIOD_CODE_REGEX.test(codigo)) {
      return NextResponse.json(
        { message: "Codigo invalido. Usa 2-30 caracteres: letras, numeros, punto, guion o guion bajo." },
        { status: 400 },
      );
    }

    if (nombre.length < 3) {
      return NextResponse.json(
        { message: "Nombre de periodo invalido. Debe tener al menos 3 caracteres." },
        { status: 400 },
      );
    }

    if (!isValidIsoDate(fechaInicio) || !isValidIsoDate(fechaFin)) {
      return NextResponse.json(
        { message: "Las fechas deben tener formato YYYY-MM-DD valido." },
        { status: 400 },
      );
    }

    if (fechaInicio > fechaFin) {
      return NextResponse.json(
        { message: "La fecha de inicio no puede ser mayor que la fecha de fin." },
        { status: 400 },
      );
    }

    const db = getDb();

    const [existing] = await db
      .select({ id: periodosAcademicos.id })
      .from(periodosAcademicos)
      .where(eq(periodosAcademicos.codigo, codigo))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { message: `Ya existe un periodo con codigo ${codigo}.` },
        { status: 409 },
      );
    }

    const [period] = await db
      .insert(periodosAcademicos)
      .values({
        codigo,
        nombre,
        fechaInicio,
        fechaFin,
        estado,
      })
      .returning({
        id: periodosAcademicos.id,
        codigo: periodosAcademicos.codigo,
        nombre: periodosAcademicos.nombre,
        estado: periodosAcademicos.estado,
        fechaInicio: periodosAcademicos.fechaInicio,
        fechaFin: periodosAcademicos.fechaFin,
      });

    if (!period) {
      return NextResponse.json(
        { message: "No se pudo crear el periodo academico." },
        { status: 500 },
      );
    }

    return NextResponse.json({ period }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";

    if (message.includes("duplicate key")) {
      return NextResponse.json(
        { message: "Ya existe un periodo academico con ese codigo." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { message: `No se pudo crear el periodo academico: ${message}` },
      { status: 500 },
    );
  }
}
