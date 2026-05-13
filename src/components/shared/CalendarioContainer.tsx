"use client";

import { useCallback, useMemo, useState } from "react";

import Link from "next/link";

import useSWR from "swr";

import {
  crearEventoCalendarioDocenteFormAction,
  eliminarEventoCalendarioDocenteFormAction,
  type EventoCalendario,
} from "@/actions/calendario";
import { CalendarioMensual } from "@/components/shared/CalendarioMensual";

const ESTADO_ESTILO: Record<NonNullable<EventoCalendario["estado"]>, { label: string; classes: string }> = {
  pendiente: {
    label: "Pendiente",
    classes:
      "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200",
  },
  futuro: {
    label: "Próximo",
    classes:
      "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200",
  },
  pasado: {
    label: "Realizado",
    classes:
      "border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300",
  },
};

const TIPO_LABEL: Record<EventoCalendario["tipo"], string> = {
  clase: "Clase",
  evaluacion: "Evaluación",
  prueba: "Prueba",
  dia_libre: "Día libre",
  recordatorio: "Recordatorio",
};

const formatFechaLarga = (fecha: string): string => {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  if (!anio || !mes || !dia) return fecha;
  const date = new Date(anio, mes - 1, dia);
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(date);
};

const ALUMNO_HREF: Partial<Record<EventoCalendario["tipo"], string>> = {
  evaluacion: "/alumno/evaluaciones",
  clase: "/alumno/clases",
  prueba: "/alumno/evaluaciones",
};

function enrichEventosAlumno(eventos: EventoCalendario[], hoy: string): EventoCalendario[] {
  return eventos.map((e) => ({
    ...e,
    href: e.href ?? ALUMNO_HREF[e.tipo] ?? null,
    estado: e.estado ?? (
      e.tipo === "evaluacion" || e.tipo === "prueba"
        ? (e.fecha < hoy ? "pasado" : "pendiente")
        : (e.fecha < hoy ? "pasado" : "futuro")
    ),
  }));
}

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
  const hoy = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;

  const { data } = useSWR(
    key === initialKey ? null : [rol, mes, anio],
    ([r, m, a]) => fetchEventos(r, m, a),
    { revalidateOnFocus: false },
  );

  // Build eventosPorMes map — enrich with href+estado client-side for alumno
  const rawEventosPorMes: Record<string, EventoCalendario[]> = {
    [initialKey]: eventosIniciales,
  };
  if (data && key !== initialKey) {
    rawEventosPorMes[key] = data;
  }

  const eventosPorMes = useMemo(() => {
    if (rol !== "alumno") return rawEventosPorMes;
    const enriched: Record<string, EventoCalendario[]> = {};
    for (const [k, evs] of Object.entries(rawEventosPorMes)) {
      enriched[k] = enrichEventosAlumno(evs, hoy);
    }
    return enriched;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rol, hoy, JSON.stringify(rawEventosPorMes)]);

  const eventosActuales = eventosPorMes[key] ?? [];
  const eventosSeleccionados = eventosActuales.filter((evento) => evento.fecha === selectedDate);

  const eventosOrdenados = useMemo(() => {
    if (rol !== "alumno") return eventosSeleccionados;
    const orden: Record<NonNullable<EventoCalendario["estado"]>, number> = {
      pendiente: 0,
      futuro: 1,
      pasado: 2,
    };
    return [...eventosSeleccionados].sort((a, b) => {
      const ea = a.estado ?? "futuro";
      const eb = b.estado ?? "futuro";
      if (orden[ea] !== orden[eb]) return orden[ea] - orden[eb];
      return (a.hora ?? "").localeCompare(b.hora ?? "");
    });
  }, [eventosSeleccionados, rol]);

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
        hideEventPanel={rol === "alumno"}
      />

      {rol === "alumno" ? (
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <header className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold text-text-primary dark:text-white">
              Eventos del día
            </h2>
            <p className="text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
              {formatFechaLarga(selectedDate)}
            </p>
          </header>

          {eventosOrdenados.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-text-secondary dark:border-gray-700 dark:text-gray-400">
              No hay clases ni evaluaciones para este día.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {eventosOrdenados.map((evento) => {
                const estadoMeta = evento.estado ? ESTADO_ESTILO[evento.estado] : null;
                const tipoLabel = TIPO_LABEL[evento.tipo];
                const inner = (
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-1 inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: evento.color }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                          {tipoLabel}
                        </span>
                        {estadoMeta && (
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${estadoMeta.classes}`}
                          >
                            {estadoMeta.label}
                          </span>
                        )}
                        {evento.hora && (
                          <span className="text-[11px] font-medium text-text-secondary dark:text-gray-400">
                            {evento.hora}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-sm font-semibold text-text-primary dark:text-white">
                        {evento.titulo}
                      </p>
                      {evento.asignaturaNombre && (
                        <p className="text-xs text-text-secondary dark:text-gray-400">
                          {evento.asignaturaNombre}
                        </p>
                      )}
                    </div>
                    {evento.href && (
                      <span
                        aria-hidden="true"
                        className="mt-1 text-text-secondary dark:text-gray-500"
                      >
                        →
                      </span>
                    )}
                  </div>
                );

                const itemClass =
                  "block rounded-lg border border-gray-100 bg-white px-3 py-2.5 dark:border-gray-800 dark:bg-gray-900";

                return (
                  <li key={`${evento.tipo}-${evento.id}`}>
                    {evento.href ? (
                      <Link
                        href={evento.href}
                        className={`${itemClass} transition-colors hover:border-primary/40 hover:bg-primary/5 dark:hover:border-primary/40 dark:hover:bg-primary/10`}
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div className={itemClass}>{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

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
