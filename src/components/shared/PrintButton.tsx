"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "Imprimir / Descargar PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 active:scale-[0.98] dark:border-primary/40 dark:bg-primary/10 dark:text-primary-light print:hidden"
    >
      <Printer className="h-4 w-4" />
      {label}
    </button>
  );
}
