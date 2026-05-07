"use client";

import { useState, useTransition } from "react";

import { Brain, ChevronDown, FileCheck, GraduationCap, Loader2, PenLine, Plus, Star, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { crearEncuestaBatchAction } from "@/actions/encuestas-unificadas";
import { type AsignaturaBusqueda } from "@/actions/asignaturas";
import { PLANTILLAS, type Plantilla } from "@/lib/encuesta-plantillas";
import { AsignaturasMultiCombobox } from "./AsignaturasMultiCombobox";

const ICON_MAP: Record<string, LucideIcon> = {
  GraduationCap,
  Star,
  FileCheck,
  Brain,
  PenLine,
};

const TIPO_LABELS: Record<string, string> = {
  likert: "Escala 1–5",
  si_no: "Sí / No",
  texto_libre: "Texto libre",
};

const inputClass =
  "h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary placeholder:text-gray-400 transition-shadow focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500";

export function EncuestasCrearForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [plantilla, setPlantilla] = useState<Plantilla | null>(null);
  const [showPreguntas, setShowPreguntas] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [instrucciones, setInstrucciones] = useState("");
  const [audiencia, setAudiencia] = useState<"alumnos" | "docentes" | "todos">("alumnos");
  const [obligatoria, setObligatoria] = useState(false);
  const [asignaturas, setAsignaturas] = useState<AsignaturaBusqueda[]>([]);

  const selectPlantilla = (p: Plantilla) => {
    const isSame = plantilla?.id === p.id;
    setPlantilla(isSame ? null : p);
    setShowPreguntas(false);
    if (!isSame) {
      if (!titulo) setTitulo(p.nombre !== "En blanco" ? p.nombre : "");
      setAudiencia(p.audienciaDefault);
    }
  };

  const canSubmit = asignaturas.length > 0 && titulo.trim().length >= 2;

  const handleSubmit = () => {
    if (!canSubmit) return;
    startTransition(async () => {
      const result = await crearEncuestaBatchAction({
        titulo: titulo.trim(),
        instrucciones: instrucciones.trim() || undefined,
        audiencia,
        obligatoria,
        asignaturaIds: asignaturas.map((a) => a.id),
        plantillaId: plantilla?.id,
        preguntas: plantilla?.preguntas ?? [],
      });

      if (result.ok) {
        const count = asignaturas.length;
        const pregCount = plantilla?.preguntas.length ?? 0;
        toast.success(
          count === 1
            ? `Encuesta creada${pregCount > 0 ? ` con ${pregCount} preguntas incluidas` : ""}.`
            : `${count} encuestas creadas correctamente.`,
          { duration: 5000 },
        );
        // Reset form
        setTitulo("");
        setInstrucciones("");
        setPlantilla(null);
        setAsignaturas([]);
        setObligatoria(false);
        setAudiencia("alumnos");

        if (result.singleId) {
          router.push(`/admin/encuestas-builder/${result.singleId}`);
        } else {
          router.refresh();
        }
      } else {
        toast.error(result.message ?? "No fue posible crear la encuesta.");
      }
    });
  };

  return (
    <article className="rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-white via-white to-indigo-50/50 p-5 shadow-sm dark:border-indigo-900/40 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950/25 sm:p-6">
      <div className="mb-5 flex items-start gap-2">
        <Plus className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-base font-semibold text-text-primary dark:text-white">
            Nueva Encuesta
          </h2>
          <p className="mt-0.5 text-xs text-text-secondary dark:text-gray-400">
            Define plantilla, audiencia y secciones objetivo para generar una campana consistente.
          </p>
        </div>
      </div>

      {/* ── Template picker ── */}
      <div className="mb-5">
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
          Selecciona una plantilla
        </p>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {PLANTILLAS.map((p) => {
            const Icon = ICON_MAP[p.iconName] ?? PenLine;
            const isSelected = plantilla?.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => selectPlantilla(p)}
                className={`flex w-[152px] flex-none flex-col rounded-xl border p-3.5 text-left transition-[background-color,border-color,color,box-shadow,opacity,transform] ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20 dark:border-primary dark:bg-primary/10 dark:ring-primary/30"
                    : "border-gray-200 hover:border-primary/40 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-primary/30 dark:hover:bg-gray-800/60"
                }`}
              >
                <span
                  className={`mb-2.5 inline-flex h-8 w-8 items-center justify-center rounded-lg ${
                    isSelected
                      ? "bg-primary/15 text-primary dark:bg-primary/20"
                      : "bg-gray-100 text-text-secondary dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <p className="text-xs font-semibold leading-tight text-text-primary dark:text-gray-100">
                  {p.nombre}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-text-muted dark:text-gray-500">
                  {p.descripcion}
                </p>
                {p.preguntas.length > 0 && (
                  <span className="mt-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-text-secondary dark:bg-gray-800 dark:text-gray-400">
                    {p.preguntas.length} preguntas
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Question preview */}
        {plantilla && plantilla.preguntas.length > 0 && (
          <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50/60 dark:border-gray-800 dark:bg-gray-800/40">
            <button
              type="button"
              onClick={() => setShowPreguntas((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left"
            >
              <span className="text-xs font-semibold text-text-secondary dark:text-gray-400">
                Preguntas incluidas ({plantilla.preguntas.length})
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-text-secondary transition-transform dark:text-gray-400 ${showPreguntas ? "rotate-180" : ""}`}
              />
            </button>
            {showPreguntas && (
              <ol className="divide-y divide-gray-100 px-4 pb-3 dark:divide-gray-800">
                {plantilla.preguntas.map((q, i) => (
                  <li key={i} className="flex items-start gap-2 py-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-text-primary dark:text-gray-200">
                        {q.enunciado}
                      </p>
                      <p className="text-[10px] text-text-muted dark:text-gray-500">
                        {TIPO_LABELS[q.tipo]}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>

      {/* ── Form fields ── */}
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
              Título <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={titulo}
              inputMode="text" onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Evaluación Docente — Semestre 1"
              maxLength={120}
              required
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
              Dirigida a
            </label>
            <select
              value={audiencia}
              onChange={(e) => setAudiencia(e.target.value as "alumnos" | "docentes" | "todos")}
              className={inputClass}
            >
              <option value="alumnos">Solo alumnos</option>
              <option value="docentes">Solo docentes</option>
              <option value="todos">Alumnos + Docente</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
            Instrucciones <span className="text-text-muted font-normal normal-case">(opcional)</span>
          </label>
          <textarea
            value={instrucciones}
            onChange={(e) => setInstrucciones(e.target.value)}
            rows={2}
            placeholder="Instrucciones para los encuestados..."
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
            Asignaturas <span className="text-danger">*</span>
          </label>
          <AsignaturasMultiCombobox
            selected={asignaturas}
            onChange={setAsignaturas}
          />
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary dark:text-gray-400">
            <input
              type="checkbox"
              checked={obligatoria}
              inputMode="text" onChange={(e) => setObligatoria(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 accent-primary"
            />
            <span>Obligatoria — bloquea el portal hasta que sea respondida</span>
          </label>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Creando...</>
            ) : (
              <><Plus className="h-4 w-4" />
                {asignaturas.length > 1 ? `Crear ${asignaturas.length} encuestas` : "Crear encuesta"}
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
