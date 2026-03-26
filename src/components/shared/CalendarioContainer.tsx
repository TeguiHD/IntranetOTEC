"use client";

import { useCallback, useState } from "react";

import useSWR from "swr";

import type { EventoCalendario } from "@/actions/calendario";
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

  const handleMesChange = useCallback((nuevoMes: number, nuevoAnio: number) => {
    setMes(nuevoMes);
    setAnio(nuevoAnio);
  }, []);

  return (
    <CalendarioMensual
      eventosPorMes={eventosPorMes}
      mesInicial={mes}
      anioInicial={anio}
      onMesChange={handleMesChange}
    />
  );
}
