"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";

type Props = {
  label: string;
  confirmMessage: string;
};

export function ConfirmDeleteButton({ label, confirmMessage }: Props) {
  const [pending, startTransition] = useTransition();
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:bg-gray-900 dark:text-red-300 dark:hover:bg-red-950/40"
      >
        <Trash2 className="h-4 w-4" />
        {label}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-[11px] leading-relaxed text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
        {confirmMessage}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setArmed(false)}
          disabled={pending}
          className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-text-secondary transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          onClick={() => startTransition(() => {})}
          className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-600 px-3 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Confirmar
        </button>
      </div>
    </div>
  );
}
