"use client";

import { useMemo, useRef, useState } from "react";

import { AlertTriangle, IdCard, Users } from "lucide-react";

import { actualizarAccesosCursoFormAction } from "@/actions/accesos-documentos";

export type SeccionOption = {
  id: string;
  nombre: string;
  codigo: string | null;
  cursoId: string | null;
  cursoNombre: string | null;
  cursoCodigo: string | null;
  periodoId: string | null;
  periodoNombre: string | null;
  periodoCodigo: string | null;
  periodoEstado: string | null;
  matriculados: number;
};

type Props = {
  secciones: SeccionOption[];
};

type TipoAcceso = "ambos" | "beneficio" | "credencial";

const TIPO_LABEL: Record<TipoAcceso, string> = {
  ambos: "Beneficios y credenciales",
  beneficio: "Solo beneficios",
  credencial: "Solo credenciales",
};

export function BeneficiosCursoForm({ secciones }: Props) {
  const [periodoId, setPeriodoId] = useState<string>("");
  const [cursoId, setCursoId] = useState<string>("");
  const [asignaturaId, setAsignaturaId] = useState<string>("");
  const [tipoAcceso, setTipoAcceso] = useState<TipoAcceso>("ambos");
  const [habilitado, setHabilitado] = useState<"true" | "false">("true");
  const [confirming, setConfirming] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const bypassRef = useRef(false);

  const periodos = useMemo(() => {
    const map = new Map<string, { id: string; nombre: string; estado: string | null }>();
    for (const s of secciones) {
      if (s.periodoId && !map.has(s.periodoId)) {
        map.set(s.periodoId, {
          id: s.periodoId,
          nombre: s.periodoNombre ?? s.periodoCodigo ?? "Periodo",
          estado: s.periodoEstado,
        });
      }
    }
    return Array.from(map.values());
  }, [secciones]);

  const cursos = useMemo(() => {
    const map = new Map<string, { id: string; nombre: string; codigo: string | null }>();
    for (const s of secciones) {
      if (!periodoId || s.periodoId === periodoId) {
        if (s.cursoId && !map.has(s.cursoId)) {
          map.set(s.cursoId, {
            id: s.cursoId,
            nombre: s.cursoNombre ?? "Curso",
            codigo: s.cursoCodigo,
          });
        }
      }
    }
    return Array.from(map.values());
  }, [secciones, periodoId]);

  const seccionesFiltradas = useMemo(() => {
    return secciones.filter((s) => {
      if (periodoId && s.periodoId !== periodoId) return false;
      if (cursoId && s.cursoId !== cursoId) return false;
      return true;
    });
  }, [secciones, periodoId, cursoId]);

  const seccionSeleccionada = secciones.find((s) => s.id === asignaturaId) ?? null;
  const alcance = seccionSeleccionada?.matriculados ?? 0;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (bypassRef.current) {
      bypassRef.current = false;
      return;
    }

    e.preventDefault();

    if (!asignaturaId) return;
    setConfirming(true);
  };

  const handleConfirm = () => {
    bypassRef.current = true;
    setConfirming(false);
    formRef.current?.requestSubmit();
  };

  const handleCancel = () => setConfirming(false);

  return (
    <form
      ref={formRef}
      action={actualizarAccesosCursoFormAction}
      onSubmit={handleSubmit}
      className="mt-4 space-y-4"
    >
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
          Filtrar sección
        </p>
        <PeriodoCursoFilters
          periodos={periodos}
          cursos={cursos}
          periodoId={periodoId}
          cursoId={cursoId}
          onPeriodoChange={(v) => {
            setPeriodoId(v);
            setCursoId("");
            setAsignaturaId("");
          }}
          onCursoChange={(v) => {
            setCursoId(v);
            setAsignaturaId("");
          }}
        />
      </div>

      <label className="space-y-1.5">
        <span className="text-sm font-medium text-text-primary dark:text-gray-200">
          Sección
        </span>
        <select
          name="asignaturaId"
          required
          value={asignaturaId}
          onChange={(e) => setAsignaturaId(e.target.value)}
          className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-text-primary focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="">Seleccionar sección</option>
          {seccionesFiltradas.map((s) => (
            <option key={s.id} value={s.id}>
              {s.cursoNombre} · {s.nombre} ({s.matriculados})
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1.5">
        <span className="text-sm font-medium text-text-primary dark:text-gray-200">
          Acceso
        </span>
        <select
          name="tipoAcceso"
          required
          value={tipoAcceso}
          onChange={(e) => setTipoAcceso(e.target.value as TipoAcceso)}
          className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-text-primary focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="ambos">Beneficios y credenciales</option>
          <option value="beneficio">Solo beneficios</option>
          <option value="credencial">Solo credenciales</option>
        </select>
      </label>

      <label className="space-y-1.5">
        <span className="text-sm font-medium text-text-primary dark:text-gray-200">
          Estado
        </span>
        <select
          name="habilitado"
          required
          value={habilitado}
          onChange={(e) => setHabilitado(e.target.value as "true" | "false")}
          className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-text-primary focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="true">Habilitar</option>
          <option value="false">Deshabilitar</option>
        </select>
      </label>

      {seccionSeleccionada ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-text-secondary dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0 text-primary" />
            <span>
              <strong className="font-semibold text-text-primary dark:text-white">
                {alcance.toLocaleString("es-CL")}
              </strong>{" "}
              alumno{alcance === 1 ? "" : "s"} activo{alcance === 1 ? "" : "s"} serán
              afectados con: <strong>{TIPO_LABEL[tipoAcceso]}</strong> ·{" "}
              {habilitado === "true" ? "Habilitar" : "Deshabilitar"}.
            </span>
          </div>
        </div>
      ) : null}

      {confirming ? (
        <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700/50 dark:bg-amber-950/30">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
            <AlertTriangle className="h-4 w-4" />
            <p className="font-semibold">Confirmar cambio masivo</p>
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-200">
            Vas a aplicar{" "}
            <strong>
              {TIPO_LABEL[tipoAcceso]} · {habilitado === "true" ? "Habilitar" : "Deshabilitar"}
            </strong>{" "}
            a <strong>{alcance.toLocaleString("es-CL")}</strong> alumno
            {alcance === 1 ? "" : "s"} activo{alcance === 1 ? "" : "s"} de{" "}
            <em>{seccionSeleccionada?.cursoNombre} · {seccionSeleccionada?.nombre}</em>. Esta
            acción afecta inmediatamente lo que ven en su dashboard.
          </p>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-700 dark:bg-gray-900 dark:text-amber-200"
            >
              Revisar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
            >
              Confirmar y aplicar
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={!asignaturaId || confirming}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark disabled:opacity-60"
      >
        <IdCard className="h-4 w-4" />
        Aplicar al curso
      </button>
    </form>
  );
}

function PeriodoCursoFilters({
  periodos,
  cursos,
  periodoId,
  cursoId,
  onPeriodoChange,
  onCursoChange,
}: {
  periodos: { id: string; nombre: string; estado: string | null }[];
  cursos: { id: string; nombre: string; codigo: string | null }[];
  periodoId: string;
  cursoId: string;
  onPeriodoChange: (v: string) => void;
  onCursoChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <select
        value={periodoId}
        onChange={(e) => onPeriodoChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-text-primary focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        aria-label="Periodo"
      >
        <option value="">Todos los periodos</option>
        {periodos.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre}
            {p.estado ? ` · ${p.estado}` : ""}
          </option>
        ))}
      </select>
      <select
        value={cursoId}
        onChange={(e) => onCursoChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-text-primary focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        aria-label="Curso"
      >
        <option value="">Todos los cursos</option>
        {cursos.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
            {c.codigo ? ` (${c.codigo})` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
