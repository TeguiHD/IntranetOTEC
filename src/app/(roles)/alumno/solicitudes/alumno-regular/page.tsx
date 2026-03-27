import { FileCheck } from "lucide-react";

import {
  listarSolicitudesDocumentosAlumno,
  solicitarDocumentoAlumnoAction,
} from "@/actions/solicitudes-documentos";
import { ConfirmacionSolicitudModal } from "@/components/solicitudes/ConfirmacionSolicitudModal";
import { HistorialSolicitudes } from "@/components/solicitudes/HistorialSolicitudes";

export const metadata = { title: "Certificado de Alumno Regular" };

export default async function SolicitudAlumnoRegularPage() {
  const solicitudes = await listarSolicitudesDocumentosAlumno();

  async function solicitarCertificado() {
    "use server";
    return solicitarDocumentoAlumnoAction({ tipo: "alumno_regular" });
  }

  return (
    <section className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-blue-100 p-2 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            <FileCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
              Certificado de Alumno Regular
            </h1>
            <p className="text-sm text-text-secondary dark:text-gray-400">
              Solicita tu certificado oficial de alumno regular.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-base font-semibold text-text-primary dark:text-white">
            Solicitar Certificado
          </h2>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            El certificado acredita tu condición de alumno regular en la institución.
            Una vez solicitado, será procesado y enviado en un plazo de 5 días hábiles.
          </p>
          <div className="mt-5">
            <ConfirmacionSolicitudModal
              action={solicitarCertificado}
              mensaje="Tu certificado será enviado durante 5 días hábiles."
            />
          </div>
        </article>

        <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-base font-semibold text-text-primary dark:text-white">
            Historial de Solicitudes
          </h2>
          <HistorialSolicitudes solicitudes={solicitudes} tipoFiltro="alumno_regular" />
        </article>
      </div>
    </section>
  );
}
