"use client";

import { useEffect, useRef, useState } from "react";

import { Check, ChevronDown, Search, X } from "lucide-react";

type MatriculaOption = {
  id: string;
  alumnoNombre: string;
  alumnoApellido: string;
  asignaturaNombre: string;
};

type Props = {
  matriculas: MatriculaOption[];
  name?: string;
  required?: boolean;
};

export function MatriculaCombobox({ matriculas, name = "matriculaId", required }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<MatriculaOption | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
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

  const filtered = matriculas.filter((m) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const fullName = `${m.alumnoNombre} ${m.alumnoApellido}`.toLowerCase();
    return (
      fullName.includes(q) ||
      m.asignaturaNombre.toLowerCase().includes(q)
    );
  });

  const handleSelect = (m: MatriculaOption) => {
    setSelected(m);
    setQuery(`${m.alumnoNombre} ${m.alumnoApellido}`);
    setOpen(false);
  };

  const handleClear = () => {
    setSelected(null);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full min-w-[260px] sm:w-80">
      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={selected?.id ?? ""} required={required} />

      {/* Trigger input */}
      <div
        className="relative flex h-11 cursor-pointer items-center rounded-xl border border-gray-200 bg-white px-3 shadow-sm transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 dark:border-gray-700 dark:bg-gray-800"
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}
      >
        <Search className="mr-2 h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="Buscar alumno o asignatura…"
          className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500"
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
        />
        <div className="ml-1 flex items-center gap-1">
          {selected && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleClear(); }}
              className="rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Limpiar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </div>

      {/* Badge de seleccionado */}
      {selected && (
        <p className="mt-1 truncate text-xs text-emerald-600 dark:text-emerald-400">
          ✓ {selected.asignaturaNombre}
        </p>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 flex max-h-72 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-text-secondary dark:text-gray-400">
              Sin resultados para «{query}»
            </div>
          ) : (
            <>
              <div className="shrink-0 border-b border-gray-100 px-3 py-1.5 dark:border-gray-800">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary dark:text-gray-500">
                  {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
                </span>
              </div>
              <ul className="overflow-y-auto">
                {filtered.map((m) => {
                  const isSelected = selected?.id === m.id;
                  return (
                    <li
                      key={m.id}
                      onMouseDown={(e) => { e.preventDefault(); handleSelect(m); }}
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
      )}
    </div>
  );
}
