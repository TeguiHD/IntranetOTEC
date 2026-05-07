"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";

type Option = { id: string; label: string };

type SearchSelectProps = {
  name: string;
  options: Option[];
  defaultValue?: string;
  placeholder?: string;
  allLabel?: string;
};

export function SearchSelect({
  name,
  options,
  defaultValue = "",
  placeholder = "Buscar...",
  allLabel = "Todos",
}: SearchSelectProps) {
  const allOption: Option = { id: "", label: allLabel };
  const allOptions = [allOption, ...options];

  const current = allOptions.find((o) => o.id === defaultValue) ?? allOption;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Option>(current);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [open]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function pick(option: Option) {
    setSelected(option);
    setOpen(false);
    // Auto-submit the parent form
    const form = containerRef.current?.closest("form");
    if (form) {
      // pequeño timeout para que el hidden input se actualice en el DOM
      setTimeout(() => form.requestSubmit(), 0);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* hidden input that submits the value */}
      <input type="hidden" name={name} value={selected.id} />

      {/* trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 min-w-[180px] max-w-[280px] items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 pr-9 text-sm text-text-primary transition-colors hover:border-primary/40 focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
      >
        <span className="flex-1 truncate text-left">
          {selected.id === "" ? (
            <span className="text-text-secondary dark:text-gray-400">{selected.label}</span>
          ) : (
            selected.label
          )}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-text-secondary transition-transform dark:text-gray-400 ${open ? "rotate-180" : ""}`} />
      </button>
      {selected.id !== "" && (
        <button
          type="button"
          aria-label="Limpiar selección"
          onClick={() => pick(allOption)}
          className="absolute right-8 top-1/2 z-10 -translate-y-1/2 rounded-full p-0.5 text-text-secondary hover:bg-gray-100 hover:text-text-primary dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {/* dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {/* search input */}
          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2 dark:border-gray-700">
            <Search className="h-4 w-4 shrink-0 text-text-secondary dark:text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              inputMode="text" onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-transparent text-sm text-text-primary placeholder:text-gray-400 focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
            {query && (
              <button
                type="button"
                aria-label="Limpiar búsqueda"
                onClick={() => setQuery("")}
                className="shrink-0 text-text-secondary hover:text-text-primary dark:text-gray-400"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* options list */}
          <ul className="max-h-64 overflow-y-auto py-1">
            {/* "todos" option always visible */}
            <li>
              <button
                type="button"
                onClick={() => pick(allOption)}
                className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-primary/5 dark:hover:bg-primary/10 ${
                  selected.id === "" ? "font-semibold text-primary dark:text-primary-light" : "text-text-secondary dark:text-gray-400"
                }`}
              >
                {allLabel}
              </button>
            </li>

            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-center text-xs text-text-secondary dark:text-gray-500">
                Sin resultados para «{query}»
              </li>
            ) : (
              filtered.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => pick(o)}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-primary/5 dark:hover:bg-primary/10 ${
                      selected.id === o.id ? "font-semibold text-primary dark:text-primary-light" : "text-text-primary dark:text-gray-100"
                    }`}
                  >
                    {o.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
