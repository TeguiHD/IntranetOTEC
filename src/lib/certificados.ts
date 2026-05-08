const CERTIFICADO_CODIGO_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CERTIFICADO_CODIGO_AR_REGEX = /^AR-\d{4}-[A-Z0-9]{8}$/;

export const CERTIFICADO_CODIGO_REGEX = CERTIFICADO_CODIGO_UUID_REGEX;

const CONTROL_CHARS_REGEX = /[\u0000-\u001f\u007f]/g;
const TAG_CHARS_REGEX = /[<>]/g;
const MAX_CERT_TEXT_LENGTH = 220;

export type CertificadoSnapshot = {
  alumnoNombre: string | null;
  alumnoApellido: string | null;
  alumnoRut: string | null;
  asignaturaId: string | null;
  fechaEmision: string | null;
  nombreCurso: string | null;
  nombreEstablecimiento: string | null;
  finalidad: string | null;
  codigoUnico: string | null;
  rutInstitucion: string | null;
  registrosInstitucionales: string | null;
  nombreFirmante: string | null;
  cargoFirmante: string | null;
};

const EMPTY_SNAPSHOT: CertificadoSnapshot = {
  alumnoNombre: null,
  alumnoApellido: null,
  alumnoRut: null,
  asignaturaId: null,
  fechaEmision: null,
  nombreCurso: null,
  nombreEstablecimiento: null,
  finalidad: null,
  codigoUnico: null,
  rutInstitucion: null,
  registrosInstitucionales: null,
  nombreFirmante: null,
  cargoFirmante: null,
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

  return (
    CERTIFICADO_CODIGO_UUID_REGEX.test(normalized) ||
    CERTIFICADO_CODIGO_AR_REGEX.test(normalized)
  );
};

export const generarCodigoCertificadoAR = (year: number = new Date().getFullYear()): string => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 8; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  let suffix = "";
  for (let i = 0; i < 8; i += 1) {
    suffix += alphabet[bytes[i] % alphabet.length];
  }

  return `AR-${year}-${suffix}`;
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
    nombreCurso: sanitizeCertificadoText(value.nombreCurso, 200),
    nombreEstablecimiento: sanitizeCertificadoText(value.nombreEstablecimiento, 200),
    finalidad: sanitizeCertificadoText(value.finalidad, 200),
    codigoUnico: sanitizeCertificadoText(value.codigoUnico, 64),
    rutInstitucion: sanitizeCertificadoText(value.rutInstitucion, 32),
    registrosInstitucionales: sanitizeCertificadoText(value.registrosInstitucionales, 300),
    nombreFirmante: sanitizeCertificadoText(value.nombreFirmante, 120),
    cargoFirmante: sanitizeCertificadoText(value.cargoFirmante, 120),
  };
};
