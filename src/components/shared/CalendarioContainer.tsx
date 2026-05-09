"use client";

import { useCallback, useState } from "react";

import useSWR from "swr";

import {
  crearEventoCalendarioDocenteFormAction,
  eliminarEventoCalendarioDocenteFormAction,
  type EventoCalendario,
} from "@/actions/calendario";
import { CalendarioMensual } from "@/components/shared/CalendarioMensual";

type Props = {
  rol: "alumno" | "docente";
  mesInicial: number;
  anioInicial: number;
  eventosIniciales: EventoCalendario[];
};

async function fetchEventos(rol: "alumno" | "docente", mes: number, anio: number): Promise<EventoCalendario[]> {
  const res = await fetch(`/api/calendario?rol=${rol}&mes=${mes}&anio=${anio}`);
  if (!res.ok) return [];
  return res.json() as Promise<EventoCalendario[]>;
}

export function CalendarioContainer({ rol, mesInicial, anioInicial, eventosIniciales }: Props) {
  const [mes, setMes] = useState(mesInicial);
  const [anio, setAnio] = useState(anioInicial);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  });

  const key = `${anio}-${String(mes).padStart(2, "0")}`;
  const initialKey = `${anioInicial}-${String(mesInicial).padStart(2, "0")}`;

  const { data } = useSWR(
    key === initialKey ? null : [rol, mes, anio],
    ([r, m, a]) => fetchEventos(r, m, a),
    { revalidateOnFocus: false },
  );

  // Build eventosPorMes map
  const eventosPorMes: Record<string, EventoCalendario[]> = {
    [initialKey]: eventosIniciales,
  };
  if (data && key !== initialKey) {
    eventosPorMes[key] = data;
  }
  const eventosActuales = eventosPorMes[key] ?? [];
  const eventosSeleccionados = eventosActuales.filter((evento) => evento.fecha === selectedDate);

  const handleMesChange = useCallback((nuevoMes: number, nuevoAnio: number) => {
    setMes(nuevoMes);
    setAnio(nuevoAnio);
  }, []);

  return (
    <div className="space-y-5">
      <CalendarioMensual
        eventosPorMes={eventosPorMes}
        mesInicial={mes}
        anioInicial={anio}
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        onMesChange={handleMesChange}
      />

      {rol === "docente" ? (
        <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <form
            action={crearEventoCalendarioDocenteFormAction}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <input type="hidden" name="fecha" value={selectedDate} />
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-text-primary dark:text-white">
                  Evento personal
                </h2>
                <p className="text-sm text-text-secondary dark:text-gray-400">
                  {selectedDate}
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-text-secondary dark:text-gray-300">
                <input name="relevante" type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary" />
                Relevante
              </label>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                name="titulo"
                required
                maxLength={120}
                placeholder="Titulo"
                className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <select
                name="tipo"
                defaultValue="recordatorio"
                className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="recordatorio">Recordatorio</option>
                <option value="prueba">Prueba</option>
                <option value="clase">Clase</option>
                <option value="dia_libre">Dia libre</option>
              </select>
              <select
                name="color"
                defaultValue="#6366F1"
                className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="#6366F1">Indigo</option>
                <option value="#10B981">Verde</option>
                <option value="#F59E0B">Amarillo</option>
                <option value="#EF4444">Rojo</option>
                <option value="#06B6D4">Cian</option>
                <option value="#8B3A9E">Morado</option>
              </select>
              <textarea
                name="nota"
                rows={3}
                maxLength={500}
                placeholder="Nota opcional"
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm sm:col-span-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <button
              type="submit"
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
            >
              Crear evento
            </button>
          </form>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-base font-semibold text-text-primary dark:text-white">
              Eventos del dia
            </h2>
            <div className="mt-3 space-y-2">
              {eventosSeleccionados.length === 0 ? (
                <p className="text-sm text-text-secondary dark:text-gray-400">
                  Sin eventos para la fecha seleccionada.
                </p>
              ) : (
                eventosSeleccionados.map((evento) => (
                  <div
                    key={`${evento.tipo}-${evento.id}`}
                    className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-primary dark:text-white">
                        {evento.titulo}
                      </p>
                      <p className="text-xs text-text-secondary dark:text-gray-400">
                        {evento.asignaturaNombre}{evento.relevante ? " · Relevante" : ""}
                      </p>
                    </div>
                    {evento.personal ? (
                      <form action={eliminarEventoCalendarioDocenteFormAction}>
                        <input type="hidden" name="eventoId" value={evento.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/30"
                        >
                          Eliminar
                        </button>
                      </form>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
