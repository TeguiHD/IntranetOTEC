"use client";

import { useState, useTransition } from "react";

import { reactivarMatriculaFormAction } from "@/actions/matriculas";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

type Props = {
  matriculaId: string;
  alumnoNombre: string;
  asignaturaId: string;
  currentPage: number;
  className?: string;
};

export function ReactivarMatriculaButton({
  matriculaId,
  alumnoNombre,
  asignaturaId,
  currentPage,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    const fd = new FormData();
    fd.set("matriculaId", matriculaId);
    fd.set("asignaturaId", asignaturaId);
    fd.set("page", String(currentPage));

    startTransition(async () => {
      await reactivarMatriculaFormAction(fd);
      setOpen(false);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "rounded-xl border border-success/30 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-success/10 dark:text-green-400"
        }
      >
        Reactivar
      </button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        title="Reactivar matrícula"
        description={`¿Deseas reactivar la matrícula de ${alumnoNombre}?`}
        confirmLabel="Reactivar"
        variant="primary"
        isPending={isPending}
      />
    </>
  );
}
