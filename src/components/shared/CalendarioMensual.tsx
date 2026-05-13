"use client";

import { useState } from "react";

import Link from "next/link";

import { Bell, BookOpen, CalendarCheck2, ChevronLeft, ChevronRight, ClipboardList, Star } from "lucide-react";

import type { EventoCalendario } from "@/actions/calendario";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

type Props = {
  eventosPorMes: Record<string, EventoCalendario[]>; // "YYYY-MM" → eventos
  mesInicial: number;
  anioInicial: number;
  onMesChange?: (mes: number, anio: number) => void;
  selectedDate?: string;
  onDateSelect?: (dateIso: string) => void;
  hideEventPanel?: boolean;
};

export function CalendarioMensual({
  eventosPorMes,
  mesInicial,
  anioInicial,
  onMesChange,
  selectedDate,
  onDateSelect,
  hideEventPanel,
}: Props) {
  const [mes, setMes] = useState(mesInicial);
  const [anio, setAnio] = useState(anioInicial);

  const key = `${anio}-${String(mes).padStart(2, "0")}`;
  const eventos = eventosPorMes[key] ?? [];

  // Build calendar grid
  const primerDia = new Date(anio, mes - 1, 1);
  // Day of week Mon=0 .. Sun=6
  let primerDow = primerDia.getDay() - 1;
  if (primerDow < 0) primerDow = 6;

  const diasEnMes = new Date(anio, mes, 0).getDate();
  const celdas: (number | null)[] = [
    ...Array(primerDow).fill(null),
    ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (celdas.length % 7 !== 0) celdas.push(null);

  const hoy = new Date();
  const esHoy = (d: number) =>
    d === hoy.getDate() && mes === hoy.getMonth() + 1 && anio === hoy.getFullYear();

  const eventosPorDia = (d: number): EventoCalendario[] => {
    const fechaStr = `${anio}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return eventos.filter((e) => e.fecha === fechaStr);
  };
  const selectedEventos = selectedDate
    ? eventos.filter((evento) => evento.fecha === selectedDate)
    : [];
  const getEventoIcon = (tipo: EventoCalendario["tipo"], relevante?: boolean) => {
    if (relevante) return Star;
    if (tipo === "evaluacion" || tipo === "prueba") return ClipboardList;
    if (tipo === "recordatorio") return Bell;
    if (tipo === "dia_libre") return CalendarCheck2;
    return BookOpen;
  };

  const irMesAnterior = () => {
    const nuevo = mes === 1 ? 12 : mes - 1;
    const nuevoAnio = mes === 1 ? anio - 1 : anio;
    setMes(nuevo);
    setAnio(nuevoAnio);
    onMesChange?.(nuevo, nuevoAnio);
  };

  const irMesSiguiente = () => {
    const nuevo = mes === 12 ? 1 : mes + 1;
    const nuevoAnio = mes === 12 ? anio + 1 : anio;
    setMes(nuevo);
    setAnio(nuevoAnio);
    onMesChange?.(nuevo, nuevoAnio);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
        <button
          onClick={irMesAnterior}
          className="rounded-lg p-1.5 text-text-secondary hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-base font-bold text-text-primary dark:text-white">
          {MESES[mes - 1]} {anio}
        </h2>
        <button
          onClick={irMesSiguiente}
          className="rounded-lg p-1.5 text-text-secondary hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
        {DIAS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold uppercase tracking-wide text-text-muted dark:text-gray-500">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {celdas.map((dia, idx) => {
          const evs = dia ? eventosPorDia(dia) : [];
          const dateIso = dia
            ? `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`
            : null;
          const isSelected = Boolean(dateIso && selectedDate === dateIso);

          return (
            <div
              key={idx}
              className={`min-h-[72px] border-b border-r border-gray-100 p-1.5 dark:border-gray-800 ${
                idx % 7 === 6 ? "border-r-0" : ""
              } ${
                dia
                  ? "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  : "bg-gray-50/50 dark:bg-gray-800/20"
              } ${isSelected ? "ring-2 ring-primary/50 ring-inset" : ""}`}
            >
              {dia && (
                <>
                  {onDateSelect && dateIso ? (
                    <button
                      type="button"
                      onClick={() => onDateSelect(dateIso)}
                      className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                        isSelected
                          ? "bg-primary text-white"
                          : esHoy(dia)
                            ? "bg-primary/20 text-primary"
                            : "text-text-primary hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                      }`}
                      aria-label={`Seleccionar dia ${dia}`}
                    >
                      {dia}
                    </button>
                  ) : (
                    <span
                      className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                        esHoy(dia)
                          ? "bg-primary text-white"
                          : "text-text-primary dark:text-gray-300"
                      }`}
                    >
                      {dia}
                    </span>
                  )}
                  <div className="space-y-0.5">
                    {evs.slice(0, 3).map((ev) => (
                      <div
                        key={ev.id}
                        title={`${ev.asignaturaNombre}: ${ev.titulo}${ev.hora ? ` · ${ev.hora}` : ""}`}
                        className="truncate rounded px-1 py-0.5 text-[10px] font-medium text-white"
                        style={{ backgroundColor: ev.tipo === "evaluacion" ? "#EF4444" : ev.color }}
                      >
                        {ev.tipo === "evaluacion" ? "📝 " : "📚 "}
                        {ev.titulo}
                      </div>
                    ))}
                    {evs.length > 3 && (
                      <div className="text-[10px] text-text-muted dark:text-gray-500">
                        +{evs.length - 3} más
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 px-5 py-3 text-xs text-text-secondary dark:text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Clase
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-red-500" /> Evaluación / entrega
        </span>
      </div>
      {selectedDate && !hideEventPanel && (
        <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-text-primary dark:text-white">
            Eventos del día
          </h3>
          {selectedEventos.length === 0 ? (
            <p className="mt-2 rounded-xl border border-dashed border-gray-200 px-4 py-3 text-sm text-text-secondary dark:border-gray-700 dark:text-gray-400">
              No hay clases ni evaluaciones programadas.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {selectedEventos.map((evento) => {
                const Icon = getEventoIcon(evento.tipo, evento.relevante);
                const cardInner = (
                  <>
                    <span
                      className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                      style={{ backgroundColor: evento.tipo === "evaluacion" ? "#EF4444" : evento.color }}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text-primary dark:text-white">
                        {evento.titulo}
                      </p>
                      <p className="text-xs text-text-secondary dark:text-gray-400">
                        {evento.asignaturaNombre}
                        {evento.hora ? ` · ${evento.hora}` : ""}
                      </p>
                    </div>
                    {evento.href && (
                      <span aria-hidden="true" className="mt-1 shrink-0 text-sm text-text-muted dark:text-gray-500">
                        →
                      </span>
                    )}
                  </>
                );
                const cardClass = "flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/50";
                return evento.href ? (
                  <Link
                    key={`${evento.tipo}-${evento.id}`}
                    href={evento.href}
                    className={`${cardClass} cursor-pointer transition-colors hover:border-primary/40 hover:bg-primary/5 dark:hover:border-primary/40 dark:hover:bg-primary/10`}
                  >
                    {cardInner}
                  </Link>
                ) : (
                  <div key={`${evento.tipo}-${evento.id}`} className={cardClass}>
                    {cardInner}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
