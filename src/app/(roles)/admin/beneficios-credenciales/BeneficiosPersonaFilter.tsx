"use client";

import { useMemo, useState } from "react";

import Link from "next/link";
import { Filter, Layers, RotateCcw, Search, SlidersHorizontal } from "lucide-react";

import { EntityFilterSelect } from "@/components/shared/EntityFilterSelect";

import type { SeccionOption } from "./BeneficiosCursoForm";

type Props = {
  secciones: SeccionOption[];
  initialQuery: string;
  initialAsignaturaId: string;
};

const fieldLabelClass =
  "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-text-muted dark:text-gray-500";

export function BeneficiosPersonaFilter({
  secciones,
  initialQuery,
  initialAsignaturaId,
}: Props) {
  const selectedInitial = secciones.find((s) => s.id === initialAsignaturaId) ?? null;
  const [periodoId, setPeriodoId] = useState(selectedInitial?.periodoId ?? "");
  const [cursoId, setCursoId] = useState(selectedInitial?.cursoId ?? "");
  const [asignaturaId, setAsignaturaId] = useState(initialAsignaturaId);

  const periodos = useMemo(() => {
    const map = new Map<string, { id: string; label: string; badge?: string | null }>();
    for (const s of secciones) {
      if (!s.periodoId || map.has(s.periodoId)) continue;
      map.set(s.periodoId, {
        id: s.periodoId,
        label: s.periodoNombre ?? s.periodoCodigo ?? "Periodo",
        badge: s.periodoEstado,
      });
    }
    return Array.from(map.values());
  }, [secciones]);

  const cursos = useMemo(() => {
    const map = new Map<string, { id: string; label: string; badge?: string | null }>();
    for (const s of secciones) {
      if (periodoId && s.periodoId !== periodoId) continue;
      if (!s.cursoId || map.has(s.cursoId)) continue;
      map.set(s.cursoId, {
        id: s.cursoId,
        label: s.cursoNombre ?? "Curso",
        badge: s.cursoCodigo,
      });
    }
    return Array.from(map.values());
  }, [periodoId, secciones]);

  const seccionesFiltradas = useMemo(
    () =>
      secciones.filter((s) => {
        if (periodoId && s.periodoId !== periodoId) return false;
        if (cursoId && s.cursoId !== cursoId) return false;
        return true;
      }),
    [cursoId, periodoId, secciones],
  );

  const activeFilters =
    (initialQuery ? 1 : 0) +
    (periodoId ? 1 : 0) +
    (cursoId ? 1 : 0) +
    (asignaturaId ? 1 : 0);

  return (
    <form className="space-y-4">
      {/* Búsqueda por persona */}
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-secondary dark:text-gray-400">
          <Search className="h-3.5 w-3.5" />
          Buscar por persona
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            name="q"
            type="search"
            defaultValue={initialQuery}
            placeholder="Nombre, apellido, RUT o correo…"
            className="h-12 w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-3 text-sm text-text-primary placeholder:text-gray-400 transition focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            inputMode="search"
          />
        </div>
      </div>

      {/* Acotar por sección */}
      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-secondary dark:text-gray-400">
          <Layers className="h-3.5 w-3.5" />
          Acotar por sección
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className={fieldLabelClass}>Periodo</label>
            <EntityFilterSelect
              key={`periodo-${periodoId}`}
              name="periodoId"
              defaultValue={periodoId}
              options={periodos}
              placeholder="Todos los periodos"
              emptyLabel="Todos los periodos"
              searchPlaceholder="Buscar periodo…"
              allowClear
              autoSubmit={false}
              countLabel="periodos"
              onValueChange={(value) => {
                setPeriodoId(value);
                setCursoId("");
                setAsignaturaId("");
              }}
            />
          </div>

          <div>
            <label className={fieldLabelClass}>Curso</label>
            <EntityFilterSelect
              key={`curso-${periodoId}-${cursoId}`}
              name="cursoId"
              defaultValue={cursoId}
              options={cursos}
              placeholder="Todos los cursos"
              emptyLabel="Todos los cursos"
              searchPlaceholder="Buscar curso…"
              allowClear
              autoSubmit={false}
              countLabel="cursos"
              onValueChange={(value) => {
                setCursoId(value);
                setAsignaturaId("");
              }}
            />
          </div>

          <div>
            <label className={fieldLabelClass}>Sección</label>
            <EntityFilterSelect
              key={`seccion-${periodoId}-${cursoId}-${asignaturaId}`}
              name="asignaturaId"
              defaultValue={asignaturaId}
              options={seccionesFiltradas.map((s) => ({
                id: s.id,
                label: `${s.cursoNombre ?? "Curso"} · ${s.nombre}`,
                description: s.periodoNombre,
                badge: `${s.matriculados} alumnos`,
              }))}
              placeholder="Todas las secciones"
              emptyLabel="Todas las secciones"
              searchPlaceholder="Buscar sección…"
              allowClear
              autoSubmit={false}
              countLabel="secciones"
              onValueChange={setAsignaturaId}
            />
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
        <div className="flex items-center gap-2 text-xs text-text-secondary dark:text-gray-400">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>
            {activeFilters === 0
              ? "Sin filtros activos"
              : `${activeFilters} filtro${activeFilters === 1 ? "" : "s"} aplicado${activeFilters === 1 ? "" : "s"}`}
          </span>
        </div>
        <div className="flex gap-2">
          {activeFilters > 0 ? (
            <Link
              href="/admin/beneficios-credenciales"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-gray-200 px-3 text-xs font-semibold text-text-secondary transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Limpiar
            </Link>
          ) : null}
          <button
            type="submit"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
          >
            <Filter className="h-4 w-4" />
            Aplicar
          </button>
        </div>
      </div>
    </form>
  );
}
