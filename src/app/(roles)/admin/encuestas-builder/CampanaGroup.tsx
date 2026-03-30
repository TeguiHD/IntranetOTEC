"use client";

import { useState } from "react";

import { BookOpen, CheckCircle2, ChevronDown, Clock, Layers, Rocket, Users, XCircle, Zap } from "lucide-react";
import Link from "next/link";

import { type EncuestaListItem } from "@/actions/encuestas-unificadas";
import { getPlantilla } from "@/lib/encuesta-plantillas";

const ESTADO_COLORS: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  activa: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  cerrada: "bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400",
};
const ESTADO_LABELS: Record<string, string> = {
  borrador: "Borrador",
  activa: "Activa",
  cerrada: "Cerrada",
};
const AUDIENCIA_LABELS: Record<string, string> = {
  alumnos: "Alumnos",
  docentes: "Docentes",
  todos: "Todos",
};

function EncuestaRow({ enc }: { enc: EncuestaListItem }) {
  const pct =
    (enc.totalAsignados ?? 0) > 0
      ? Math.round(((enc.totalCompletados ?? 0) / (enc.totalAsignados ?? 1)) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3.5 dark:border-gray-700 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-text-primary dark:text-gray-100">
            {enc.titulo}
          </p>
          {enc.obligatoria && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <Zap className="h-2.5 w-2.5" /> Obligatoria
            </span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${ESTADO_COLORS[enc.estadoEncuesta ?? "borrador"]}`}
          >
            {ESTADO_LABELS[enc.estadoEncuesta ?? "borrador"]}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-text-secondary dark:text-gray-400">
          <span className="flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            {enc.asignaturaNombre}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {AUDIENCIA_LABELS[enc.audiencia ?? "alumnos"]}
          </span>
          <span>{enc.totalPreguntas} pregunta{enc.totalPreguntas !== 1 ? "s" : ""}</span>
          {enc.estadoEncuesta === "activa" && enc.totalAsignados > 0 && (
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {enc.totalCompletados}/{enc.totalAsignados} ({pct}%)
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {enc.estadoEncuesta === "activa" && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            En curso
          </span>
        )}
        {enc.estadoEncuesta === "cerrada" && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-red-500 dark:text-red-400">
            <XCircle className="h-3 w-3" /> Cerrada
          </span>
        )}
        <Link
          href={`/admin/encuestas-builder/${enc.id}`}
          className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 dark:border-primary/20 dark:bg-primary/10"
        >
          {enc.estadoEncuesta === "borrador" ? "Editar / Lanzar" : "Ver detalle"}
        </Link>
      </div>
    </div>
  );
}

type Props = {
  encuestas: EncuestaListItem[];
};

export function CampanaGroup({ encuestas }: Props) {
  const [expanded, setExpanded] = useState(true);

  const first = encuestas[0];
  const plantillaLabel = first.plantillaOrigen
    ? getPlantilla(first.plantillaOrigen)?.nombre
    : null;

  const activas = encuestas.filter((e) => e.estadoEncuesta === "activa").length;
  const borradores = encuestas.filter((e) => e.estadoEncuesta === "borrador").length;
  const cerradas = encuestas.filter((e) => e.estadoEncuesta === "cerrada").length;

  const statusBadge = activas > 0
    ? "activa"
    : borradores > 0
      ? "borrador"
      : "cerrada";

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/[0.02] dark:border-primary/15 dark:bg-primary/5">
      {/* Campaign header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-t-2xl px-4 py-3.5 text-left transition-colors hover:bg-primary/[0.04] dark:hover:bg-primary/10"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
            <Layers className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-text-primary dark:text-gray-100">
                {first.titulo}
              </p>
              {plantillaLabel && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                  {plantillaLabel}
                </span>
              )}
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${ESTADO_COLORS[statusBadge]}`}
              >
                {activas > 0 ? `${activas} activa${activas !== 1 ? "s" : ""}` : ESTADO_LABELS[statusBadge]}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-text-secondary dark:text-gray-400">
              Campaña · {encuestas.length} asignatura{encuestas.length !== 1 ? "s" : ""}
              {activas > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <Rocket className="h-3 w-3" /> {activas} en curso
                </span>
              )}
              {borradores > 0 && (
                <span className="ml-2 text-gray-500">
                  <Clock className="inline h-3 w-3" /> {borradores} borrador{borradores !== 1 ? "es" : ""}
                </span>
              )}
              {cerradas > 0 && (
                <span className="ml-2 text-red-500">
                  <CheckCircle2 className="inline h-3 w-3" /> {cerradas} cerrada{cerradas !== 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-text-secondary transition-transform dark:text-gray-400 ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {/* Expanded encuestas */}
      {expanded && (
        <div className="space-y-2 border-t border-primary/10 px-4 pb-4 pt-3 dark:border-primary/10">
          {encuestas.map((enc) => (
            <EncuestaRow key={enc.id} enc={enc} />
          ))}
        </div>
      )}
    </div>
  );
}

export { EncuestaRow };
