"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { X } from "lucide-react";

type ConfirmacionSolicitudModalProps = {
  action: () => Promise<{ ok: boolean; code?: string; message?: string }>;
  mensaje?: string;
};

export function ConfirmacionSolicitudModal({
  action,
  mensaje = "Tu certificado será enviado durante 5 días hábiles.",
}: ConfirmacionSolicitudModalProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const cerrar = () => {
    setOpen(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
      timerRef.current = setTimeout(cerrar, 5000);
    } else {
      dialogRef.current?.close();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [open]);

  const handleSolicitar = () => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setOpen(true);
      } else {
        setError(result.message ?? "No fue posible registrar la solicitud.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleSolicitar}
        disabled={isPending}
        className="h-12 w-full rounded-xl bg-gradient-to-r from-primary to-primary-dark text-sm font-semibold text-white shadow-md shadow-primary/20 transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:shadow-lg active:scale-[0.98] disabled:opacity-50 sm:w-auto sm:px-8"
      >
        {isPending ? "Enviando…" : "Solicitar Certificado"}
      </button>

      {error && (
        <p className="mt-2 text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      )}

      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <dialog
        ref={dialogRef}
        className="fixed inset-0 z-50 m-auto max-w-md rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl backdrop:bg-black/50 dark:border-gray-700 dark:bg-gray-900"
        onCancel={cerrar}
        onClick={(e) => { if (e.target === dialogRef.current) cerrar(); }}
        onKeyDown={(e) => { if (e.key === "Escape") cerrar(); }}
      >
        <div className="relative px-6 py-8 text-center sm:px-8 sm:py-10">
          {/* Boton X grande */}
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar"
            className="absolute right-3 top-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <X className="h-7 w-7" strokeWidth={2.5} />
          </button>

          {/* Icono de exito */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>

          <h2 className="mt-5 text-lg font-bold text-text-primary dark:text-white">
            Solicitud Registrada
          </h2>
          <p className="mt-3 text-base text-text-secondary dark:text-gray-400">
            {mensaje}
          </p>

          {/* Barra de progreso auto-cierre */}
          <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-primary transition-none"
              style={{ animation: "shrink-bar 5s linear forwards" }}
            />
          </div>
          <p className="mt-2 text-xs text-text-muted dark:text-gray-500">
            Se cerrará automáticamente en unos segundos.
          </p>
        </div>

        <style>{`
          @keyframes shrink-bar {
            from { width: 100%; }
            to { width: 0%; }
          }
        `}</style>
      </dialog>
    </>
  );
}
