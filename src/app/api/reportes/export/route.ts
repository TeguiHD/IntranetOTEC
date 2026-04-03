import { NextRequest, NextResponse } from "next/server";

import {
  reporteAsistencia,
  reporteDistribucionNotas,
  reporteRendimientoAcademico,
  reporteRetencion,
} from "@/actions/reportes";
import { auth } from "@/auth";
import { parseAppRole } from "@/lib/authz";
import { renderSimpleTablePdf } from "@/lib/export-pdf";
import { buildSpreadsheetBuffer, type SpreadsheetExportColumn } from "@/lib/spreadsheet";

type ExportTipo = "rendimiento" | "retencion" | "asistencia" | "notas";
type ExportFormato = "xlsx" | "pdf";

type ExportPayload = {
  title: string;
  subtitle?: string;
  columns: SpreadsheetExportColumn[];
  rows: Array<Record<string, unknown>>;
};

const validTipos = new Set<ExportTipo>(["rendimiento", "retencion", "asistencia", "notas"]);
const validFormatos = new Set<ExportFormato>(["xlsx", "pdf"]);

const sanitizeFileSegment = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const asPercent = (value: number | null): string => {
  if (value === null || Number.isNaN(value)) return "-";
  return `${value.toFixed(1)}%`;
};

const buildExportPayload = async (
  tipo: ExportTipo,
  periodoId: string | undefined,
  asignaturaId: string | undefined,
): Promise<ExportPayload> => {
  if (tipo === "rendimiento") {
    const data = await reporteRendimientoAcademico(periodoId);
    return {
      title: "Reporte de Rendimiento Academico",
      subtitle: periodoId ? "Filtrado por periodo academico" : "Todos los periodos",
      columns: [
        { key: "seccion", header: "Seccion", width: 28 },
        { key: "curso", header: "Curso", width: 24 },
        { key: "periodo", header: "Periodo", width: 20 },
        { key: "docente", header: "Docente", width: 24 },
        { key: "matriculas", header: "Matriculas", width: 12 },
        { key: "promedio", header: "Promedio", width: 12 },
      ],
      rows: data.map((item) => ({
        seccion: item.asignaturaNombre,
        curso: item.cursoNombre ?? "-",
        periodo: item.periodoNombre ?? "-",
        docente: item.docenteNombre ? `${item.docenteNombre} ${item.docenteApellido ?? ""}`.trim() : "-",
        matriculas: item.totalMatriculas,
        promedio: item.promedioGeneral != null ? Number(item.promedioGeneral).toFixed(1) : "-",
      })),
    };
  }

  if (tipo === "retencion") {
    const data = await reporteRetencion(periodoId);
    return {
      title: "Reporte de Retencion y Desercion",
      subtitle: periodoId ? "Filtrado por periodo academico" : "Todos los periodos",
      columns: [
        { key: "seccion", header: "Seccion", width: 28 },
        { key: "periodo", header: "Periodo", width: 20 },
        { key: "total", header: "Total", width: 10 },
        { key: "activos", header: "Activos", width: 10 },
        { key: "egresados", header: "Egresados", width: 12 },
        { key: "retirados", header: "Retirados", width: 12 },
        { key: "retencion", header: "Retencion %", width: 12 },
      ],
      rows: data.map((item) => {
        const ratio = item.total > 0 ? ((item.activos + item.egresados) / item.total) * 100 : null;
        return {
          seccion: item.asignaturaNombre,
          periodo: item.periodoNombre ?? "-",
          total: item.total,
          activos: item.activos,
          egresados: item.egresados,
          retirados: item.retirados,
          retencion: asPercent(ratio),
        };
      }),
    };
  }

  if (tipo === "asistencia") {
    const data = await reporteAsistencia(periodoId);
    return {
      title: "Reporte de Asistencia",
      subtitle: periodoId ? "Filtrado por periodo academico" : "Todos los periodos",
      columns: [
        { key: "seccion", header: "Seccion", width: 28 },
        { key: "periodo", header: "Periodo", width: 20 },
        { key: "clases", header: "Clases", width: 10 },
        { key: "presentes", header: "Presentes", width: 12 },
        { key: "ausentes", header: "Ausentes", width: 12 },
        { key: "tardanzas", header: "Tardanzas", width: 12 },
        { key: "asistencia", header: "Asistencia %", width: 12 },
      ],
      rows: data.map((item) => {
        const registros = item.totalAsistencias + item.totalAusencias + item.totalTardanzas;
        const ratio = registros > 0 ? (item.totalAsistencias / registros) * 100 : null;
        return {
          seccion: item.asignaturaNombre,
          periodo: item.periodoNombre ?? "-",
          clases: item.totalClases,
          presentes: item.totalAsistencias,
          ausentes: item.totalAusencias,
          tardanzas: item.totalTardanzas,
          asistencia: asPercent(ratio),
        };
      }),
    };
  }

  const notas = await reporteDistribucionNotas(asignaturaId, periodoId);
  const total = notas.reduce((acc, item) => acc + item.cantidad, 0);

  return {
    title: "Reporte de Distribucion de Notas",
    subtitle: "Rangos de notas",
    columns: [
      { key: "rango", header: "Rango", width: 14 },
      { key: "cantidad", header: "Cantidad", width: 12 },
      { key: "porcentaje", header: "Porcentaje", width: 14 },
    ],
    rows: notas.map((item) => ({
      rango: item.rango.trim(),
      cantidad: item.cantidad,
      porcentaje: total > 0 ? asPercent((item.cantidad / total) * 100) : "-",
    })),
  };
};

export async function GET(request: NextRequest) {
  const session = await auth();
  const role = parseAppRole(session?.user?.rol);

  if (role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const tipoRaw = request.nextUrl.searchParams.get("tipo") ?? "";
  const formatoRaw = request.nextUrl.searchParams.get("formato") ?? "";
  const periodoId = request.nextUrl.searchParams.get("periodoId") ?? undefined;
  const asignaturaId = request.nextUrl.searchParams.get("asignaturaId") ?? undefined;

  if (!validTipos.has(tipoRaw as ExportTipo)) {
    return NextResponse.json({ error: "tipo_invalido" }, { status: 400 });
  }

  if (!validFormatos.has(formatoRaw as ExportFormato)) {
    return NextResponse.json({ error: "formato_invalido" }, { status: 400 });
  }

  const tipo = tipoRaw as ExportTipo;
  const formato = formatoRaw as ExportFormato;
  const payload = await buildExportPayload(tipo, periodoId, asignaturaId);
  const safeTipo = sanitizeFileSegment(tipo);

  if (formato === "xlsx") {
    const workbook = await buildSpreadsheetBuffer(payload.title, payload.columns, payload.rows);
    return new NextResponse(new Uint8Array(workbook), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=\"reporte-${safeTipo}.xlsx\"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const pdf = await renderSimpleTablePdf({
    title: payload.title,
    subtitle: payload.subtitle,
    columns: payload.columns.map((column) => ({ key: column.key, label: column.header })),
    rows: payload.rows,
    generatedAt: new Date(),
  });

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=\"reporte-${safeTipo}.pdf\"`,
      "Cache-Control": "private, no-store",
    },
  });
}
