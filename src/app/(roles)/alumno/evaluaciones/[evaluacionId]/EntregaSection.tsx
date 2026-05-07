"use client";

import { useRef, useState, useTransition } from "react";

import { CheckCircle, Clock, FileText, Loader2, Paperclip, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";

import { enviarEntrega } from "@/actions/entregas";

type EntregaRow = {
  id: string;
  intento: number;
  archivoUrl: string | null;
  archivoNombre: string | null;
  comentarioAlumno: string | null;
  estado: "pendiente" | "revisado" | "requiere_correccion" | null;
  entregadoAt: Date | null;
};

type Props = {
  evaluacionId: string;
  entregas: EntregaRow[];
  intentosMax: number;
  fechaLimite: Date | string | null;
};

const ESTADO_LABELS: Record<string, { label: string; cls: string }> = {
  pendiente:            { label: "Pendiente revisión",   cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" },
  revisado:             { label: "Revisado",              cls: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200" },
  requiere_correccion:  { label: "Requiere corrección",   cls: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" },
};

export function EntregaSection({ evaluacionId, entregas, intentosMax, fechaLimite }: Props) {
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const vencido = fechaLimite && new Date(fechaLimite) < new Date();
  const ultimaEntrega = entregas[0];
  const puedeEntregar =
    !vencido &&
    entregas.length < intentosMax &&
    ultimaEntrega?.estado !== "revisado";

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (!file && !formData.get("comentarioAlumno")) {
      toast.error("Adjunta un archivo o escribe un comentario.");
      return;
    }
    startTransition(async () => {
      const result = await enviarEntrega(formData);
      if (result.ok) {
        toast.success("Entrega enviada correctamente.");
        formRef.current?.reset();
        setFile(null);
      } else {
        toast.error(result.message ?? "No fue posible enviar la entrega.");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Historial de entregas */}
      {entregas.length > 0 && (
        <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-3 text-base font-semibold text-text-primary dark:text-white">
            Mis entregas
          </h2>
          <div className="space-y-3">
            {entregas.map((e) => {
              const cfg = e.estado ? ESTADO_LABELS[e.estado] : null;
              return (
                <div key={e.id} className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 dark:border-gray-800 dark:bg-gray-800/40">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-text-primary dark:text-gray-200">
                      Intento {e.intento}
                    </span>
                    {cfg && (
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.cls}`}>
                        {cfg.label}
                      </span>
                    )}
                  </div>
                  {e.archivoNombre && (
                    <a
                      href={e.archivoUrl ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 flex items-center gap-1.5 text-xs text-primary underline-offset-2 hover:underline dark:text-primary-light"
                    >
                      <Paperclip className="h-3 w-3" />
                      {e.archivoNombre}
                    </a>
                  )}
                  {e.comentarioAlumno && (
                    <p className="mt-1.5 text-xs text-text-secondary dark:text-gray-400">
                      {e.comentarioAlumno}
                    </p>
                  )}
                  {e.entregadoAt && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-text-muted dark:text-gray-500">
                      <Clock className="h-3 w-3" />
                      {new Date(e.entregadoAt).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </article>
      )}

      {/* Formulario de entrega */}
      {puedeEntregar ? (
        <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-3 text-base font-semibold text-text-primary dark:text-white">
            {entregas.length === 0 ? "Enviar entrega" : `Re-entregar (intento ${entregas.length + 1}/${intentosMax})`}
          </h2>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="evaluacionId" value={evaluacionId} />

            <div className="space-y-1.5">
              <label htmlFor="entrega-archivo" className="block text-sm font-medium text-text-primary dark:text-gray-200">
                Archivo (opcional)
              </label>
              <div className="flex items-center gap-3">
                <label
                  htmlFor="entrega-archivo"
                  className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 text-sm text-text-secondary transition-colors hover:border-primary hover:text-primary dark:border-gray-600 dark:text-gray-400 dark:hover:border-primary-light dark:hover:text-primary-light"
                >
                  <Upload className="h-4 w-4" />
                  {file ? file.name : "Seleccionar archivo"}
                </label>
                <input
                  id="entrega-archivo"
                  name="archivo"
                  type="file"
                  className="sr-only"
                  inputMode="text" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.zip,.rar"
                />
                {file && (
                  <button type="button" onClick={() => setFile(null)} className="text-text-muted hover:text-danger dark:text-gray-500">
                    <XCircle className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="text-xs text-text-muted dark:text-gray-500">Máx. 50 MB. PDF, Word, Excel, imágenes, ZIP.</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="entrega-comentario" className="block text-sm font-medium text-text-primary dark:text-gray-200">
                Comentario (opcional)
              </label>
              <textarea
                id="entrega-comentario"
                name="comentarioAlumno"
                rows={3}
                maxLength={2000}
                placeholder="Escribe un comentario para el docente…"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
              />
            </div>

            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-6 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-60"
              >
                {isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Enviando…</>
                ) : (
                  <><FileText className="h-4 w-4" />Enviar entrega</>
                )}
              </button>
            </div>
          </form>
        </article>
      ) : (
        <article className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-800/40">
          {vencido ? (
            <div className="flex items-center gap-2 text-sm text-text-secondary dark:text-gray-400">
              <XCircle className="h-4 w-4 text-danger" />
              La fecha límite de entrega ha vencido.
            </div>
          ) : ultimaEntrega?.estado === "revisado" ? (
            <div className="flex items-center gap-2 text-sm text-text-secondary dark:text-gray-400">
              <CheckCircle className="h-4 w-4 text-success" />
              Tu entrega fue revisada y aprobada.
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-text-secondary dark:text-gray-400">
              <XCircle className="h-4 w-4 text-amber-500" />
              Has alcanzado el máximo de intentos ({intentosMax}).
            </div>
          )}
        </article>
      )}
    </div>
  );
}
