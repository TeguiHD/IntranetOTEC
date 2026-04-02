export function esRutExtranjero(value: string): boolean {
  return value.trim().toUpperCase().startsWith("EXT-");
}

export function normalizarRut(value: string): string {
  const trimmed = value.trim();
  if (esRutExtranjero(trimmed)) {
    return trimmed.toUpperCase();
  }
  return trimmed.replace(/[^0-9kK]/g, "").toUpperCase();
}

export function formatearRut(value: string): string {
  const cleaned = normalizarRut(value);

  if (esRutExtranjero(cleaned)) {
    return cleaned;
  }

  if (cleaned.length <= 1) {
    return cleaned;
  }

  const dv = cleaned.slice(-1);
  const body = cleaned
    .slice(0, -1)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return `${body}-${dv}`;
}

export function formatearIdentificador(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return "-";
  }

  if (esRutExtranjero(trimmed)) {
    return `Ext: ${trimmed.replace(/^EXT-/i, "")}`;
  }

  return formatearRut(trimmed);
}

export function validarRutExtranjero(value: string): boolean {
  const trimmed = value.trim().toUpperCase();
  if (!trimmed.startsWith("EXT-")) return false;
  const body = trimmed.slice(4);
  return body.length >= 3 && body.length <= 20;
}

export function validarRut(value: string): boolean {
  if (esRutExtranjero(value)) {
    return validarRutExtranjero(value);
  }

  const cleaned = normalizarRut(value);

  if (cleaned.length < 8 || cleaned.length > 9) {
    return false;
  }

  const dv = cleaned.slice(-1);
  const body = cleaned.slice(0, -1);

  if (!/^\d+$/.test(body)) {
    return false;
  }

  let sum = 0;
  let multiplier = 2;

  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * multiplier;
    multiplier = multiplier < 7 ? multiplier + 1 : 2;
  }

  const expected = 11 - (sum % 11);
  const expectedDv =
    expected === 11 ? "0" : expected === 10 ? "K" : String(expected);

  return dv === expectedDv;
}

/**
 * Deriva el PIN predeterminado de 4 digitos para un alumno.
 *
 * - RUT chileno "12345678-5": cuerpo = "12345678", ultimos 4 = "5678"
 * - Credencial extranjera "EXT-A12345678": sin prefijo = "A12345678",
 *   ultimos 4 digitos del string = "5678"
 *
 * Si no hay suficientes caracteres, rellena con ceros a la izquierda.
 */
export function derivarPinPredeterminado(identificadorLogin: string): string {
  const isForeign = esRutExtranjero(identificadorLogin);

  if (isForeign) {
    // Quitar prefijo EXT-
    const body = identificadorLogin.replace(/^EXT-/i, "");
    const digits = body.replace(/[^0-9]/g, "");
    return digits.length >= 4
      ? digits.slice(-4)
      : digits.padStart(4, "0");
  }

  // RUT chileno: normalizar y tomar el cuerpo (sin digito verificador)
  const cleaned = normalizarRut(identificadorLogin);
  const rutBody = cleaned.length >= 2 ? cleaned.slice(0, -1) : cleaned;
  return rutBody.length >= 4
    ? rutBody.slice(-4)
    : rutBody.padStart(4, "0");
}
