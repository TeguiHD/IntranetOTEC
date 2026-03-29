"use client";

import { useCallback, useRef, useState } from "react";

import { Loader2, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { buscarAsignaturasAdminAction, type AsignaturaBusqueda } from "@/actions/asignaturas";

type Props = {
  defaultAsignatura?: AsignaturaBusqueda | null;
};

const formatLabel = (a: AsignaturaBusqueda) =>
  a.codigo ? `${a.nombre} (${a.codigo})` : a.nombre;

export function EncuestasBuilderFiltro({ defaultAsignatura }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultAsignatura ? formatLabel(defaultAsignatura) : "");
  const [results, setResults] = useState<AsignaturaBusqueda[]>([]);
  const [selected, setSelected] = useState<AsignaturaBusqueda | null>(defaultAsignatura ?? null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((value: string) => {
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
        setResults(data);
        setOpen(data.length > 0);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  const handleInput = (value: string) => {
    setQuery(value);
    if (selected) setSelected(null);
    search(value);
  };

  const handleSelect = (asignatura: AsignaturaBusqueda) => {
    setSelected(asignatura);
    setQuery(formatLabel(asignatura));
    setResults([]);
    setOpen(false);
    router.push(`/admin/encuestas-builder?asignaturaId=${asignatura.id}`);
  };

  const handleClear = () => {
    setSelected(null);
    setQuery("");
    setResults([]);
    setOpen(false);
    router.push("/admin/encuestas-builder");
  };

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
      <label className="block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
        Asignatura
      </label>
      <p className="mb-3 mt-0.5 text-xs text-text-muted dark:text-gray-500">
        Busca por nombre o código — funciona con miles de cursos.
      </p>

      <div className="relative">
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-text-secondary dark:text-gray-400" />
          <input
            type="text"
            inputMode="text"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Escribe el nombre o código del curso…"
            autoComplete="off"
            className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-10 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
          <div className="absolute right-3">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : selected ? (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Limpiar selección"
                className="flex h-6 w-6 items-center justify-center rounded-full text-text-secondary transition-colors hover:text-text-primary dark:text-gray-400 dark:hover:text-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        {open && results.length > 0 && (
          <ul
            role="listbox"
            className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-800"
          >
            {results.map((a) => (
              <li key={a.id} role="option" aria-selected={selected?.id === a.id}>
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

      {selected && (
        <p className="mt-2 text-xs font-medium text-primary dark:text-primary-light">
          ✓ {formatLabel(selected)}
        </p>
      )}
      {!selected && query.length >= 2 && !loading && results.length === 0 && (
        <p className="mt-2 text-xs text-text-secondary dark:text-gray-400">
          Sin resultados para «{query}»
        </p>
      )}
      {!selected && query.length < 2 && (
        <p className="mt-2 text-xs text-text-muted dark:text-gray-500">
          Escribe al menos 2 caracteres para buscar.
        </p>
      )}
    </div>
  );
}
