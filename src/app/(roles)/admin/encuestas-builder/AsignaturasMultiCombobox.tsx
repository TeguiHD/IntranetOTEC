"use client";

import { useCallback, useRef, useState } from "react";

import { Loader2, Plus, Search, X } from "lucide-react";

import { buscarAsignaturasAdminAction, type AsignaturaBusqueda } from "@/actions/asignaturas";

type Props = {
  selected: AsignaturaBusqueda[];
  onChange: (selected: AsignaturaBusqueda[]) => void;
};

const inputClass =
  "h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-text-primary placeholder:text-gray-400 transition-shadow focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500";

const TURNO_LABELS: Record<string, string> = {
  manana: "Mañana",
  tarde: "Tarde",
  vespertino: "Vespertino",
};

const ESTADO_LABELS: Record<string, string> = {
  borrador: "Borrador",
  activo: "Activa",
  finalizado: "Finalizada",
  archivado: "Archivada",
};

export function AsignaturasMultiCombobox({ selected, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AsignaturaBusqueda[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (value.trim().length < 2) {
        setResults([]);
        setSearched(false);
        return;
      }
      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const data = await buscarAsignaturasAdminAction(value, {
            includeFinalizadas: true,
            limit: 50,
          });
          const filtered = data.filter((a) => !selected.find((s) => s.id === a.id));
          setResults(filtered);
          setSearched(true);
        } finally {
          setLoading(false);
        }
      }, 300);
    },
    [selected],
  );

  const handleSelect = (a: AsignaturaBusqueda) => {
    if (selected.some((s) => s.id === a.id)) {
      return;
    }

    onChange([...selected, a]);
    setQuery("");
    setResults([]);
    setSearched(false);
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
            placeholder={
              selected.length === 0
                ? "Buscar por sección, código, curso o período..."
                : "Agregar otra sección..."
            }
            autoComplete="off"
            className={inputClass}
          />
          {loading && (
            <Loader2 className="pointer-events-none absolute right-3.5 h-4 w-4 animate-spin text-primary" />
          )}
        </div>
      </div>

      {query.length >= 2 && (
        <div className="rounded-xl border border-indigo-200/70 bg-white p-2 shadow-sm dark:border-indigo-900/40 dark:bg-gray-800/60">
          <div className="mb-1 flex items-center justify-between px-2 py-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
              Resultados
            </p>
            {!loading && searched && (
              <span className="text-[11px] text-text-muted dark:text-gray-500">
                {results.length} coincidencia{results.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {loading && (
            <div className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm text-text-secondary dark:text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Buscando secciones...
            </div>
          )}

          {!loading && results.length > 0 && (
            <ul role="listbox" className="max-h-72 space-y-1 overflow-y-auto">
              {results.map((a) => (
                <li key={a.id} role="option" aria-selected={false}>
                  <div className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2.5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 dark:border-gray-700/70 dark:hover:border-primary/30 dark:hover:bg-primary/10">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary dark:text-gray-100">
                        {a.nombre}
                      </p>
                      <p className="mt-0.5 text-xs text-text-secondary dark:text-gray-400">
                        {(a.codigo && `${a.codigo} · `) || ""}
                        {a.cursoNombre ?? "Curso sin nombre"}
                        {a.periodoCodigo ? ` · ${a.periodoCodigo}` : ""}
                        {a.turno ? ` · ${TURNO_LABELS[a.turno] ?? a.turno}` : ""}
                        {a.estado ? ` · ${ESTADO_LABELS[a.estado] ?? a.estado}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelect(a)}
                      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Agregar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!loading && searched && results.length === 0 && (
            <p className="rounded-lg px-3 py-3 text-xs text-text-secondary dark:text-gray-400">
              Sin resultados para «{query}».
            </p>
          )}
        </div>
      )}

      {selected.length === 0 && query.length < 2 && (
        <p className="text-xs text-text-muted dark:text-gray-500">
          Escribe al menos 2 caracteres para buscar. Puedes agregar múltiples secciones.
        </p>
      )}
      {selected.length > 1 && (
        <p className="text-xs font-medium text-primary dark:text-primary-light">
          Se creará 1 encuesta por cada sección seleccionada ({selected.length} en total).
        </p>
      )}
    </div>
  );
}
