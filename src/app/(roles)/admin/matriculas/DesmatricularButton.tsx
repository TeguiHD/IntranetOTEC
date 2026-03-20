"use client";

import { useState, useTransition } from "react";

import { desmatricularAlumnoFormAction } from "@/actions/matriculas";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

type DesmatricularButtonProps = {
  matriculaId: string;
  alumnoNombre: string;
  asignaturaId: string;
  currentPage: number;
  className?: string;
};

export function DesmatricularButton({
  matriculaId,
  alumnoNombre,
  asignaturaId,
  currentPage,
  className,
}: DesmatricularButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    const fd = new FormData();
    fd.set("matriculaId", matriculaId);
    fd.set("asignaturaId", asignaturaId);
    fd.set("page", String(currentPage));

    startTransition(async () => {
      await desmatricularAlumnoFormAction(fd);
      setOpen(false);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? "rounded-xl border border-danger/30 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-danger/10 dark:text-red-400"}
      >
        Desmatricular
      </button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        title="Confirmar desmatriculación"
        description={`Vas a desmatricular a ${alumnoNombre}. Esta acción desactivará su matrícula de la asignatura. ¿Deseas continuar?`}
        confirmLabel="Desmatricular"
        variant="danger"
        isPending={isPending}
      />
    </>
  );
}
