import Link from "next/link";

import { FileDown } from "lucide-react";

import type { listarSolicitudesDocumentosAlumno } from "@/actions/solicitudes-documentos";

type Solicitud = Awaited<ReturnType<typeof listarSolicitudesDocumentosAlumno>>[number];

const TIPO_LABELS: Record<string, string> = {
  credencial: "Credencial",
  alumno_regular: "Cert. Alumno Regular",
  tarjeta_beneficio: "Tarjeta de Beneficio",
};

const ESTADO_STYLES: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  aprobada: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  rechazada: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
};

const ESTADO_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
};

type Props = {
  solicitudes: Solicitud[];
  tipoFiltro?: "credencial" | "alumno_regular" | "tarjeta_beneficio";
};

export function HistorialSolicitudes({ solicitudes, tipoFiltro }: Props) {
  const filtradas = tipoFiltro
    ? solicitudes.filter((s) => s.tipo === tipoFiltro)
    : solicitudes;

  if (filtradas.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-text-secondary dark:text-gray-400">
        Aún no tienes solicitudes de este tipo.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {filtradas.map((s) => (
        <div
          key={s.id}
          className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/40"
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary dark:text-gray-100">
                {TIPO_LABELS[s.tipo] ?? s.tipo}
              </p>
              {s.observacion && (
                <p className="mt-0.5 text-xs text-text-secondary dark:text-gray-400">{s.observacion}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_STYLES[s.estado] ?? ""}`}>
                {ESTADO_LABELS[s.estado] ?? s.estado}
              </span>
              <span className="text-xs text-text-secondary dark:text-gray-400">
                {s.createdAt ? new Date(s.createdAt).toLocaleDateString("es-CL") : "-"}
              </span>
            </div>
          </div>

          {/* Enlace al certificado para alumno_regular aprobadas */}
          {s.tipo === "alumno_regular" && s.estado === "aprobada" && (
            <Link
              href={`/alumno/solicitudes/alumno-regular/certificado?solicitudId=${s.id}`}
              className="inline-flex items-center gap-1.5 self-start rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 dark:text-primary-light"
            >
              <FileDown className="h-3.5 w-3.5" />
              Ver / imprimir certificado
            </Link>
          )}

          {s.tipo === "credencial" && s.estado === "aprobada" && (
            <Link
              href="/alumno/solicitudes/credencial"
              className="inline-flex items-center gap-1.5 self-start rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 dark:text-primary-light"
            >
              <FileDown className="h-3.5 w-3.5" />
              Ver / imprimir credencial
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
