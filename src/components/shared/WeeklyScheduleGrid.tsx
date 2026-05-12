"use client";

import { useMemo } from "react";

export type HorarioBloque = {
  id: string;
  asignaturaId?: string;
  asignaturaNombre: string;
  docenteNombre?: string | null;
  docenteApellido?: string | null;
  diaSemana?: number | null;      // para bloques recurrentes
  fecha?: string | null;          // para clases individuales
  horaInicio: string | null;
  horaFin: string | null;
  sala?: string | null;
};

type Props = {
  bloques: HorarioBloque[];
  titulo?: string;
};

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const COLORES = [
  "bg-purple-100 border-purple-300 text-purple-900 dark:bg-purple-950 dark:border-purple-700 dark:text-purple-100",
  "bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-100",
  "bg-emerald-100 border-emerald-300 text-emerald-900 dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-100",
  "bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-950 dark:border-amber-700 dark:text-amber-100",
  "bg-rose-100 border-rose-300 text-rose-900 dark:bg-rose-950 dark:border-rose-700 dark:text-rose-100",
  "bg-cyan-100 border-cyan-300 text-cyan-900 dark:bg-cyan-950 dark:border-cyan-700 dark:text-cyan-100",
  "bg-orange-100 border-orange-300 text-orange-900 dark:bg-orange-950 dark:border-orange-700 dark:text-orange-100",
];

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60).toString().padStart(2, "0");
  const min = (m % 60).toString().padStart(2, "0");
  return `${h}:${min}`;
}

// Asigna un color consistente por nombre de asignatura
function colorParaAsignatura(nombre: string, allNames: string[]): string {
  const idx = allNames.indexOf(nombre);
  return COLORES[idx % COLORES.length] ?? COLORES[0];
}

// Convierte fecha ISO a día de semana 0=lun..5=sáb
function fechaToDiaSemana(fecha: string): number {
  const d = new Date(fecha + "T12:00:00");
  const dow = d.getDay(); // 0=dom
  return dow === 0 ? 6 : dow - 1; // dom→6, lun→0
}

