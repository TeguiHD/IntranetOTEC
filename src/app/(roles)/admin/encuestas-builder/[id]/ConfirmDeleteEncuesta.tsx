"use client";

import { useState, useTransition } from "react";

import { Loader2, Trash2 } from "lucide-react";

type Props = {
  evaluacionId: string;
  action: (formData: FormData) => Promise<void>;
};

export function ConfirmDeleteEncuesta({ evaluacionId, action }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    const formData = new FormData();
    formData.set("evaluacionId", evaluacionId);
    startTransition(() => action(formData));
  };

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-500 transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:bg-red-50 active:scale-[0.97] dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/20"
      >
        <Trash2 className="h-4 w-4" /> Eliminar encuesta
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800/40 dark:bg-red-950/20">
      <p className="mb-3 text-xs font-medium text-red-700 dark:text-red-300">
        ¿Seguro que deseas eliminar esta encuesta? Esta acción no se puede deshacer.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Trash2 className="h-3 w-3" />
          )}
          Eliminar
        </button>
      </div>
    </div>
  );
}
