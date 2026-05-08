"use client";

import { useMemo, useState } from "react";

import Link from "next/link";
import { Search } from "lucide-react";

import { EntityFilterSelect } from "@/components/shared/EntityFilterSelect";

import type { SeccionOption } from "./BeneficiosCursoForm";

type Props = {
  secciones: SeccionOption[];
  initialQuery: string;
  initialAsignaturaId: string;
};

export function BeneficiosPersonaFilter({
  secciones,
  initialQuery,
  initialAsignaturaId,
}: Props) {
  const selectedInitial = secciones.find((seccion) => seccion.id === initialAsignaturaId) ?? null;
  const [periodoId, setPeriodoId] = useState(selectedInitial?.periodoId ?? "");
  const [cursoId, setCursoId] = useState(selectedInitial?.cursoId ?? "");
  const [asignaturaId, setAsignaturaId] = useState(initialAsignaturaId);

  const periodos = useMemo(() => {
    const map = new Map<string, { id: string; label: string; badge?: string | null }>();
    for (const seccion of secciones) {
      if (!seccion.periodoId || map.has(seccion.periodoId)) continue;
      map.set(seccion.periodoId, {
        id: seccion.periodoId,
        label: seccion.periodoNombre ?? seccion.periodoCodigo ?? "Periodo",
        badge: seccion.periodoEstado,
      });
    }
    return Array.from(map.values());
  }, [secciones]);

  const cursos = useMemo(() => {
    const map = new Map<string, { id: string; label: string; badge?: string | null }>();
    for (const seccion of secciones) {
      if (periodoId && seccion.periodoId !== periodoId) continue;
      if (!seccion.cursoId || map.has(seccion.cursoId)) continue;
      map.set(seccion.cursoId, {
        id: seccion.cursoId,
        label: seccion.cursoNombre ?? "Curso",
        badge: seccion.cursoCodigo,
      });
    }
    return Array.from(map.values());
  }, [periodoId, secciones]);

  const seccionesFiltradas = useMemo(
    () =>
      secciones.filter((seccion) => {
        if (periodoId && seccion.periodoId !== periodoId) return false;
        if (cursoId && seccion.cursoId !== cursoId) return false;
        return true;
      }),
    [cursoId, periodoId, secciones],
  );

  return (
    <form className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(180px,0.8fr)_minmax(180px,0.8fr)_minmax(220px,1fr)_auto]">
      <label className="space-y-1.5">
        <span className="text-sm font-medium text-text-primary dark:text-gray-200">
          Buscar persona
        </span>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            name="q"
            defaultValue={initialQuery}
            placeholder="Nombre, apellido, RUT, credencial o correo"
            className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            inputMode="search"
          />
        </div>
      </label>

      <div className="space-y-1.5">
        <span className="text-sm font-medium text-text-primary dark:text-gray-200">
          Periodo
        </span>
        <EntityFilterSelect
          key={`periodo-${periodoId}`}
          name="periodoId"
          defaultValue={periodoId}
          options={periodos}
          placeholder="Todos los periodos"
          emptyLabel="Todos los periodos"
          searchPlaceholder="Buscar periodo..."
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

      <div className="space-y-1.5">
        <span className="text-sm font-medium text-text-primary dark:text-gray-200">
          Curso
        </span>
        <EntityFilterSelect
          key={`curso-${periodoId}-${cursoId}`}
          name="cursoId"
          defaultValue={cursoId}
          options={cursos}
          placeholder="Todos los cursos"
          emptyLabel="Todos los cursos"
          searchPlaceholder="Buscar curso..."
          allowClear
          autoSubmit={false}
          countLabel="cursos"
          onValueChange={(value) => {
            setCursoId(value);
            setAsignaturaId("");
          }}
        />
      </div>

      <div className="space-y-1.5">
        <span className="text-sm font-medium text-text-primary dark:text-gray-200">
          Sección
        </span>
        <EntityFilterSelect
          key={`seccion-${periodoId}-${cursoId}-${asignaturaId}`}
          name="asignaturaId"
          defaultValue={asignaturaId}
          options={seccionesFiltradas.map((seccion) => ({
            id: seccion.id,
            label: `${seccion.cursoNombre ?? "Curso"} · ${seccion.nombre}`,
            description: seccion.periodoNombre,
            badge: `${seccion.matriculados} alumnos`,
          }))}
          placeholder="Todas las secciones"
          emptyLabel="Todas las secciones"
          searchPlaceholder="Buscar sección..."
          allowClear
          autoSubmit={false}
          countLabel="secciones"
          onValueChange={setAsignaturaId}
        />
      </div>

      <div className="flex items-end gap-2">
        <button
          type="submit"
          className="h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark"
        >
          Filtrar
        </button>
        {(initialQuery || initialAsignaturaId) ? (
          <Link
            href="/admin/beneficios-credenciales"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 px-3 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Limpiar
          </Link>
        ) : null}
      </div>
    </form>
  );
}
