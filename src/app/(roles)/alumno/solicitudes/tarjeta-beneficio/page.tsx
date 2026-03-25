import { CreditCard } from "lucide-react";

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
  request_created: { tone: "success", text: "Solicitud de tarjeta de beneficio enviada. Revisión en 48 horas hábiles." },
  already_pending: { tone: "error", text: "Ya tienes una tarjeta de beneficio pendiente." },
  invalid_input: { tone: "error", text: "Datos inválidos." },
  forbidden: { tone: "error", text: "No autorizado." },
  error: { tone: "error", text: "No fue posible registrar la solicitud." },
};

type Props = { searchParams?: Promise<{ state?: string }> };

export const metadata = { title: "Tarjeta de Beneficio" };

export default async function SolicitudTarjetaBeneficioPage({ searchParams }: Props) {
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
        <span className="rounded-xl bg-[#F5A623]/15 p-2 text-[#F5A623]">
          <CreditCard className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Tarjeta de Beneficio
          </h1>
          <p className="text-sm text-text-secondary dark:text-gray-400">
            Solicita tu tarjeta del Club de Beneficios Impulsate.
          </p>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          {/* Vista previa de la tarjeta personalizada */}
          {perfil && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                Vista previa de tu tarjeta
              </p>
              <TarjetaBeneficio
                rut={rutDisplay}
                nombre={perfil.nombre}
                apellido={perfil.apellido}
              />
            </div>
          )}

          <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-base font-semibold text-text-primary dark:text-white">
              Solicitar Tarjeta
            </h2>
            <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
              La tarjeta te da acceso a descuentos y beneficios exclusivos del club Impulsate.
            </p>
            <form action={solicitarDocumentoAlumnoFormAction} className="mt-4 space-y-4">
              <input type="hidden" name="tipo" value="tarjeta_beneficio" />
              <div className="space-y-1.5">
                <label htmlFor="obs-beneficio" className="text-sm font-medium text-text-primary dark:text-gray-200">
                  Observación <span className="text-text-muted dark:text-gray-500">(opcional)</span>
                </label>
                <textarea
                  id="obs-beneficio"
                  name="observacion"
                  rows={3}
                  maxLength={300}
                  placeholder="Ej: Primera solicitud, nunca he tenido tarjeta."
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
              <button
                type="submit"
                className="h-11 w-full rounded-xl bg-gradient-to-r from-[#7B2FBE] to-[#5B1F8E] text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:shadow-purple-900/20 active:scale-[0.98]"
              >
                Solicitar Tarjeta de Beneficio
              </button>
            </form>
          </article>
        </div>

        <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-base font-semibold text-text-primary dark:text-white">
            Historial de Solicitudes
          </h2>
          <HistorialSolicitudes solicitudes={solicitudes} tipoFiltro="tarjeta_beneficio" />
        </article>
      </div>
    </section>
  );
}
