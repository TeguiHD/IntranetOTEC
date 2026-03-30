"use client";

import { useCallback, useRef, useState } from "react";

import { Loader2, Search, X } from "lucide-react";

import { buscarAsignaturasAdminAction, type AsignaturaBusqueda } from "@/actions/asignaturas";

type Props = {
  selected: AsignaturaBusqueda[];
  onChange: (selected: AsignaturaBusqueda[]) => void;
};

const inputClass =
  "h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-text-primary placeholder:text-gray-400 transition-shadow focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500";

export function AsignaturasMultiCombobox({ selected, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AsignaturaBusqueda[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (value.trim().length < 2) {
        setResults([]);
        setOpen(false);
        return;
      }
      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const data = await buscarAsignaturasAdminAction(value);
          const filtered = data.filter((a) => !selected.find((s) => s.id === a.id));
          setResults(filtered);
          setOpen(filtered.length > 0);
        } finally {
          setLoading(false);
        }
      }, 300);
    },
    [selected],
  );

  const handleSelect = (a: AsignaturaBusqueda) => {
    onChange([...selected, a]);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const handleRemove = (id: string) => {
    onChange(selected.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-2">
      {/* Selected pills */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary dark:bg-primary/20"
            >
              {a.nombre}
              {a.codigo && (
                <span className="text-primary/60">· {a.codigo}</span>
              )}
              <button
                type="button"
                onClick={() => handleRemove(a.id)}
                aria-label={`Quitar ${a.nombre}`}
                className="ml-0.5 rounded-full transition-colors hover:text-primary-dark"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-text-secondary dark:text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              search(e.target.value);
            }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder={
              selected.length === 0
                ? "Buscar y agregar asignaturas..."
                : "Agregar otra asignatura..."
            }
            autoComplete="off"
            className={inputClass}
          />
          {loading && (
            <Loader2 className="pointer-events-none absolute right-3.5 h-4 w-4 animate-spin text-primary" />
          )}
        </div>

        {open && results.length > 0 && (
          <ul
            role="listbox"
            className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-800"
          >
            {results.map((a) => (
              <li key={a.id} role="option" aria-selected={false}>
                <button
                  type="button"
                  onMouseDown={() => handleSelect(a)}
                  className="w-full px-4 py-2.5 text-left transition-colors hover:bg-primary/5 dark:hover:bg-primary/10"
                >
                  <p className="text-sm font-medium text-text-primary dark:text-gray-100">
                    {a.nombre}
                  </p>
                  {a.codigo && (
                    <p className="text-xs text-text-secondary dark:text-gray-400">
                      {a.codigo}
                    </p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected.length === 0 && query.length < 2 && (
        <p className="text-xs text-text-muted dark:text-gray-500">
          Escribe al menos 2 caracteres para buscar. Puedes agregar múltiples cursos.
        </p>
      )}
      {!loading && query.length >= 2 && results.length === 0 && open === false && (
        <p className="text-xs text-text-secondary dark:text-gray-400">
          Sin resultados para «{query}»
        </p>
      )}
      {selected.length > 1 && (
        <p className="text-xs font-medium text-primary dark:text-primary-light">
          Se creará 1 encuesta por cada asignatura seleccionada ({selected.length} en total).
        </p>
      )}
    </div>
  );
}
