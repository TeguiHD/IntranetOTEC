"use client";

import { useMemo, useRef, useState } from "react";

import { AlertTriangle, CheckCircle2, IdCard, ToggleLeft, ToggleRight, Users } from "lucide-react";

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

type Props = { secciones: SeccionOption[] };

type TipoAcceso = "ambos" | "beneficio" | "credencial";

const TIPO_OPTIONS: { value: TipoAcceso; label: string; hint: string }[] = [
  { value: "ambos", label: "Beneficios + credenciales", hint: "Aplica ambos accesos" },
  { value: "beneficio", label: "Solo beneficios", hint: "Tarjeta de beneficio" },
  { value: "credencial", label: "Solo credenciales", hint: "Credencial alumno" },
];

const fieldLabelClass =
  "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-text-muted dark:text-gray-500";

const selectClass =
  "h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-text-primary transition focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";

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

  const seccionesFiltradas = useMemo(
    () =>
      secciones.filter((s) => {
        if (periodoId && s.periodoId !== periodoId) return false;
        if (cursoId && s.cursoId !== cursoId) return false;
        return true;
      }),
    [secciones, periodoId, cursoId],
  );

  const seccionSeleccionada = secciones.find((s) => s.id === asignaturaId) ?? null;
  const alcance = seccionSeleccionada
    ? seccionSeleccionada.matriculados
    : seccionesFiltradas.reduce((total, seccion) => total + seccion.matriculados, 0);
  const alcanceNombre = seccionSeleccionada
    ? `${seccionSeleccionada.cursoNombre} · ${seccionSeleccionada.nombre}`
    : periodoId || cursoId
      ? "todos los alumnos del filtro seleccionado"
      : "todos los alumnos con matricula activa";

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (bypassRef.current) {
      bypassRef.current = false;
      return;
    }
    e.preventDefault();
    if (alcance <= 0) return;
    setConfirming(true);
  };

  const handleConfirm = () => {
    bypassRef.current = true;
    setConfirming(false);
    formRef.current?.requestSubmit();
  };

  const tipoOption = TIPO_OPTIONS.find((t) => t.value === tipoAcceso)!;
  const accionVerbo = habilitado === "true" ? "Habilitar" : "Deshabilitar";

  return (
    <form
      ref={formRef}
      action={actualizarAccesosCursoFormAction}
      onSubmit={handleSubmit}
      className="mt-4 space-y-4"
    >
      <input type="hidden" name="periodoId" value={periodoId} />
      <input type="hidden" name="cursoId" value={cursoId} />

      {/* Selección de sección */}
      <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-800/40">
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary dark:text-gray-400">
          1. Selecciona el alcance
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className={fieldLabelClass}>Periodo</label>
            <select
              value={periodoId}
              onChange={(e) => {
                setPeriodoId(e.target.value);
                setCursoId("");
                setAsignaturaId("");
              }}
              className={selectClass}
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
          </div>
          <div>
            <label className={fieldLabelClass}>Curso</label>
            <select
              value={cursoId}
              onChange={(e) => {
                setCursoId(e.target.value);
                setAsignaturaId("");
              }}
              className={selectClass}
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
        </div>
        <div>
          <label className={fieldLabelClass}>Sección destino</label>
          <select
            name="asignaturaId"
            value={asignaturaId}
            onChange={(e) => setAsignaturaId(e.target.value)}
            className={selectClass}
          >
            <option value="">Todos los alumnos del filtro</option>
            {seccionesFiltradas.map((s) => (
              <option key={s.id} value={s.id}>
                {s.cursoNombre} · {s.nombre} ({s.matriculados})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tipo de acceso */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary dark:text-gray-400">
          2. Tipo de acceso
        </p>
        <div className="grid gap-2">
          {TIPO_OPTIONS.map((opt) => {
            const checked = tipoAcceso === opt.value;
            return (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                  checked
                    ? "border-primary bg-primary/5 dark:border-primary/60 dark:bg-primary/10"
                    : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
                }`}
              >
                <input
                  type="radio"
                  name="tipoAcceso"
                  value={opt.value}
                  checked={checked}
                  onChange={() => setTipoAcceso(opt.value)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="flex-1">
                  <span className={`block text-sm font-semibold ${checked ? "text-primary dark:text-primary-light" : "text-text-primary dark:text-gray-100"}`}>
                    {opt.label}
                  </span>
                  <span className="text-[11px] text-text-secondary dark:text-gray-400">
                    {opt.hint}
                  </span>
                </span>
                {checked ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                ) : null}
              </label>
            );
          })}
        </div>
      </div>

      {/* Estado */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary dark:text-gray-400">
          3. Acción
        </p>
        <input type="hidden" name="habilitado" value={habilitado} />
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setHabilitado("true")}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
              habilitado === "true"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "border-gray-200 bg-white text-text-secondary hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            <ToggleRight className="h-4 w-4" />
            Habilitar
          </button>
          <button
            type="button"
            onClick={() => setHabilitado("false")}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
              habilitado === "false"
                ? "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
                : "border-gray-200 bg-white text-text-secondary hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            <ToggleLeft className="h-4 w-4" />
            Deshabilitar
          </button>
        </div>
      </div>

      {/* Preview de alcance */}
      {alcance > 0 ? (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 dark:border-primary/40 dark:bg-primary/10">
          <div className="flex items-start gap-2.5">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary dark:bg-primary/30 dark:text-primary-light">
              <Users className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-text-primary dark:text-white">
                {alcance.toLocaleString("es-CL")} alumno{alcance === 1 ? "" : "s"}
              </p>
              <p className="mt-0.5 text-[11px] text-text-secondary dark:text-gray-400">
                de <span className="font-semibold">{alcanceNombre}</span>
              </p>
              <p className="mt-1.5 text-[11px] text-primary dark:text-primary-light">
                Acción: <strong>{accionVerbo}</strong> · {tipoOption.label}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Confirmación */}
      {confirming ? (
        <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-700/50 dark:bg-amber-950/30">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-sm font-bold">Confirmar cambio masivo</p>
          </div>
          <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-200">
            <strong>{accionVerbo}</strong> {tipoOption.label.toLowerCase()} para{" "}
            <strong>{alcance.toLocaleString("es-CL")}</strong> alumno
            {alcance === 1 ? "" : "s"} de{" "}
            <em>{alcanceNombre}</em>. Esta
            acción afecta inmediatamente lo que ven en su dashboard.
          </p>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 dark:border-amber-700 dark:bg-gray-900 dark:text-amber-200"
            >
              Revisar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-700"
            >
              Sí, confirmar
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={alcance <= 0 || confirming}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        <IdCard className="h-4 w-4" />
        Aplicar al alcance
      </button>
    </form>
  );
}
