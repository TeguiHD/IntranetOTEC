"use client";

import { useMemo, useState } from "react";

import { esRutExtranjero, formatearRut, normalizarRut, validarRut } from "@/lib/rut";

type RutInputProps = {
  id: string;
  name?: string;
  value: string;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  allowForeign?: boolean;
  onChange: (nextValue: string) => void;
  onValidityChange?: (isValid: boolean) => void;
};

export function RutInput({
  id,
  name,
  value,
  disabled,
  required,
  autoFocus,
  allowForeign,
  onChange,
  onValidityChange,
}: RutInputProps) {
  const [foreignMode, setForeignMode] = useState(false);
  const [touched, setTouched] = useState(false);

  const isForeign = foreignMode || esRutExtranjero(value);
  const rutLimpio = useMemo(() => normalizarRut(value), [value]);
  const hasValue = isForeign ? value.trim().length > 0 : rutLimpio.length > 0;
  const isValid = hasValue && validarRut(isForeign ? value : rutLimpio);
  const showError = touched && hasValue && !isValid;

  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const handleChange = (nextRawValue: string) => {
    if (isForeign) {
      const upper = nextRawValue.toUpperCase();
      const sanitized = upper.startsWith("EXT-") ? upper : `EXT-${upper.replace(/^EXT-?/i, "")}`;
      onChange(sanitized);
      onValidityChange?.(validarRut(sanitized));
      return;
    }
    const cleaned = normalizarRut(nextRawValue).slice(0, 9);
    const formatted = cleaned.length <= 1 ? cleaned : formatearRut(cleaned);

    onChange(formatted);
    onValidityChange?.(cleaned.length > 0 && validarRut(cleaned));
  };

  const handleToggleForeign = () => {
    const next = !foreignMode;
    setForeignMode(next);
    onChange(next ? "EXT-" : "");
    onValidityChange?.(false);
  };

  const statusClass = showError
    ? "border-danger dark:border-red-500 focus:ring-danger"
    : isValid
      ? "border-success dark:border-emerald-500 focus:ring-success"
      : "border-gray-300 dark:border-gray-600 focus:ring-primary";

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-text-primary dark:text-gray-100">
        {isForeign ? "Identificador Extranjero" : "RUT"}
      </label>
      <input
        id={id}
        name={name}
        value={value}
        autoFocus={autoFocus}
        required={required}
        disabled={disabled}
        inputMode={isForeign ? "text" : "numeric"}
        autoComplete="username"
        pattern={isForeign ? undefined : "[0-9kK.\\-]*"}
        onBlur={() => setTouched(true)}
        onChange={(event) => handleChange(event.currentTarget.value)}
        placeholder={isForeign ? "EXT-12345" : "12.345.678-5"}
        aria-invalid={showError}
        aria-describedby={showError ? `${hintId} ${errorId}` : hintId}
        className={`w-full rounded border bg-white px-3 py-2 text-sm text-text-primary placeholder:text-gray-500 focus:ring-2 focus:ring-offset-0 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-400 ${statusClass}`}
      />
      <p id={hintId} className="text-xs text-text-secondary dark:text-gray-300">
        {isForeign
          ? "Ingresa tu identificador extranjero (ej: EXT-12345)."
          : "Ingresa tu RUT con o sin puntos y guión."}
      </p>
      {allowForeign && (
        <button
          type="button"
          onClick={handleToggleForeign}
          className="text-xs font-medium text-primary underline hover:opacity-80 dark:text-primary-light"
        >
          {isForeign ? "Tengo RUT chileno" : "Soy estudiante extranjero"}
        </button>
      )}
      {showError ? (
        <p id={errorId} className="text-xs font-medium text-danger dark:text-red-300" role="alert">
          {isForeign
            ? "Identificador inválido. Debe tener formato EXT- seguido de al menos 3 caracteres."
            : "RUT inválido. Revisa el dígito verificador."}
        </p>
      ) : null}
    </div>
  );
}