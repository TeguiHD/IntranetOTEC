import { FileCheck } from "lucide-react";

import {
  listarSolicitudesDocumentosAlumno,
  obtenerPerfilAlumnoActual,
  solicitarDocumentoAlumnoFormAction,
} from "@/actions/solicitudes-documentos";
import { TarjetaBeneficio } from "@/components/beneficio/TarjetaBeneficio";
import { HistorialSolicitudes } from "@/components/solicitudes/HistorialSolicitudes";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { formatearRut } from "@/lib/rut";

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  request_created: { tone: "success", text: "Solicitud de certificado enviada. Revisión en 48 horas hábiles." },
  already_pending: { tone: "error", text: "Ya tienes un certificado de alumno regular pendiente." },
  invalid_input: { tone: "error", text: "Datos inválidos." },
  forbidden: { tone: "error", text: "No autorizado." },
  error: { tone: "error", text: "No fue posible registrar la solicitud." },
};

type Props = { searchParams?: Promise<{ state?: string }> };

export const metadata = { title: "Certificado de Alumno Regular" };

export default async function SolicitudAlumnoRegularPage({ searchParams }: Props) {
  const params = await (searchParams ?? Promise.resolve({} as { state?: string }));
  const [perfil, solicitudes] = await Promise.all([
    obtenerPerfilAlumnoActual(),
    listarSolicitudesDocumentosAlumno(),
  ]);

  const rutDisplay = perfil?.rut
    ? perfil.rut.startsWith("EXT-")
      ? `Ext: ${perfil.rut.replace(/^EXT-/, "")}`
      : formatearRut(perfil.rut)
    : undefined;

  return (
    <section className="space-y-5">
      <RouteStateToast state={params?.state} map={STATUS_MAP} />

      <header className="flex items-center gap-3">
        <span className="rounded-xl bg-blue-100 p-2 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          <FileCheck className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Certificado de Alumno Regular
          </h1>
          <p className="text-sm text-text-secondary dark:text-gray-400">
            Genera tu certificado oficial de alumno regular en forma independiente.
          </p>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          {perfil && (
            <TarjetaBeneficio
              rut={rutDisplay}
              nombre={perfil.nombre}
              apellido={perfil.apellido}
            />
          )}

          <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-base font-semibold text-text-primary dark:text-white">
              Nueva Solicitud
            </h2>
            <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
              El certificado acredita tu condición de alumno regular en la institución.
            </p>
            <form action={solicitarDocumentoAlumnoFormAction} className="mt-4 space-y-4">
              <input type="hidden" name="tipo" value="alumno_regular" />
              <div className="space-y-1.5">
                <label htmlFor="obs-regular" className="text-sm font-medium text-text-primary dark:text-gray-200">
                  Propósito del certificado <span className="text-text-muted dark:text-gray-500">(opcional)</span>
                </label>
                <textarea
                  id="obs-regular"
                  name="observacion"
                  rows={3}
                  maxLength={300}
                  placeholder="Ej: Trámite bancario, postulación laboral, etc."
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
              <button
                type="submit"
                className="h-11 w-full rounded-xl bg-gradient-to-r from-primary to-primary-dark text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:shadow-lg active:scale-[0.98]"
              >
                Solicitar Certificado
              </button>
            </form>
          </article>
        </div>

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
