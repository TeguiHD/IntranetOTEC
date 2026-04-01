"use client";

import { useState, useTransition } from "react";

import { eliminarMatriculaFormAction } from "@/actions/matriculas";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

type Props = {
  matriculaId: string;
  alumnoNombre: string;
  asignaturaId: string;
  currentPage: number;
  className?: string;
};

export function EliminarMatriculaButton({
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
      await eliminarMatriculaFormAction(fd);
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
          "rounded-xl border border-danger/30 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-danger/10 dark:text-red-400"
        }
      >
        Eliminar
      </button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        title="Eliminar matrícula"
        description={`Vas a eliminar permanentemente la matrícula de ${alumnoNombre}. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        isPending={isPending}
      />
    </>
  );
}
