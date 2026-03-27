"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { User } from "lucide-react";

import { esRutExtranjero, formatearRut, normalizarRut, validarRut } from "@/lib/rut";

type TarjetaBeneficioProps = {
  /** Si se provee, la tarjeta muestra datos fijos (modo lectura). */
  rut?: string;
  nombre?: string;
  apellido?: string;
  /** Si es true, muestra un input de RUT y permite buscar el nombre vía onLookup. */
  editable?: boolean;
  onLookup?: (rut: string) => Promise<{ nombre: string; apellido: string } | null>;
};

export function TarjetaBeneficio({
  rut: rutProp,
  nombre: nombreProp,
  apellido: apellidoProp,
  editable = false,
  onLookup,
}: TarjetaBeneficioProps) {
  const [rutInput, setRutInput] = useState(rutProp ?? "");
  const [nombre, setNombre] = useState(nombreProp ?? "");
  const [apellido, setApellido] = useState(apellidoProp ?? "");
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (rutProp) setRutInput(rutProp);
    if (nombreProp) setNombre(nombreProp);
    if (apellidoProp) setApellido(apellidoProp);
  }, [rutProp, nombreProp, apellidoProp]);

  const handleRutChange = (raw: string) => {
    const isForeign = esRutExtranjero(raw);
    const cleaned = isForeign ? raw.trim().toUpperCase() : normalizarRut(raw).slice(0, 9);
    const formatted = isForeign ? cleaned : cleaned.length <= 1 ? cleaned : formatearRut(cleaned);
    setRutInput(formatted);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!onLookup || !validarRut(isForeign ? cleaned : cleaned)) return;

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const result = await onLookup(isForeign ? cleaned : cleaned);
      setLoading(false);
      if (result) {
        setNombre(result.nombre);
        setApellido(result.apellido);
      }
    }, 500);
  };

  const displayRut = rutInput
    ? esRutExtranjero(rutInput)
      ? `Ext: ${rutInput.replace(/^EXT-/i, "")}`
      : rutInput
    : "-";

  const displayNombre = [nombre, apellido].filter(Boolean).join(" ") || "-";

  return (
    <div className="space-y-4">
      {/* Tarjeta principal — imagen amarilla */}
      <div className="relative overflow-hidden rounded-2xl shadow-lg shadow-yellow-500/20">
        <Image
          src="/beneficio-amarillo.jpg"
          alt="Club de Beneficios Impulsate"
          width={1275}
          height={810}
          className="h-auto w-full object-cover"
          priority
        />
        {/* Overlay con datos del titular */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-5 pb-4 pt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Titular</p>
              <p className="mt-0.5 text-base font-bold text-white drop-shadow">{displayNombre}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/70">RUT</p>
              <p className="mt-0.5 font-mono text-sm font-bold text-[#F5A623] drop-shadow">{displayRut}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Formulario editable */}
      {editable && (
        <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-widest text-text-secondary dark:text-gray-400">
              RUT / Credencial
            </label>
            <input
              name="rut_beneficio"
              value={rutInput}
              onChange={(e) => handleRutChange(e.target.value)}
              placeholder="12.345.678-5"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-mono text-text-primary placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-text-secondary dark:text-gray-400">
            <User className="h-4 w-4 flex-shrink-0" />
            {loading ? (
              <span className="animate-pulse">Buscando…</span>
            ) : (
              <span className="font-medium text-text-primary dark:text-white">{displayNombre}</span>
            )}
          </div>
        </div>
      )}

      {/* Hidden inputs for form submission */}
      {editable && (
        <>
          <input type="hidden" name="_beneficio_nombre" value={nombre} />
          <input type="hidden" name="_beneficio_apellido" value={apellido} />
        </>
      )}
    </div>
  );
}
