"use client";

import { useRef, useState } from "react";

import { rehabilitarIntentoFormAction } from "@/actions/evaluaciones";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

type RehabilitarIntentoActionsProps = {
  evaluacionId: string;
  matriculaId: string;
  intentoId: string;
  asignaturaId: string;
  periodoId?: string;
  redirectTo: string;
  disabled?: boolean;
  alumnoLabel: string;
};

type PendingMode = "reanudar" | "nuevo" | null;

export function RehabilitarIntentoActions({
  evaluacionId,
  matriculaId,
  intentoId,
  asignaturaId,
  periodoId = "",
  redirectTo,
  disabled = false,
  alumnoLabel,
}: RehabilitarIntentoActionsProps) {
  const resumeFormRef = useRef<HTMLFormElement>(null);
  const restartFormRef = useRef<HTMLFormElement>(null);
  const [pendingMode, setPendingMode] = useState<PendingMode>(null);
  const [submitting, setSubmitting] = useState(false);

  const submitMode = (mode: Exclude<PendingMode, null>) => {
    setSubmitting(true);
    if (mode === "reanudar") {
      resumeFormRef.current?.requestSubmit();
      return;
    }
    restartFormRef.current?.requestSubmit();
  };

  return (
    <>
      <div className="flex shrink-0 flex-wrap gap-2">
        <form ref={resumeFormRef} action={rehabilitarIntentoFormAction}>
          <input type="hidden" name="evaluacionId" value={evaluacionId} />
          <input type="hidden" name="matriculaId" value={matriculaId} />
          <input type="hidden" name="intentoId" value={intentoId} />
          <input type="hidden" name="modo" value="reanudar" />
          <input type="hidden" name="asignaturaId" value={asignaturaId} />
          <input type="hidden" name="periodoId" value={periodoId} />
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <button
            type="button"
            disabled={disabled || submitting}
            onClick={() => setPendingMode("reanudar")}
            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
          >
            Reanudar
          </button>
        </form>
        <form ref={restartFormRef} action={rehabilitarIntentoFormAction}>
          <input type="hidden" name="evaluacionId" value={evaluacionId} />
          <input type="hidden" name="matriculaId" value={matriculaId} />
          <input type="hidden" name="intentoId" value={intentoId} />
          <input type="hidden" name="modo" value="nuevo" />
          <input type="hidden" name="asignaturaId" value={asignaturaId} />
          <input type="hidden" name="periodoId" value={periodoId} />
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <button
            type="button"
            disabled={disabled || submitting}
            onClick={() => setPendingMode("nuevo")}
            className="rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40 dark:border-red-800 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            Anular y reiniciar
          </button>
        </form>
      </div>

      <ConfirmDialog
        open={pendingMode === "reanudar"}
        onClose={() => setPendingMode(null)}
        onConfirm={() => submitMode("reanudar")}
        title="Reanudar intento"
        description={`Vas a rehabilitar el intento de ${alumnoLabel}. El alumno continuará el mismo intento con el temporizador completo desde ahora.`}
        confirmLabel="Reanudar intento"
        isPending={submitting}
      />

      <ConfirmDialog
        open={pendingMode === "nuevo"}
        onClose={() => setPendingMode(null)}
        onConfirm={() => submitMode("nuevo")}
        title="Anular y reiniciar"
        description={`Vas a anular el intento de ${alumnoLabel}. Sus respuestas de ese intento se eliminarán y podrá comenzar desde cero.`}
        confirmLabel="Anular y reiniciar"
        variant="danger"
        isPending={submitting}
      />
    </>
  );
}
