import { NextResponse } from "next/server";

import { obtenerEventosCalendarioAlumno, obtenerEventosCalendarioDocente } from "@/actions/calendario";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rol = searchParams.get("rol");
  const mes = Number(searchParams.get("mes"));
  const anio = Number(searchParams.get("anio"));

  if (!mes || !anio || mes < 1 || mes > 12 || anio < 2020) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const eventos =
    rol === "docente"
      ? await obtenerEventosCalendarioDocente(mes, anio)
      : await obtenerEventosCalendarioAlumno(mes, anio);

  return NextResponse.json(eventos);
}
