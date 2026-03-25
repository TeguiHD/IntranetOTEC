"use client";

import { useEffect, useRef, useState } from "react";

import { CreditCard, User } from "lucide-react";

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

  // Sync props → state when parent changes (e.g. server pre-fill)
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
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#7B2FBE] to-[#5B1F8E] p-5 text-white shadow-xl shadow-purple-900/30">
      {/* Decorative circles */}
      <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5" />
      <div aria-hidden className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-[#F5A623]/10" />

      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/60">
            Club de Beneficios
          </p>
          <p className="mt-0.5 text-sm font-bold tracking-wide text-[#F5A623]">
            Impulsate &amp; Emprende
          </p>
        </div>
        <CreditCard className="h-8 w-8 text-white/40" />
      </div>

      {/* RUT field */}
      <div className="relative z-10 mt-5">
        {editable ? (
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-widest text-white/60">
              RUT / Credencial
            </label>
            <input
              name="rut_beneficio"
              value={rutInput}
              onChange={(e) => handleRutChange(e.target.value)}
              placeholder="12.345.678-5"
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-mono text-white placeholder:text-white/40 focus:border-[#F5A623] focus:outline-none focus:ring-2 focus:ring-[#F5A623]/30"
            />
          </div>
        ) : (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/60">RUT</p>
            <p className="mt-0.5 font-mono text-lg font-bold tracking-wider text-white">
              {displayRut}
            </p>
          </div>
        )}
      </div>

      {/* Nombre */}
      <div className="relative z-10 mt-4 flex items-end justify-between">
        <div>
          {editable && loading ? (
            <p className="text-xs text-white/60 animate-pulse">Buscando…</p>
          ) : null}
          <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Titular</p>
          {editable ? (
            <div className="mt-0.5 flex items-center gap-2">
              <User className="h-4 w-4 text-white/40" />
              <p className="text-sm font-semibold text-white">
                {displayNombre}
              </p>
            </div>
          ) : (
            <p className="mt-0.5 text-sm font-semibold text-white">{displayNombre}</p>
          )}
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F5A623]/20">
          <div className="h-4 w-4 rounded-full bg-[#F5A623]/60" />
        </div>
      </div>

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
