import { CalendarDays } from "lucide-react";

import { obtenerEventosCalendarioDocente } from "@/actions/calendario";
import { CalendarioContainer } from "@/components/shared/CalendarioContainer";
import { RouteStateToast } from "@/components/shared/RouteStateToast";

export const metadata = { title: "Mi Calendario" };

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  evento_created: { tone: "success", text: "Evento creado correctamente." },
  evento_deleted: { tone: "success", text: "Evento eliminado correctamente." },
  error: { tone: "error", text: "No fue posible completar la accion." },
};

export default async function DocenteCalendarioPage({
  searchParams,
}: {
  searchParams?: Promise<{ state?: string }>;
}) {
  const params = await (searchParams ?? Promise.resolve({} as { state?: string }));
  const hoy = new Date();
  const mes = hoy.getMonth() + 1;
  const anio = hoy.getFullYear();

  const eventos = await obtenerEventosCalendarioDocente(mes, anio);

  return (
    <section className="space-y-5">
      <RouteStateToast state={params.state} map={STATUS_MAP} />
      <header className="flex items-center gap-3">
        <span className="rounded-xl bg-primary/10 p-2 text-primary">
          <CalendarDays className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Mi Calendario
          </h1>
          <p className="text-sm text-text-secondary dark:text-gray-400">
            Clases, evaluaciones y eventos personales persistentes.
          </p>
        </div>
      </header>

      <CalendarioContainer
        rol="docente"
        mesInicial={mes}
        anioInicial={anio}
        eventosIniciales={eventos}
      />
    </section>
  );
}
