import { CalendarDays } from "lucide-react";

import { obtenerEventosCalendarioAlumno } from "@/actions/calendario";
import { CalendarioContainer } from "@/components/shared/CalendarioContainer";

export const metadata = { title: "Mi Calendario" };

export default async function AlumnoCalendarioPage() {
  const hoy = new Date();
  const mes = hoy.getMonth() + 1;
  const anio = hoy.getFullYear();

  const eventos = await obtenerEventosCalendarioAlumno(mes, anio);

  return (
    <section className="space-y-5">
      <header className="flex items-center gap-3">
        <span className="rounded-xl bg-primary/10 p-2 text-primary">
          <CalendarDays className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Mi Calendario
          </h1>
          <p className="text-sm text-text-secondary dark:text-gray-400">
            Clases y evaluaciones de tus cursos.
          </p>
        </div>
      </header>

      <CalendarioContainer
        rol="alumno"
        mesInicial={mes}
        anioInicial={anio}
        eventosIniciales={eventos}
      />
    </section>
  );
}
