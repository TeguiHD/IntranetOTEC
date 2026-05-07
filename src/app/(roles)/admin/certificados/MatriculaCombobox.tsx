"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";

import {
  buscarMatriculasParaCertificadoAction,
  type MatriculaParaCertificado,
} from "@/actions/matriculas";

type MatriculaOption = {
  id: string;
  alumnoNombre: string;
  alumnoApellido: string;
  asignaturaNombre: string;
  alumnoRut?: string | null;
};

type Props = {
  name?: string;
  required?: boolean;
  defaultMatricula?: MatriculaOption | null;
};

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;

const fromAction = (m: MatriculaParaCertificado): MatriculaOption => ({
  id: m.id,
  alumnoNombre: m.alumnoNombre ?? "",
  alumnoApellido: m.alumnoApellido ?? "",
  asignaturaNombre: m.asignaturaNombre,
  alumnoRut: m.alumnoRut,
});

export function MatriculaCombobox({
  name = "matriculaId",
  required,
  defaultMatricula = null,
}: Props) {
  const [query, setQuery] = useState(
    defaultMatricula
      ? `${defaultMatricula.alumnoNombre} ${defaultMatricula.alumnoApellido}`.trim()
      : "",
  );
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<MatriculaOption | null>(defaultMatricula);
  const [results, setResults] = useState<MatriculaOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const runSearch = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const data = await buscarMatriculasParaCertificadoAction(trimmed);
      if (requestIdRef.current !== requestId) return;
      setResults(data.map(fromAction));
    } catch {
      if (requestIdRef.current !== requestId) return;
      setError("No fue posible buscar matriculas.");
      setResults([]);
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (selected || !open) {
      return;
    }

    debounceRef.current = setTimeout(() => {
      void runSearch(query);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selected, open, runSearch]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = (m: MatriculaOption) => {
    setSelected(m);
    setQuery(`${m.alumnoNombre} ${m.alumnoApellido}`.trim());
    setOpen(false);
    setResults([]);
  };

  const handleClear = () => {
    setSelected(null);
    setQuery("");
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  const trimmed = query.trim();
  const tooShort = !selected && open && trimmed.length > 0 && trimmed.length < MIN_QUERY_LENGTH;
  const showHint = !selected && open && trimmed.length === 0;

  return (
    <div ref={containerRef} className="relative w-full min-w-[260px] sm:w-80">
      <input type="hidden" name={name} value={selected?.id ?? ""} required={required} />

      <div className="relative flex h-11 items-center rounded-xl border border-gray-200 bg-white px-3 shadow-sm transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 dark:border-gray-700 dark:bg-gray-800">
        <Search className="mr-2 h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="Buscar alumno por nombre, RUT o asignatura…"
          className="flex-1 bg-transparent text-sm text-text-primary outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500"
          inputMode="search"
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        <div className="ml-1 flex items-center gap-1">
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" aria-hidden />
          ) : null}
          {selected ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Limpiar selección"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {selected ? (
        <p className="mt-1 truncate text-xs text-emerald-600 dark:text-emerald-400">
          ✓ {selected.asignaturaNombre}
        </p>
      ) : null}

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 flex max-h-72 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
          {showHint ? (
            <div className="px-3 py-3 text-xs text-text-secondary dark:text-gray-400">
              Escribe al menos {MIN_QUERY_LENGTH} caracteres para buscar.
            </div>
          ) : tooShort ? (
            <div className="px-3 py-3 text-xs text-text-secondary dark:text-gray-400">
              Escribe al menos {MIN_QUERY_LENGTH} caracteres.
            </div>
          ) : error ? (
            <div className="px-3 py-3 text-xs text-red-600 dark:text-red-400">{error}</div>
          ) : loading && results.length === 0 ? (
            <div className="flex items-center justify-center gap-2 px-3 py-4 text-xs text-text-secondary dark:text-gray-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Buscando…
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-text-secondary dark:text-gray-400">
              Sin resultados para «{trimmed}»
            </div>
          ) : (
            <>
              <div className="shrink-0 border-b border-gray-100 px-3 py-1.5 dark:border-gray-800">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary dark:text-gray-500">
                  {results.length} resultado{results.length !== 1 ? "s" : ""}
                </span>
              </div>
              <ul className="overflow-y-auto" role="listbox">
                {results.map((m) => {
                  const isSelected = selected?.id === m.id;
                  return (
                    <li
                      key={m.id}
                      role="option"
                      aria-selected={isSelected}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelect(m);
                      }}
                      className={`flex cursor-pointer items-start gap-3 px-3 py-2.5 transition-colors ${
                        isSelected
                          ? "bg-primary/10 dark:bg-primary/20"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      <Check
                        className={`mt-0.5 h-4 w-4 shrink-0 text-primary transition-opacity ${isSelected ? "opacity-100" : "opacity-0"}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-primary dark:text-white">
                          {m.alumnoNombre} {m.alumnoApellido}
                          {m.alumnoRut ? (
                            <span className="ml-2 text-xs font-normal text-text-secondary dark:text-gray-400">
                              {m.alumnoRut}
                            </span>
                          ) : null}
                        </p>
                        <p className="truncate text-xs text-text-secondary dark:text-gray-400">
                          {m.asignaturaNombre}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
