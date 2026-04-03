"use client";

import { useEffect, useRef, useState } from "react";

import { ChevronDown, Search, X } from "lucide-react";

export type AsignaturaOption = {
  id: string;
  nombre: string;
  codigo?: string | null;
};

type Props = {
  options: AsignaturaOption[];
  defaultValue?: string | null;
  name?: string;
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  /** Si true, hacer submit del form padre al seleccionar */
  autoSubmit?: boolean;
};

export function AsignaturaFilterSelect({
  options,
  defaultValue,
  name = "asignaturaId",
  placeholder = "Buscar sección...",
  allowEmpty = false,
  emptyLabel = "Todas las secciones",
  autoSubmit = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>(defaultValue ?? (allowEmpty ? "" : (options[0]?.id ?? "")));
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.id === selectedId);
  const displayLabel = selectedId === ""
    ? emptyLabel
    : (selectedOption ? `${selectedOption.nombre}${selectedOption.codigo ? ` [${selectedOption.codigo}]` : ""}` : placeholder);

  const filtered = options.filter((o) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      o.nombre.toLowerCase().includes(q) ||
      (o.codigo ?? "").toLowerCase().includes(q)
    );
  });

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus search input when opened
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setOpen(false);
    setQuery("");

    // Update hidden input
    if (hiddenRef.current) hiddenRef.current.value = id;

    // Submit parent form
    if (autoSubmit) {
      const form = hiddenRef.current?.closest("form");
      if (form) {
        setTimeout(() => form.requestSubmit(), 0);
      }
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Hidden input for form submission */}
      <input ref={hiddenRef} type="hidden" name={name} value={selectedId} />

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 text-left text-sm text-text-primary transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
      >
        <span className="min-w-0 flex-1 truncate font-medium">{displayLabel}</span>
        <div className="flex flex-shrink-0 items-center gap-1">
          {allowEmpty && selectedId !== "" && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); handleSelect(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); handleSelect(""); } }}
              className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
              aria-label="Limpiar selección"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
          {/* Search input */}
          <div className="border-b border-gray-100 p-2 dark:border-gray-800">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filtrar por nombre o código..."
                className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-3 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Options list */}
          <ul className="max-h-60 overflow-y-auto py-1" role="listbox">
            {allowEmpty && (
              <li
                role="option"
                aria-selected={selectedId === ""}
                onClick={() => handleSelect("")}
                className={`flex cursor-pointer items-center px-3 py-2.5 text-sm transition-colors hover:bg-primary/8 dark:hover:bg-primary/15 ${
                  selectedId === "" ? "bg-primary/10 font-semibold text-primary dark:text-primary-light" : "text-text-secondary dark:text-gray-400"
                }`}
              >
                {emptyLabel}
              </li>
            )}
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-text-muted dark:text-gray-500">
                Sin resultados para &ldquo;{query}&rdquo;
              </li>
            ) : (
              filtered.map((o) => (
                <li
                  key={o.id}
                  role="option"
                  aria-selected={selectedId === o.id}
                  onClick={() => handleSelect(o.id)}
                  className={`flex cursor-pointer flex-col px-3 py-2 transition-colors hover:bg-primary/8 dark:hover:bg-primary/15 ${
                    selectedId === o.id ? "bg-primary/10" : ""
                  }`}
                >
                  <span className={`text-sm font-medium leading-snug ${selectedId === o.id ? "text-primary dark:text-primary-light" : "text-text-primary dark:text-gray-100"}`}>
                    {o.nombre}
                  </span>
                  {o.codigo && (
                    <span className="text-[11px] text-text-muted dark:text-gray-500">{o.codigo}</span>
                  )}
                </li>
              ))
            )}
          </ul>

          {/* Count */}
          <div className="border-t border-gray-100 px-3 py-1.5 dark:border-gray-800">
            <p className="text-[10px] text-text-muted dark:text-gray-500">
              {filtered.length} de {options.length} secciones
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
