export const CERTIFICADO_CODIGO_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CONTROL_CHARS_REGEX = /[\u0000-\u001f\u007f]/g;
const TAG_CHARS_REGEX = /[<>]/g;
const MAX_CERT_TEXT_LENGTH = 220;

export type CertificadoSnapshot = {
  alumnoNombre: string | null;
  alumnoApellido: string | null;
  alumnoRut: string | null;
  asignaturaId: string | null;
  fechaEmision: string | null;
};

const EMPTY_SNAPSHOT: CertificadoSnapshot = {
  alumnoNombre: null,
  alumnoApellido: null,
  alumnoRut: null,
  asignaturaId: null,
  fechaEmision: null,
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

export const sanitizeCertificadoText = (
  value: unknown,
  maxLength = MAX_CERT_TEXT_LENGTH,
): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value
    .replace(CONTROL_CHARS_REGEX, "")
    .replace(TAG_CHARS_REGEX, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return null;
  }

  return cleaned.slice(0, maxLength);
};

export const isCodigoCertificadoValido = (codigo: string): boolean => {
  const normalized = sanitizeCertificadoText(codigo, 64);

  if (!normalized) {
    return false;
  }

  return CERTIFICADO_CODIGO_REGEX.test(normalized);
};

export const coerceCertificadoSnapshot = (value: unknown): CertificadoSnapshot => {
  if (!isPlainObject(value)) {
    return EMPTY_SNAPSHOT;
  }

  return {
    alumnoNombre: sanitizeCertificadoText(value.alumnoNombre, 120),
    alumnoApellido: sanitizeCertificadoText(value.alumnoApellido, 120),
    alumnoRut: sanitizeCertificadoText(value.alumnoRut, 32),
    asignaturaId: sanitizeCertificadoText(value.asignaturaId, 64),
    fechaEmision: sanitizeCertificadoText(value.fechaEmision, 64),
  };
};
