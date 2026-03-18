"use client";

import { useEffect, useRef, useState } from "react";

import { Search, XCircle } from "lucide-react";

type SearchInputProps = {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  /** Debounce delay in ms. Defaults to 300 */
  debounceMs?: number;
};

export function SearchInput({
  placeholder = "Buscar…",
  value,
  onChange,
  debounceMs = 300,
}: SearchInputProps) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setLocal(value);
  }, [value]);

  const handleChange = (next: string) => {
    setLocal(next);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(next), debounceMs);
  };

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
      <input
        type="search"
        value={local}
        onChange={(e) => handleChange(e.currentTarget.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-text-primary placeholder:text-gray-400 transition-shadow focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-primary-light dark:focus:ring-primary-light/20"
      />
      {local && (
        <button
          type="button"
          aria-label="Limpiar búsqueda"
          onClick={() => { setLocal(""); onChange(""); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-text-primary dark:text-gray-500 dark:hover:text-gray-300"
        >
          <XCircle className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
