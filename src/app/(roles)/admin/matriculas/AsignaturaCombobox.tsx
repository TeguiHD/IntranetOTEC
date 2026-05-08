"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  buscarAsignaturasAdminAction,
  type AsignaturaBusqueda,
} from "@/actions/asignaturas";

type AsignaturaComboboxProps = {
  name: string;
  label?: string;
  required?: boolean;
  defaultAsignatura?: AsignaturaBusqueda | null;
};

const formatAsignaturaLabel = (asignatura: AsignaturaBusqueda): string =>
  asignatura.codigo ? `${asignatura.nombre} (${asignatura.codigo})` : asignatura.nombre;

export function AsignaturaCombobox({
  name,
  label = "Asignatura",
  required = false,
  defaultAsignatura,
}: AsignaturaComboboxProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AsignaturaBusqueda[]>([]);
  const [selected, setSelected] = useState<AsignaturaBusqueda | null>(
    defaultAsignatura ?? null,
  );
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!defaultAsignatura) {
      return;
    }

    setSelected(defaultAsignatura);
    setQuery(formatAsignaturaLabel(defaultAsignatura));
  }, [defaultAsignatura]);

  const search = useCallback((value: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);

      try {
        const data = await buscarAsignaturasAdminAction(value);
        setResults(data);
        setOpen(data.length > 0);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  const handleInput = (value: string) => {
    setQuery(value);

    if (selected) {
      setSelected(null);
    }

    search(value);
  };

  const handleSelect = (asignatura: AsignaturaBusqueda) => {
    setSelected(asignatura);
    setQuery(formatAsignaturaLabel(asignatura));
    setResults([]);
    setOpen(false);
  };

  const handleClear = () => {
    setSelected(null);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-text-primary dark:text-gray-200">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>

      <input type="hidden" name={name} value={selected?.id ?? ""} required={required} />

      <div className="relative">
        <div className="relative flex items-center">
          <input
            type="text"
            inputMode="text"
            required={required}
            aria-required={required}
            value={query}
            onChange={(event) => handleInput(event.target.value)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Busca por nombre o código..."
            autoComplete="off"
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-4 pr-10 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
          />

          <div className="absolute right-3 flex items-center">
            {loading ? (
              <svg
                className="h-4 w-4 animate-spin text-primary"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : selected ? (
              <button
                type="button"
                onClick={handleClear}
                className="flex h-6 w-6 items-center justify-center rounded-full text-text-secondary hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-100"
                aria-label="Limpiar selección"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            ) : (
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4 text-text-secondary dark:text-gray-400"
              >
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
        </div>

        {open && results.length > 0 ? (
          <ul
            role="listbox"
            className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
          >
            {results.map((asignatura) => (
              <li key={asignatura.id} role="option" aria-selected={selected?.id === asignatura.id}>
                <button
                  type="button"
                  onMouseDown={() => handleSelect(asignatura)}
                  className="w-full px-4 py-2.5 text-left hover:bg-primary/5 dark:hover:bg-primary/10"
                >
                  <p className="text-sm font-medium text-text-primary dark:text-gray-100">
                    {asignatura.nombre}
                  </p>
                  <p className="text-xs text-text-secondary dark:text-gray-400">
                    {asignatura.codigo ?? "Sin código"}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {selected ? (
        <p className="text-xs text-green-700 dark:text-green-400">
          Seleccionada: {formatAsignaturaLabel(selected)}
        </p>
      ) : null}
      {!selected && query.length >= 2 && !loading && results.length === 0 ? (
        <p className="text-xs text-text-secondary dark:text-gray-400">
          Sin resultados para «{query}»
        </p>
      ) : null}
    </div>
  );
}