export function WeeklyScheduleGrid({ bloques, titulo }: Props) {
  const allNames = useMemo(
    () => [...new Set(bloques.map((b) => b.asignaturaNombre))],
    [bloques],
  );

  // Normalizar bloques (resolver diaSemana desde fecha si hace falta)
  const bloquesNorm = useMemo(
    () =>
      bloques.map((b) => ({
        ...b,
        diaSemana:
          b.diaSemana != null
            ? b.diaSemana
            : b.fecha
            ? fechaToDiaSemana(b.fecha)
            : null,
      })),
    [bloques],
  );

  // Determinar rango horario dinámico
  const { minMin, maxMin } = useMemo(() => {
    let min = 8 * 60;
    let max = 18 * 60;
    for (const b of bloquesNorm) {
      if (b.horaInicio) min = Math.min(min, timeToMinutes(b.horaInicio) - 30);
      if (b.horaFin) max = Math.max(max, timeToMinutes(b.horaFin) + 30);
    }
    // Redondear a hora
    min = Math.floor(min / 60) * 60;
    max = Math.ceil(max / 60) * 60;
    return { minMin: Math.max(0, min), maxMin: Math.min(24 * 60, max) };
  }, [bloquesNorm]);

  const totalMinutes = maxMin - minMin;
  const SLOT = 60; // px por hora
  const gridHeight = (totalMinutes / 60) * SLOT;

  const horas: number[] = [];
  for (let m = minMin; m <= maxMin; m += 60) horas.push(m);

  if (bloques.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 px-6 py-10 text-center dark:border-gray-700">
        <p className="text-sm text-text-secondary dark:text-gray-400">No hay clases programadas.</p>
      </div>
    );
  }

  return (
    <div>
      {titulo && (
        <h3 className="mb-3 text-base font-semibold text-text-primary dark:text-white">{titulo}</h3>
      )}

      {/* Mobile: lista agrupada por día */}
      <div className="space-y-4 sm:hidden">
        {DIAS.map((dia, diaIdx) => {
          const del_dia = bloquesNorm.filter((b) => b.diaSemana === diaIdx);
          if (del_dia.length === 0) return null;
          return (
            <div key={dia}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">{dia}</p>
              <div className="space-y-2">
                {del_dia
                  .sort((a, b) => (a.horaInicio ?? "").localeCompare(b.horaInicio ?? ""))
                  .map((b) => (
                    <div
                      key={b.id}
                      className={`rounded-xl border px-3 py-2.5 ${colorParaAsignatura(b.asignaturaNombre, allNames)}`}
                    >
                      <p className="font-semibold text-sm leading-tight">{b.asignaturaNombre}</p>
                      <p className="mt-0.5 text-xs opacity-80">
                        {b.horaInicio} – {b.horaFin ?? "?"}{b.sala ? ` · ${b.sala}` : ""}
                      </p>
                      {(b.docenteNombre || b.docenteApellido) && (
                        <p className="mt-0.5 text-xs opacity-70">
                          {b.docenteNombre} {b.docenteApellido}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: grilla */}
      <div className="hidden overflow-x-auto sm:block">
        <div className="min-w-[640px]">
          {/* Cabecera de días */}
          <div className="mb-1 grid grid-cols-[56px_repeat(6,1fr)] gap-1">
            <div />
            {DIAS.map((dia) => (
              <div key={dia} className="text-center text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400 py-1">
                {dia}
              </div>
            ))}
          </div>

          {/* Cuerpo */}
          <div className="grid grid-cols-[56px_repeat(6,1fr)] gap-1">
            {/* Columna de horas */}
            <div className="relative" style={{ height: gridHeight }}>
              {horas.map((m) => (
                <div
                  key={m}
                  className="absolute right-2 text-xs text-text-muted dark:text-gray-500 leading-none"
                  style={{ top: ((m - minMin) / 60) * SLOT - 6 }}
                >
                  {minutesToTime(m)}
                </div>
              ))}
            </div>

            {/* Columnas por día */}
            {DIAS.map((_, diaIdx) => (
              <div
                key={diaIdx}
                className="relative rounded-xl bg-gray-50/70 dark:bg-gray-800/30"
                style={{ height: gridHeight }}
                aria-label={DIAS[diaIdx]}
              >
                {/* Líneas de hora */}
                {horas.map((m) => (
                  <div
                    key={m}
                    className="absolute left-0 right-0 border-t border-gray-100 dark:border-gray-800"
                    style={{ top: ((m - minMin) / 60) * SLOT }}
                  />
                ))}

                {/* Bloques */}
                {bloquesNorm
                  .filter((b) => b.diaSemana === diaIdx && b.horaInicio)
                  .map((b) => {
                    const startMin = timeToMinutes(b.horaInicio!);
                    const endMin = b.horaFin ? timeToMinutes(b.horaFin) : startMin + 60;
                    const top = ((startMin - minMin) / 60) * SLOT;
                    const height = Math.max(((endMin - startMin) / 60) * SLOT - 2, 24);
                    const color = colorParaAsignatura(b.asignaturaNombre, allNames);

                    return (
                      <div
                        key={b.id}
                        className={`absolute inset-x-1 overflow-hidden rounded-lg border px-1.5 py-1 text-xs ${color}`}
                        style={{ top, height }}
                        aria-label={`${b.asignaturaNombre} ${b.horaInicio}–${b.horaFin ?? "?"}`}
                      >
                        <p className="font-semibold leading-tight truncate">{b.asignaturaNombre}</p>
                        <p className="opacity-75 leading-tight truncate">
                          {b.horaInicio}–{b.horaFin ?? "?"}
                          {b.sala ? ` · ${b.sala}` : ""}
                        </p>
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
