"use client";

import { useState, useTransition } from "react";

import { Loader2, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { agregarRetroalimentacion } from "@/actions/entregas";

type Props = {
  entregaId: string;
  asigId: string;
  evalId: string;
};

export function FeedbackForm({ entregaId, asigId, evalId }: Props) {
  const [comentario, setComentario] = useState("");
  const [nota, setNota] = useState("");
  const [requiereCorreccion, setRequiereCorreccion] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comentario.trim()) {
      toast.error("El comentario no puede estar vacío.");
      return;
    }
    startTransition(async () => {
      const result = await agregarRetroalimentacion({
        entregaId,
        comentario,
        nota: nota ? parseFloat(nota) : undefined,
        requiereCorreccion,
      });
      if (result.ok) {
        toast.success("Retroalimentación enviada.");
        router.push(`/docente/asignaturas/${asigId}/evaluaciones/${evalId}/entregas`);
      } else {
        toast.error(result.message ?? "No fue posible enviar la retroalimentación.");
      }
    });
  };

  const inputClass =
    "h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500";

  return (
    <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-text-primary dark:text-white">
        <MessageSquare className="h-4 w-4" />
        Enviar retroalimentación
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="fb-comentario" className="block text-sm font-medium text-text-primary dark:text-gray-200">
            Comentario <span className="text-danger">*</span>
          </label>
          <textarea
            id="fb-comentario"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={4}
            maxLength={3000}
            required
            placeholder="Escribe tu retroalimentación para el alumno…"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="fb-nota" className="block text-sm font-medium text-text-primary dark:text-gray-200">
              Nota (opcional, 1.0 – 7.0)
            </label>
            <input
              id="fb-nota"
              type="number"
              min={1}
              max={7}
              step={0.1}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej: 5.5"
              className={inputClass}
            />
          </div>

          <div className="flex items-end">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/40 dark:hover:bg-gray-800">
              <input
                type="checkbox"
                checked={requiereCorreccion}
                onChange={(e) => setRequiereCorreccion(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 accent-primary"
              />
              <span className="text-sm text-text-primary dark:text-gray-200">
                Requiere corrección
              </span>
            </label>
          </div>
        </div>

        <p className="text-xs text-text-muted dark:text-gray-500">
          {requiereCorreccion
            ? "El alumno podrá re-entregar si tiene intentos disponibles."
            : "La entrega quedará marcada como revisada."}
        </p>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
          <button
            type="button"
            onClick={() => router.back()}
            className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-60"
          >
            {isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Enviando…</>
            ) : (
              "Enviar retroalimentación"
            )}
          </button>
        </div>
      </form>
    </article>
  );
}
