"use client";

import { FormEvent, useEffect, useRef, useState, useTransition } from "react";

import Link from "next/link";
import { ClipboardList, IdCard, Loader2, Search, UserRound, X } from "lucide-react";

import {
  buscarPersonasAdminAction,
  type PersonaBusquedaAdmin,
} from "@/actions/usuarios";
import { formatearIdentificador } from "@/lib/rut";

const roleLabel = (role: "alumno" | "docente"): string =>
  role === "alumno" ? "Alumno" : "Docente";

export function AdminRutLookup() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PersonaBusquedaAdmin[]>([]);
  const [searched, setSearched] = useState(false);
  const [isPending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const keyHandler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener("keydown", keyHandler);

    return () => document.removeEventListener("keydown", keyHandler);
  }, []);

  useEffect(() => {
    if (!open) return;

    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 80);
    const handler = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const keyHandler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [open]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = query.trim();
    if (value.length < 2 || isPending) return;

    startTransition(async () => {
      const data = await buscarPersonasAdminAction(value);
      setResults(data);
      setSearched(true);
    });
  };

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        aria-label="Buscar persona"
        title="Buscar persona"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-text-primary transition-colors hover:bg-primary/10 active:scale-95 dark:text-gray-100 dark:hover:bg-primary/20"
      >
        <Search className="h-5 w-5" />
      </button>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] md:hidden"
          onClick={() => setOpen(false)}
          aria-label="Cerrar búsqueda global"
        />
      )}

      {open && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[82dvh] flex-col rounded-t-2xl border-t border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 md:absolute md:bottom-auto md:left-auto md:right-0 md:top-[calc(100%+8px)] md:w-[25rem] md:rounded-2xl md:border">
          <div className="flex justify-center pt-2.5 md:hidden">
            <div className="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
          </div>

          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <IdCard className="h-4 w-4 text-primary dark:text-primary-light" />
              <span className="text-sm font-semibold text-text-primary dark:text-white">
                Búsqueda global
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar búsqueda global"
              className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="overflow-y-auto p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                ref={inputRef}
                value={query}
                inputMode="text"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSearched(false);
                }}
                placeholder="RUT, nombre o correo"
                className="h-11 min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 text-sm text-text-primary transition-[border-color,box-shadow] placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
              <button
                type="submit"
                disabled={query.trim().length < 2 || isPending}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
              </button>
            </form>

            {searched && results.length === 0 && !isPending ? (
              <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-text-secondary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                Sin resultados para &quot;{query.trim()}&quot;.
              </div>
            ) : null}

            {results.length > 0 && (
              <div className="mt-4 space-y-3">
                {results.map((persona) => {
                  const href =
                    persona.rol === "alumno"
                      ? `/admin/alumnos?q=${encodeURIComponent(persona.rut ?? query.trim())}`
                      : `/admin/docentes?q=${encodeURIComponent(persona.rut ?? query.trim())}`;

                  return (
                    <Link
                      key={persona.id}
                      href={href}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white px-3 py-3 transition-colors hover:border-primary/30 hover:bg-primary/5 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary/40 dark:hover:bg-primary/10"
                    >
                      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light">
                        <UserRound className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-text-primary dark:text-white">
                          {persona.nombre} {persona.apellido}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-text-secondary dark:text-gray-400">
                          {formatearIdentificador(persona.rut)} · {persona.email ?? "Sin correo"}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
                          {roleLabel(persona.rol)}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            persona.activo
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                          }`}
                        >
                          {persona.activo ? "Activo" : "Inactivo"}
                        </span>
                      </span>
                    </Link>
                  );
                })}

                <Link
                  href={`/admin/alumnos?q=${encodeURIComponent(query.trim())}`}
                  onClick={() => setOpen(false)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/25 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 dark:border-primary/40 dark:text-primary-light"
                >
                  <ClipboardList className="h-4 w-4" />
                  Ver coincidencias en Alumnos
                </Link>
                <Link
                  href={`/admin/docentes?q=${encodeURIComponent(query.trim())}`}
                  onClick={() => setOpen(false)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
                >
                  <ClipboardList className="h-4 w-4" />
                  Ver coincidencias en Docentes
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
