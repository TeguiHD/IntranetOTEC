import { listarSolicitudesDocumentosAdmin } from "@/actions/solicitudes-documentos";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { SolicitudesView } from "./SolicitudesView";

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  solicitud_aprobada: { tone: "success", text: "Solicitud aprobada correctamente." },
  solicitud_rechazada: { tone: "success", text: "Solicitud rechazada correctamente." },
  solicitudes_limpiadas: { tone: "success", text: "Solicitudes resueltas eliminadas correctamente." },
  already_resolved: { tone: "error", text: "La solicitud ya fue resuelta anteriormente." },
  not_found: { tone: "error", text: "Solicitud no encontrada." },
  invalid_input: { tone: "error", text: "Datos inválidos." },
  forbidden: { tone: "error", text: "No autorizado para esta acción." },
  error: { tone: "error", text: "No fue posible completar la acción." },
};

type AdminSolicitudesPageProps = {
  searchParams?: {
    state?: string;
  };
};

export default async function AdminSolicitudesPage({ searchParams }: AdminSolicitudesPageProps) {
  const solicitudes = await listarSolicitudesDocumentosAdmin();

  return (
    <section className="space-y-5">
      <RouteStateToast state={searchParams?.state} map={STATUS_MAP} />

      <header>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
          Solicitudes de Documentos
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
          Gestiona las solicitudes de credencial, certificado de alumno regular y tarjeta de beneficio.
        </p>
      </header>

      <SolicitudesView solicitudes={solicitudes} />
    </section>
  );
}
