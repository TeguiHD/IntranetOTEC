"use client";

import { useMemo, useState } from "react";

import { ChevronLeft, ChevronRight } from "lucide-react";

import type { HorarioBloque } from "@/components/shared/WeeklyScheduleGrid";
import { normalizarTextoVisible } from "@/lib/displayText";
import { PanelClase } from "./PanelClase";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DIAS_CORTO = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const COLORES_BG = [
  "bg-purple-100 border-purple-300 text-purple-900 dark:bg-purple-950/60 dark:border-purple-700 dark:text-purple-100",
  "bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-950/60 dark:border-blue-700 dark:text-blue-100",
  "bg-emerald-100 border-emerald-300 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-700 dark:text-emerald-100",
  "bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-950/60 dark:border-amber-700 dark:text-amber-100",
  "bg-rose-100 border-rose-300 text-rose-900 dark:bg-rose-950/60 dark:border-rose-700 dark:text-rose-100",
  "bg-cyan-100 border-cyan-300 text-cyan-900 dark:bg-cyan-950/60 dark:border-cyan-700 dark:text-cyan-100",
];

const COLORES_BAR = [
  "bg-purple-400",
  "bg-blue-400",
  "bg-emerald-400",
  "bg-amber-400",
  "bg-rose-400",
  "bg-cyan-400",
];

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDiaNombre(date: Date): string {
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

type PanelInfo = {
  asignaturaId: string;
  asignaturaNombre: string;
  fecha: string;
  diaNombre: string;
  horaInicio: string | null;
  horaFin: string | null;
  sala: string | null;
};

type Props = {
  bloques: HorarioBloque[];
};

export function CalendarioSemanalDocente({ bloques }: Props) {
  const [semanaBase, setSemanaBase] = useState<Date>(() =>
    getMondayOfWeek(new Date()),
  );
  const [panelAbierto, setPanelAbierto] = useState<PanelInfo | null>(null);

  const nombresUnicos = useMemo(
    () => [...new Set(bloques.map((b) => b.asignaturaNombre))],
    [bloques],
  );

  const colorBg = (nombre: string) =>
    COLORES_BG[nombresUnicos.indexOf(nombre) % COLORES_BG.length] ?? COLORES_BG[0];

  const colorBar = (nombre: string) =>
    COLORES_BAR[nombresUnicos.indexOf(nombre) % COLORES_BAR.length] ?? COLORES_BAR[0];

  const diasSemana = useMemo(
    () => Array.from({ length: 6 }, (_, i) => addDays(semanaBase, i)),
    [semanaBase],
  );

  const hoy = toIso(new Date());

  const semanaLabel = useMemo(() => {
    const inicio = diasSemana[0];
    const fin = diasSemana[5];
    if (!inicio || !fin) return "";
    const fmt = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short" });
    return `${fmt.format(inicio)} – ${fmt.format(fin)} ${inicio.getFullYear()}`;
  }, [diasSemana]);

  const bloquesDelDia = (diaIndex: number) =>
    bloques
      .filter((b) => b.diaSemana === diaIndex)
      .sort((a, b) => (a.horaInicio ?? "").localeCompare(b.horaInicio ?? ""));

  const abrirPanel = (bloque: HorarioBloque, dia: Date) => {
    if (!bloque.asignaturaId) return;
    setPanelAbierto({
      asignaturaId: bloque.asignaturaId,
      asignaturaNombre: bloque.asignaturaNombre,
      fecha: toIso(dia),
      diaNombre: formatDiaNombre(dia),
      horaInicio: bloque.horaInicio ? String(bloque.horaInicio).slice(0, 5) : null,
      horaFin: bloque.horaFin ? String(bloque.horaFin).slice(0, 5) : null,
      sala: bloque.sala ?? null,
    });
  };

  if (bloques.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-900">
        <p className="text-base font-semibold text-text-primary dark:text-white">
          Sin horario configurado
        </p>
        <p className="max-w-sm text-sm text-text-secondary dark:text-gray-400">
          Tu horario semanal aún no está configurado. Contacta a administración para que asignen tus bloques horarios.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Navegador de semana */}
      <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <button
          type="button"
          onClick={() => setSemanaBase((prev) => addDays(prev, -7))}
          className="rounded-lg p-2 text-text-secondary hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          aria-label="Semana anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-text-primary dark:text-white">
          {semanaLabel}
        </span>
        <button
          type="button"
          onClick={() => setSemanaBase((prev) => addDays(prev, 7))}
          className="rounded-lg p-2 text-text-secondary hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          aria-label="Semana siguiente"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Vista desktop: grilla Lun-Sáb */}
      <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 md:block">
        {/* Headers de días */}
        <div className="grid grid-cols-6 border-b border-gray-100 dark:border-gray-800">
          {diasSemana.map((dia, i) => {
            const iso = toIso(dia);
            const esHoy = iso === hoy;
            return (
              <div
                key={i}
                className={[
                  "px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide",
                  esHoy
                    ? "bg-primary/5 text-primary dark:bg-primary/10 dark:text-primary-light"
                    : "text-text-secondary dark:text-gray-400",
                ].join(" ")}
              >
                <span className="block">{DIAS_CORTO[i]}</span>
                <span
                  className={[
                    "mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold",
                    esHoy ? "bg-primary text-white" : "text-text-primary dark:text-white",
                  ].join(" ")}
                >
                  {dia.getDate()}
                </span>
              </div>
            );
          })}
        </div>

        {/* Celdas con bloques */}
        <div className="grid grid-cols-6 divide-x divide-gray-100 dark:divide-gray-800">
          {diasSemana.map((dia, i) => {
            const bloquesHoy = bloquesDelDia(i);
            const iso = toIso(dia);
            const esHoy = iso === hoy;
            return (
              <div
                key={i}
                className={[
                  "min-h-[120px] space-y-1.5 p-2",
                  esHoy ? "bg-primary/5 dark:bg-primary/5" : "",
                ].join(" ")}
              >
                {bloquesHoy.map((bloque) => (
                  <button
                    key={bloque.id}
                    type="button"
                    onClick={() => abrirPanel(bloque, dia)}
                    className={[
                      "w-full rounded-xl border p-2 text-left text-xs font-semibold transition-all hover:opacity-80 active:scale-[0.98]",
                      colorBg(bloque.asignaturaNombre),
                    ].join(" ")}
                  >
                    <span className="block truncate">
                      {normalizarTextoVisible(bloque.asignaturaNombre)}
                    </span>
                    {bloque.horaInicio && (
                      <span className="mt-0.5 block font-normal opacity-80">
                        {String(bloque.horaInicio).slice(0, 5)}
                        {bloque.horaFin ? `–${String(bloque.horaFin).slice(0, 5)}` : ""}
                      </span>
                    )}
                    {bloque.sala && (
                      <span className="mt-0.5 block font-normal opacity-70">{bloque.sala}</span>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Vista mobile: lista por día */}
      <div className="space-y-2 md:hidden">
        {diasSemana.map((dia, i) => {
          const bloquesHoy = bloquesDelDia(i);
          const iso = toIso(dia);
          const esHoy = iso === hoy;
          if (bloquesHoy.length === 0) return null;
          return (
            <div
              key={i}
              className={[
                "overflow-hidden rounded-2xl border bg-white dark:bg-gray-900",
                esHoy
                  ? "border-primary/30 dark:border-primary/40"
                  : "border-gray-200 dark:border-gray-800",
              ].join(" ")}
            >
              <div
                className={[
                  "px-4 py-2.5 text-xs font-bold uppercase tracking-wide",
                  esHoy
                    ? "text-primary dark:text-primary-light"
                    : "text-text-secondary dark:text-gray-400",
                ].join(" ")}
              >
                {DIAS[i]} {dia.getDate()}
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {bloquesHoy.map((bloque) => (
                  <button
                    key={bloque.id}
                    type="button"
                    onClick={() => abrirPanel(bloque, dia)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <span
                      className={[
                        "h-9 w-1.5 shrink-0 rounded-full",
                        colorBar(bloque.asignaturaNombre),
                      ].join(" ")}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text-primary dark:text-white">
                        {normalizarTextoVisible(bloque.asignaturaNombre)}
                      </p>
                      {bloque.horaInicio && (
                        <p className="text-xs text-text-secondary dark:text-gray-400">
                          {String(bloque.horaInicio).slice(0, 5)}
                          {bloque.horaFin ? `–${String(bloque.horaFin).slice(0, 5)}` : ""}
                          {bloque.sala ? ` · ${bloque.sala}` : ""}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-text-secondary dark:text-gray-500" />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Panel lateral */}
      {panelAbierto && (
        <PanelClase
          asignaturaId={panelAbierto.asignaturaId}
          asignaturaNombre={panelAbierto.asignaturaNombre}
          fecha={panelAbierto.fecha}
          diaNombre={panelAbierto.diaNombre}
          horaInicio={panelAbierto.horaInicio}
          horaFin={panelAbierto.horaFin}
          sala={panelAbierto.sala}
          onClose={() => setPanelAbierto(null)}
        />
      )}
    </>
  );
}
