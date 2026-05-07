"use client";

import { useMemo, useState } from "react";

import { Search, UserCog, X } from "lucide-react";

type DocenteOption = {
  id: string;
  nombre: string;
};

type DocenteFilterComboboxProps = {
  docentes: DocenteOption[];
  selectedDocenteId: string;
};

export function DocenteFilterCombobox({
  docentes,
  selectedDocenteId,
}: DocenteFilterComboboxProps) {
  const selectedDocente = docentes.find((docente) => docente.id === selectedDocenteId) ?? null;
  const [selected, setSelected] = useState<DocenteOption | null>(selectedDocente);
  const [query, setQuery] = useState(selectedDocente?.nombre ?? "");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return docentes;
    }

    return docentes.filter((docente) =>
      docente.nombre.toLowerCase().includes(normalized),
    );
  }, [docentes, query]);

  const handleSelect = (docente: DocenteOption | null) => {
    setSelected(docente);
    setQuery(docente?.nombre ?? "");
    setOpen(false);
  };

  return (
    <div className="space-y-1.5">
      <label
        htmlFor="agenda-docente"
        className="block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400"
      >
        Docente
      </label>
      <input type="hidden" name="docenteId" value={selected?.id ?? ""} />
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
          <input
            id="agenda-docente"
            type="text"
            inputMode="search"
            autoComplete="off"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelected(null);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Todos los docentes"
            className="h-11 w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-10 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
          {selected ? (
            <button
              type="button"
              aria-label="Quitar docente"
              onMouseDown={(event) => {
                event.preventDefault();
                handleSelect(null);
              }}
              className="absolute right-3 inline-flex h-6 w-6 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-gray-100 hover:text-text-primary dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <UserCog className="pointer-events-none absolute right-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
          )}
        </div>

        {open ? (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <button
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                handleSelect(null);
              }}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-text-primary transition-colors hover:bg-primary/5 dark:text-gray-100 dark:hover:bg-primary/10"
            >
              Todos los docentes
              {!selected ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
                  Activo
                </span>
              ) : null}
            </button>
            <div className="max-h-56 overflow-y-auto border-t border-gray-100 py-1 dark:border-gray-700">
              {filtered.length > 0 ? (
                filtered.map((docente) => (
                  <button
                    key={docente.id}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      handleSelect(docente);
                    }}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                      selected?.id === docente.id
                        ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light"
                        : "text-text-primary hover:bg-primary/5 dark:text-gray-100 dark:hover:bg-primary/10"
                    }`}
                  >
                    <span className="truncate">{docente.nombre}</span>
                    {selected?.id === docente.id ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
                        Activo
                      </span>
                    ) : null}
                  </button>
                ))
              ) : (
                <p className="px-4 py-3 text-sm text-text-secondary dark:text-gray-400">
                  Sin docentes para "{query}"
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
