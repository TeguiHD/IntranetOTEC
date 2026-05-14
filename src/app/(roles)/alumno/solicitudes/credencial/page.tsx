import { IdCard } from "lucide-react";

import { obtenerAccesoDocumentosAlumnoActual } from "@/actions/accesos-documentos";
import {
  listarSolicitudesDocumentosAlumno,
  obtenerPerfilAlumnoActual,
  solicitarDocumentoAlumnoFormAction,
} from "@/actions/solicitudes-documentos";
import { CredencialAlumno } from "@/components/solicitudes/CredencialAlumno";
import { HistorialSolicitudes } from "@/components/solicitudes/HistorialSolicitudes";
import { RouteStateToast } from "@/components/shared/RouteStateToast";

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  request_created: { tone: "success", text: "Solicitud de credencial enviada. Revision en 48 horas habiles." },
  request_auto_approved: { tone: "success", text: "Credencial aprobada correctamente." },
  already_pending: { tone: "error", text: "Ya tienes una solicitud de credencial pendiente." },
  invalid_input: { tone: "error", text: "Datos invalidos." },
  access_disabled: { tone: "error", text: "La credencial no esta habilitada para tu usuario o curso." },
  forbidden: { tone: "error", text: "No autorizado." },
  error: { tone: "error", text: "No fue posible registrar la solicitud." },
};

type Props = { searchParams?: Promise<{ state?: string }> };

export const metadata = { title: "Credencial de Capacitacion" };

export default async function SolicitudCredencialPage({ searchParams }: Props) {
  const params = await (searchParams ?? Promise.resolve({} as { state?: string }));
  const [solicitudes, accesos, perfil] = await Promise.all([
    listarSolicitudesDocumentosAlumno(),
    obtenerAccesoDocumentosAlumnoActual(),
    obtenerPerfilAlumnoActual(),
  ]);
  const credencialHabilitada = accesos?.credencialHabilitada ?? true;
  const credencialAprobada = solicitudes.find(
    (solicitud) => solicitud.tipo === "credencial" && solicitud.estado === "aprobada",
  );
  const credencialPendiente = solicitudes.some(
    (solicitud) => solicitud.tipo === "credencial" && solicitud.estado === "pendiente",
  );

  return (
    <section className="space-y-5">
      <RouteStateToast state={params?.state} map={STATUS_MAP} />

      <header className="flex items-center gap-3">
        <span className="rounded-xl bg-primary/10 p-2 text-primary">
          <IdCard className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            CREDENCIAL DE CAPACITACION
          </h1>
          <p className="text-sm text-text-secondary dark:text-gray-400">
            Solicita y visualiza tu credencial de identificacion institucional.
          </p>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          {credencialAprobada && perfil ? (
            <article
              id="credencial-aprobada"
              className="scroll-mt-24 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="mb-4">
                <h2 className="text-base font-semibold text-text-primary dark:text-white">
                  Credencial de Capacitacion Aprobada
                </h2>
                <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
                  Tu credencial ya esta disponible para visualizarla en pantalla.
                </p>
              </div>
              <CredencialAlumno
                nombre={perfil.nombre}
                apellido={perfil.apellido}
                rut={perfil.rut}
                solicitudId={credencialAprobada.id}
                aprobadaAt={credencialAprobada.resueltoAt ?? credencialAprobada.createdAt}
              />
            </article>
          ) : null}

          <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-base font-semibold text-text-primary dark:text-white">
              Nueva Solicitud
            </h2>
            {credencialAprobada ? (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-900/20 dark:text-emerald-200">
                Ya tienes una credencial aprobada. Si necesitas una actualizacion, contacta a administracion.
              </div>
            ) : credencialPendiente ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/70 dark:bg-amber-900/20 dark:text-amber-200">
                Tienes una solicitud pendiente. Cuando administracion la apruebe, la credencial aparecera en esta misma pantalla.
              </div>
            ) : credencialHabilitada ? (
              <>
                <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
                  Solo puedes tener una solicitud pendiente por tipo. El administrador la revisara en 48 horas habiles.
                </p>
                <form action={solicitarDocumentoAlumnoFormAction} className="mt-4 space-y-4">
                  <input type="hidden" name="tipo" value="credencial" />
                  <div className="space-y-1.5">
                    <label htmlFor="obs-credencial" className="text-sm font-medium text-text-primary dark:text-gray-200">
                      Observacion <span className="text-text-muted dark:text-gray-500">(opcional)</span>
                    </label>
                    <textarea
                      id="obs-credencial"
                      name="observacion"
                      rows={3}
                      maxLength={300}
                      placeholder="Ej: Necesito la credencial para acceso institucional"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    />
                  </div>
                  <button
                    type="submit"
                    className="h-11 w-full rounded-xl bg-gradient-to-r from-primary to-primary-dark text-sm font-semibold text-white shadow-md shadow-primary/20 transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:shadow-lg active:scale-[0.98]"
                  >
                    Solicitar Credencial
                  </button>
                </form>
              </>
            ) : (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/70 dark:bg-amber-900/20 dark:text-amber-200">
                La solicitud de credencial no esta habilitada para tu usuario o curso. Contacta a administracion si necesitas activarla.
              </div>
            )}
          </article>
        </div>

        <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-base font-semibold text-text-primary dark:text-white">
            Historial de Solicitudes
          </h2>
          <HistorialSolicitudes solicitudes={solicitudes} tipoFiltro="credencial" />
        </article>
      </div>
    </section>
  );
}
