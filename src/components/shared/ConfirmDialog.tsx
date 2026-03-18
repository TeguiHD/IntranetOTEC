"use client";

import { Loader2 } from "lucide-react";

import { Modal } from "./Modal";

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" shows red confirm button, "primary" shows purple */
  variant?: "danger" | "primary";
  isPending?: boolean;
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "primary",
  isPending = false,
}: ConfirmDialogProps) {
  const confirmClass =
    variant === "danger"
      ? "bg-danger text-white hover:bg-red-600 focus:ring-danger shadow-danger/20"
      : "bg-primary text-white hover:bg-primary-dark focus:ring-primary shadow-primary/20";

  return (
    <Modal open={open} onClose={onClose} title={title} size="max-w-md">
      <p className="text-sm text-text-secondary dark:text-gray-300">{description}</p>
      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          className={`h-10 rounded-xl px-5 text-sm font-semibold shadow-md transition-all focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${confirmClass}`}
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Procesando…
            </span>
          ) : (
            confirmLabel
          )}
        </button>
      </div>
    </Modal>
  );
}
