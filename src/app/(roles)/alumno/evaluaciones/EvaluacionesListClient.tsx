"use client";

import { CalendarDays, ClipboardList, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  EVALUATION_WINDOW_LABELS,
  EVALUATION_WINDOW_TONES,
  type EvaluationWindowStatus,
} from "@/lib/evaluation-status";

const TIPO_LABELS: Record<string, string> = {
  formulario: "Formulario",
  tarea: "Tarea",
  examen: "Examen",
  proyecto: "Proyecto",
};

const TIPO_COLORS: Record<string, string> = {
  formulario: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  tarea: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  examen: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  proyecto: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

type EvaluacionItem = {
  id: string;
  titulo: string;
  tipo: string;
  asignaturaNombre: string;
  estadoVentana: EvaluationWindowStatus;
  fechaInicio: Date | string | null;
  fechaLimite: Date | string | null;
  respondidaPorAlumno: boolean;
  notaAlumno: string | null;
};

type FiltroId = "todas" | "pendientes" | "enviadas" | "revisadas" | "vencidas" | "proximas";

type Props = {
  evaluaciones: EvaluacionItem[];
};

export function EvaluacionesListClient({ evaluaciones }: Props) {
  const [filtro, setFiltro] = useState<FiltroId>("todas");
  const [busqueda, setBusqueda] = useState("");

  const counts = useMemo(() => {
    return {
      todas: evaluaciones.length,
      pendientes: evaluaciones.filter(
        (e) => e.estadoVentana === "disponible" && !e.respondidaPorAlumno,
      ).length,
      enviadas: evaluaciones.filter(
        (e) => e.respondidaPorAlumno && !e.notaAlumno,
      ).length,
      revisadas: evaluaciones.filter((e) => e.notaAlumno !== null).length,
      vencidas: evaluaciones.filter((e) => e.estadoVentana === "vencida").length,
      proximas: evaluaciones.filter((e) => e.estadoVentana === "programada").length,
    };
  }, [evaluaciones]);

  const filtradas = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    return evaluaciones.filter((ev) => {
      if (term) {
        const hay = `${ev.titulo} ${ev.asignaturaNombre}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      switch (filtro) {
        case "pendientes":
          return ev.estadoVentana === "disponible" && !ev.respondidaPorAlumno;
        case "enviadas":
          return ev.respondidaPorAlumno && !ev.notaAlumno;
        case "revisadas":
          return ev.notaAlumno !== null;
        case "vencidas":
          return ev.estadoVentana === "vencida";
        case "proximas":
          return ev.estadoVentana === "programada";
        default:
          return true;
      }
    });
  }, [evaluaciones, filtro, busqueda]);

  const tabs: { id: FiltroId; label: string; count: number; tone: string }[] = [
    { id: "todas", label: "Todas", count: counts.todas, tone: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
    { id: "pendientes", label: "Pendientes", count: counts.pendientes, tone: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" },
    { id: "enviadas", label: "Enviadas", count: counts.enviadas, tone: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200" },
    { id: "revisadas", label: "Revisadas", count: counts.revisadas, tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
    { id: "proximas", label: "Próximas", count: counts.proximas, tone: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
    { id: "vencidas", label: "Vencidas", count: counts.vencidas, tone: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  ];

  return (
    <div className="space-y-5">
      {/* Search + tabs */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted dark:text-gray-500" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por título o curso…"
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>

        <nav
          aria-label="Filtrar evaluaciones"
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        >
          {tabs.map((tab) => {
            const active = filtro === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFiltro(tab.id)}
                aria-pressed={active}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  active
                    ? "border-primary bg-primary text-white shadow-sm shadow-primary/20"
                    : "border-gray-200 bg-white text-text-secondary hover:border-primary/40 hover:bg-primary/[0.04] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                    active ? "bg-white/20 text-white" : tab.tone
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* List */}
      {filtradas.length === 0 ? (
        <article className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex flex-col items-center gap-3 text-center">
            <ClipboardList className="h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-text-secondary dark:text-gray-400">
              {busqueda
                ? "No se encontraron evaluaciones para tu búsqueda."
                : "No hay evaluaciones en este filtro."}
            </p>
          </div>
        </article>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtradas.map((ev) => {
            const isUpcoming = ev.estadoVentana === "programada";
            const isOverdue = ev.estadoVentana === "vencida";
            return (
              <article
                key={ev.id}
                className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-900 sm:p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-text-primary dark:text-gray-100">
                      {ev.titulo}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-text-secondary dark:text-gray-400">
                      {ev.asignaturaNombre}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      TIPO_COLORS[ev.tipo] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {TIPO_LABELS[ev.tipo] ?? ev.tipo}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      EVALUATION_WINDOW_TONES[ev.estadoVentana]
                    }`}
                  >
                    {EVALUATION_WINDOW_LABELS[ev.estadoVentana]}
                  </span>
                  {ev.estadoVentana === "disponible" && !ev.respondidaPorAlumno ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                      Pendiente
                    </span>
                  ) : null}
                  {ev.respondidaPorAlumno && !ev.notaAlumno ? (
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                      Enviada
                    </span>
                  ) : null}
                  {ev.notaAlumno ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                      Nota {ev.notaAlumno}
                    </span>
                  ) : null}
                </div>

                {isUpcoming && ev.fechaInicio && (
                  <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-800/60 dark:bg-blue-950/30 dark:text-blue-100">
                    Disponible desde{" "}
                    {new Date(ev.fechaInicio).toLocaleDateString("es-CL", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                )}

                {ev.fechaLimite && (
                  <div
                    className={`mt-3 flex items-center gap-1.5 text-xs ${
                      isOverdue ? "text-danger" : "text-text-secondary dark:text-gray-400"
                    }`}
                  >
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {isOverdue ? "Venció el " : "Límite: "}
                      {new Date(ev.fechaLimite).toLocaleDateString("es-CL", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}

                <div className="mt-4">
                  <Link
                    href={`/alumno/evaluaciones/${ev.id}`}
                    className={`inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                      isOverdue || isUpcoming
                        ? "border border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                        : "bg-primary text-white hover:bg-primary-dark active:scale-[0.98]"
                    }`}
                  >
                    {isUpcoming
                      ? "Aún no disponible"
                      : ev.respondidaPorAlumno || isOverdue
                        ? "Ver historial"
                        : "Responder"}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
