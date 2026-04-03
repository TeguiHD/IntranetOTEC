"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatearRut, esRutExtranjero } from "@/lib/rut";

type RutBuscadorProps = {
  defaultValue: string;
  periodoId?: string | null;
};

export function RutBuscador({ defaultValue, periodoId }: RutBuscadorProps) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue ? formatDisplay(defaultValue) : "");

  function formatDisplay(raw: string): string {
    if (!raw) return "";
    if (esRutExtranjero(raw)) return raw.toUpperCase();
    // Strip non-digit/K then format
    const digits = raw.replace(/[^0-9kK]/g, "");
    if (!digits) return raw;
    return formatearRut(digits);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (esRutExtranjero(raw)) {
      setValue(raw.toUpperCase());
      return;
    }
    // Keep only digits and K while typing
    const digits = raw.replace(/[^0-9kK]/g, "");
    setValue(formatearRut(digits));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = value.trim();
    if (!normalized) return;

    const params = new URLSearchParams();
    params.set("rut", normalized);
    if (periodoId) {
      params.set("periodoId", periodoId);
    }

    router.push(`/admin?${params.toString()}`, { scroll: false } as Parameters<typeof router.push>[1]);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="w-full space-y-1.5 sm:max-w-sm">
        <label htmlFor="buscar-rut" className="text-sm font-medium text-text-primary dark:text-gray-200">
          RUT
        </label>
        <input
          id="buscar-rut"
          name="rut"
          type="text"
          inputMode="text"
          required
          minLength={4}
          maxLength={24}
          value={value}
          onChange={handleChange}
          placeholder="12.345.678-5 o EXT-ABC123"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-primary-light dark:focus:ring-primary/30"
        />
      </div>
      <button
        type="submit"
        className="h-12 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-6 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-colors hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] sm:h-auto sm:py-3"
      >
        Buscar
      </button>
    </form>
  );
}
