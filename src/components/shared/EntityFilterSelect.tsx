"use client";

import { useEffect, useRef, useState } from "react";

import { ChevronDown, Search, X } from "lucide-react";

export type EntityFilterOption = {
  id: string;
  label: string;
  description?: string | null;
  badge?: string | null;
};

type Props = {
  options: EntityFilterOption[];
  defaultValue?: string | null;
  name: string;
  placeholder: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  autoSubmit?: boolean;
  countLabel?: string;
  allowClear?: boolean;
  clearLabel?: string;
};

export function EntityFilterSelect({
  options,
  defaultValue,
  name,
  placeholder,
  searchPlaceholder = "Buscar…",
  emptyLabel,
  autoSubmit = true,
  countLabel = "opciones",
  allowClear = false,
  clearLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>(defaultValue ?? "");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((option) => option.id === selectedId);
  const displayLabel = selectedOption?.label ?? emptyLabel ?? placeholder;

  const filtered = options.filter((option) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      option.label.toLowerCase().includes(q) ||
      (option.description ?? "").toLowerCase().includes(q) ||
      (option.badge ?? "").toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setOpen(false);
    setQuery("");
    if (hiddenRef.current) hiddenRef.current.value = id;

    if (autoSubmit) {
      const form = hiddenRef.current?.closest("form");
      setTimeout(() => form?.requestSubmit(), 0);
    }
  };

  return (
    <div ref={containerRef} className="relative min-w-0">
      <input ref={hiddenRef} type="hidden" name={name} value={selectedId} readOnly />
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 min-w-0 w-full items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 text-left text-sm text-text-primary transition-colors hover:bg-gray-50 focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1 truncate font-medium">{displayLabel}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
          <div className="border-b border-gray-100 p-2 dark:border-gray-800">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                inputMode="text" onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-8 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-1 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          <ul className="max-h-72 overflow-y-auto py-1" role="listbox">
            {allowClear && !query ? (
              <li
                role="option"
                aria-selected={selectedId === ""}
                onClick={() => handleSelect("")}
                className={`flex cursor-pointer items-center gap-2 border-b border-gray-100 px-3 py-2 text-xs uppercase tracking-wide text-text-muted transition-colors hover:bg-primary/8 dark:border-gray-800 dark:text-gray-500 dark:hover:bg-primary/15 ${
                  selectedId === "" ? "bg-primary/10 text-primary dark:text-primary-light" : ""
                }`}
              >
                <X className="h-3.5 w-3.5" />
                <span>{clearLabel ?? emptyLabel ?? "Sin selección"}</span>
              </li>
            ) : null}
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-text-muted dark:text-gray-500">
                Sin resultados para &ldquo;{query}&rdquo;
              </li>
            ) : (
              filtered.map((option) => (
                <li
                  key={option.id}
                  role="option"
                  aria-selected={selectedId === option.id}
                  onClick={() => handleSelect(option.id)}
                  className={`flex cursor-pointer items-start justify-between gap-3 px-3 py-2 transition-colors hover:bg-primary/8 dark:hover:bg-primary/15 ${
                    selectedId === option.id ? "bg-primary/10" : ""
                  }`}
                >
                  <span className="min-w-0">
                    <span className={`block truncate text-sm font-medium ${selectedId === option.id ? "text-primary dark:text-primary-light" : "text-text-primary dark:text-gray-100"}`}>
                      {option.label}
                    </span>
                    {option.description ? (
                      <span className="block truncate text-[11px] text-text-muted dark:text-gray-500">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                  {option.badge ? (
                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      {option.badge}
                    </span>
                  ) : null}
                </li>
              ))
            )}
          </ul>

          <div className="border-t border-gray-100 px-3 py-1.5 dark:border-gray-800">
            <p className="text-[10px] text-text-muted dark:text-gray-500">
              {filtered.length} de {options.length} {countLabel}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
