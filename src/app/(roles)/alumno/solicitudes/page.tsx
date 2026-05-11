import Link from "next/link";

import { CreditCard, FileCheck, FileText, IdCard } from "lucide-react";

import { obtenerAccesoDocumentosAlumnoActual } from "@/actions/accesos-documentos";
import { listarSolicitudesDocumentosAlumno } from "@/actions/solicitudes-documentos";
import { HistorialSolicitudes } from "@/components/solicitudes/HistorialSolicitudes";
import { RouteStateToast } from "@/components/shared/RouteStateToast";

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  request_created: { tone: "success", text: "Solicitud enviada correctamente." },
  already_pending: { tone: "error", text: "Ya tienes una solicitud pendiente para este documento." },
  access_disabled: { tone: "error", text: "Este documento no está habilitado para tu usuario o curso." },
  invalid_input: { tone: "error", text: "Datos inválidos." },
  forbidden: { tone: "error", text: "No autorizado." },
  error: { tone: "error", text: "No fue posible registrar la solicitud." },
};

const SOLICITUD_CARDS = [
  {
    href: "/alumno/solicitudes/credencial",
    accessKey: "credencialHabilitada",
    Icon: IdCard,
    title: "Credencial de Capacitacion",
    description: "Solicita tu credencial de identificación institucional.",
    iconBg: "bg-primary/10 text-primary",
  },
  {
    href: "/alumno/certificados",
    accessKey: null,
    Icon: FileCheck,
    title: "Mis Certificados",
    description: "Genera tu certificado de alumno regular de forma automática.",
    iconBg: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  {
    href: "/alumno/solicitudes/tarjeta-beneficio",
    accessKey: "beneficioHabilitado",
    Icon: CreditCard,
    title: "Tarjeta de Beneficio",
    description: "Accede al Club de Beneficios Impulsate & Emprende.",
    iconBg: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
] as const;

export const metadata = { title: "Solicitudes" };

type Props = { searchParams?: Promise<{ state?: string }> };

export default async function AlumnoSolicitudesPage({ searchParams }: Props) {
  const params = await (searchParams ?? Promise.resolve({} as { state?: string }));
  const [solicitudes, accesos] = await Promise.all([
    listarSolicitudesDocumentosAlumno(),
    obtenerAccesoDocumentosAlumnoActual(),
  ]);

  return (
    <section className="space-y-5">
      <RouteStateToast state={params.state} map={STATUS_MAP} />

      <header>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
          Solicitudes de Documentos
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
          Selecciona el tipo de documento que necesitas. Cada solicitud es independiente.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {SOLICITUD_CARDS.map(({ href, accessKey, Icon, title, description, iconBg }) => {
          const enabled = accessKey ? (accesos?.[accessKey] ?? true) : true;
          const className = enabled
            ? "group flex flex-col gap-3 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary/40"
            : "flex flex-col gap-3 rounded-2xl border border-gray-200/80 bg-gray-50 p-5 opacity-75 shadow-sm dark:border-gray-800 dark:bg-gray-900/60";
          const content = (
            <>
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-text-primary group-hover:text-primary dark:text-white dark:group-hover:text-primary-light">
                  {title}
                </p>
                <p className="mt-0.5 text-xs text-text-secondary dark:text-gray-400">{description}</p>
              </div>
              <span className={`mt-auto text-xs font-medium ${enabled ? "text-primary opacity-0 transition-opacity group-hover:opacity-100 dark:text-primary-light" : "text-amber-700 dark:text-amber-300"}`}>
                {enabled ? "Ir al formulario ->" : "No habilitado por administración"}
              </span>
            </>
          );

          return enabled ? (
            <Link key={href} href={href} className={className}>
              {content}
            </Link>
          ) : (
            <div key={href} className={className} aria-disabled="true">
              {content}
            </div>
          );
        })}
      </div>

      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
            Todas mis solicitudes
          </h2>
          {solicitudes.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {solicitudes.length}
            </span>
          )}
        </div>
        <HistorialSolicitudes solicitudes={solicitudes} />
      </article>
    </section>
  );
}
