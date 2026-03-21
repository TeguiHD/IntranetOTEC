"use client";

import Link from "next/link";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function RolesError({ error, reset }: ErrorPageProps) {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center space-y-6 px-4 text-center">
      {/* Icon */}
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-danger/10 dark:bg-danger/15">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="1.5"
          className="h-10 w-10 text-danger"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            stroke="currentColor"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
      </div>

      {/* Heading */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-text-primary dark:text-white sm:text-3xl">
          Algo salió mal
        </h1>
        <p className="max-w-md text-sm text-text-secondary dark:text-gray-400">
          Ocurrió un error inesperado. Puedes intentar de nuevo o volver al inicio.
        </p>
      </div>

      {/* Dev-only error detail */}
      {process.env.NODE_ENV !== "production" && error?.message && (
        <div className="w-full max-w-xl rounded-xl border border-danger/20 bg-danger/5 p-4 text-left dark:border-danger/30 dark:bg-danger/10">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-danger">
            Detalle del error (solo en desarrollo)
          </p>
          <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs text-text-primary dark:text-gray-200">
            {error.message}
            {error.digest ? `\n\nDigest: ${error.digest}` : ""}
          </pre>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-gradient-to-r from-primary to-primary-dark px-6 py-3 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98]"
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-text-primary shadow-sm transition-all hover:border-primary/30 hover:shadow-md active:scale-[0.98] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-primary/40"
        >
          Volver al inicio
        </Link>
      </div>
    </section>
  );
}
