import { z } from "zod";

import { normalizarRut, validarRut } from "@/lib/rut";
import { sanitizeVideoUrl } from "@/lib/sanitizePath";

const NAME_REGEX = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'.-]+$/;
const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,128}$/;

const trimAndCollapse = (value: string): string =>
  value
    .trim()
    .replace(/\s+/g, " ");

const optionalTrimmed = (maxLength: number) =>
  z
    .union([z.string(), z.undefined()])
    .transform((value) => {
      if (typeof value !== "string") {
        return undefined;
      }

      const trimmed = trimAndCollapse(value);
      return trimmed.length > 0 ? trimmed : undefined;
    })
    .refine(
      (value) => !value || value.length <= maxLength,
      `Debe tener como máximo ${maxLength} caracteres.`,
    );

const safeName = z
  .string()
  .transform(trimAndCollapse)
  .pipe(
    z
      .string()
      .min(2, "Debe tener al menos 2 caracteres.")
      .max(80, "Debe tener como máximo 80 caracteres.")
      .regex(NAME_REGEX, "Solo se permiten letras, espacios y signos básicos."),
  );

const rutValue = z
  .string()
  .trim()
  .refine(
    (value) => !/[<>]/.test(value),
    "RUT inválido.",
  )
  .transform((value) => normalizarRut(value))
  .refine((value) => validarRut(value), "RUT inválido.");

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD).")
  .refine(
    (value) => Number.isFinite(new Date(`${value}T00:00:00Z`).getTime()),
    "Fecha inválida.",
  );

const optionalTime = z
  .union([z.string(), z.undefined()])
  .transform((value) => {
    if (typeof value !== "string") {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  })
  .refine(
    (value) => !value || /^([01]\d|2[0-3]):[0-5]\d$/.test(value),
    "Hora inválida (HH:MM).",
  );

export const docenteInputSchema = z.object({
  nombre: safeName,
  apellido: safeName,
  rut: rutValue,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Correo inválido.")
    .max(180, "Correo demasiado largo."),
  password: z
    .string()
    .min(12, "La contraseña debe tener mínimo 12 caracteres.")
    .max(128, "La contraseña debe tener máximo 128 caracteres.")
    .regex(
      STRONG_PASSWORD_REGEX,
      "Debe incluir mayúsculas, minúsculas, números y símbolos.",
    ),
});

export const alumnoInputSchema = z.object({
  nombre: safeName,
  apellido: safeName,
  credencialTipo: z.enum(["rut", "extranjera"]),
  rut: z
    .union([z.string(), z.undefined()])
    .transform((value) => {
      if (typeof value !== "string") {
        return undefined;
      }

      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }),
  credencialExtranjera: z
    .union([z.string(), z.undefined()])
    .transform((value) => {
      if (typeof value !== "string") {
        return undefined;
      }

      const trimmed = trimAndCollapse(value).toUpperCase();
      return trimmed.length > 0 ? trimmed : undefined;
    })
    .refine(
      (value) => !value || /^[A-Z0-9-]{4,24}$/.test(value),
      "Credencial extranjera inválida.",
    ),
  email: z
    .union([z.string(), z.undefined()])
    .transform((value) => {
      if (typeof value !== "string") {
        return undefined;
      }

      const trimmed = value.trim().toLowerCase();
      return trimmed.length > 0 ? trimmed : undefined;
    })
    .refine(
      (value) => !value || z.string().email().safeParse(value).success,
      "Correo inválido.",
    )
    .refine(
      (value) => !value || value.length <= 180,
      "Correo demasiado largo.",
    ),
})
  .superRefine((value, context) => {
    if (value.credencialTipo === "rut") {
      if (!value.rut) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rut"],
          message: "Debes ingresar un RUT.",
        });
        return;
      }

      if (!rutValue.safeParse(value.rut).success) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rut"],
          message: "RUT inválido.",
        });
      }

      return;
    }

    if (!value.credencialExtranjera) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["credencialExtranjera"],
        message: "Debes ingresar la credencial extranjera.",
      });
    }
  });

export const asignaturaInputSchema = z.object({
  nombre: z
    .string()
    .transform(trimAndCollapse)
    .pipe(z.string().min(3, "Nombre muy corto.").max(120, "Nombre demasiado largo.")),
  descripcion: optionalTrimmed(500),
  codigo: z
    .union([z.string(), z.undefined()])
    .transform((value) => {
      if (typeof value !== "string") {
        return undefined;
      }

      const trimmed = value.trim().toUpperCase();
      return trimmed.length > 0 ? trimmed : undefined;
    })
    .refine(
      (value) => !value || /^[A-Z0-9-]{3,24}$/.test(value),
      "Código inválido (solo mayúsculas, números y guion).",
    ),
  fechaInicio: isoDate,
  duracionMeses: z.union([z.literal(2), z.literal(4), z.literal(6)]),
  maxAlumnos: z
    .number()
    .int("Debe ser un número entero.")
    .min(1, "Debe permitir al menos 1 alumno.")
    .max(300, "Máximo 300 alumnos."),
  docenteId: z
    .union([z.string().uuid(), z.undefined()])
    .optional(),
});

export const asignarDocenteInputSchema = z.object({
  asignaturaId: z.string().uuid("Asignatura inválida."),
  docenteId: z.string().uuid("Docente inválido."),
});

export const matricularAlumnoInputSchema = z.object({
  asignaturaId: z.string().uuid("Asignatura inválida."),
  alumnoId: z.string().uuid("Alumno inválido."),
  estadoPago: z.enum(["pendiente", "pagado", "mora", "becado"]),
  montoArancel: z
    .union([z.number(), z.undefined()])
    .optional()
    .refine(
      (value) => value === undefined || (Number.isFinite(value) && value >= 0),
      "Monto inválido.",
    ),
});

export const desmatricularInputSchema = z.object({
  matriculaId: z.string().uuid("Matrícula inválida."),
});

export const editarMatriculaInputSchema = z.object({
  matriculaId: z.string().uuid("Matrícula inválida."),
  estadoPago: z.enum(["pendiente", "pagado", "mora", "becado"]),
  montoArancel: z
    .union([z.number(), z.undefined()])
    .optional()
    .refine(
      (value) => value === undefined || (Number.isFinite(value) && value >= 0),
      "Monto inválido.",
    ),
});

const optionalTipoUrl = z
  .union([
    z.enum(["youtube", "vimeo", "drive", "directo"]),
    z.undefined(),
  ])
  .optional();

export const crearClaseInputSchema = z
  .object({
    asignaturaId: z.string().uuid("Asignatura inválida."),
    titulo: z
      .string()
      .transform(trimAndCollapse)
      .pipe(z.string().min(3, "Título muy corto.").max(140, "Título demasiado largo.")),
    descripcion: optionalTrimmed(600),
    fecha: isoDate,
    horaInicio: optionalTime,
    numeroSesion: z
      .union([z.number().int().min(1).max(1000), z.undefined()])
      .optional(),
    tipoUrl: optionalTipoUrl,
    urlGrabacion: z
      .union([z.string(), z.undefined()])
      .transform((value) => {
        if (typeof value !== "string") {
          return undefined;
        }

        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
      })
      .refine((value) => !value || value.length <= 500, "URL demasiado larga."),
    publicada: z.boolean(),
  })
  .superRefine((value, context) => {
    if (value.urlGrabacion && !value.tipoUrl) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tipoUrl"],
        message: "Debes seleccionar el tipo de video.",
      });
    }

    if (!value.urlGrabacion && value.tipoUrl) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["urlGrabacion"],
        message: "Debes ingresar la URL de grabación.",
      });
    }

    if (value.urlGrabacion && !sanitizeVideoUrl(value.urlGrabacion)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["urlGrabacion"],
        message: "La URL de video no está permitida.",
      });
    }
  });

// Bug #35: Zod schema for editarClaseAction (replaces manual validation)
export const editarClaseInputSchema = z
  .object({
    id: z.string().uuid("Clase inválida."),
    titulo: z
      .string()
      .transform(trimAndCollapse)
      .pipe(z.string().min(3, "Título muy corto.").max(140, "Título demasiado largo.")),
    descripcion: optionalTrimmed(600),
    fecha: isoDate,
    horaInicio: optionalTime,
    tipoUrl: z
      .union([
        z.enum(["youtube", "vimeo", "drive", "directo"]),
        z.undefined(),
      ])
      .optional(),
    urlGrabacion: z
      .union([z.string(), z.undefined()])
      .transform((value) => {
        if (typeof value !== "string") return undefined;
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
      })
      .refine((value) => !value || value.length <= 500, "URL demasiado larga."),
    publicada: z.boolean(),
  })
  .superRefine((value, context) => {
    if (value.urlGrabacion && !value.tipoUrl) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tipoUrl"],
        message: "Debes seleccionar el tipo de video.",
      });
    }
    if (value.urlGrabacion && !sanitizeVideoUrl(value.urlGrabacion)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["urlGrabacion"],
        message: "La URL de video no está permitida.",
      });
    }
  });

// Bug #96: Zod schema for editarAsignaturaAction
export const editarAsignaturaInputSchema = z.object({
  asignaturaId: z.string().uuid("Asignatura inválida."),
  nombre: z
    .string()
    .transform(trimAndCollapse)
    .pipe(z.string().min(3, "Nombre muy corto.").max(120, "Nombre demasiado largo.")),
  descripcion: optionalTrimmed(500),
  codigo: z
    .union([z.string(), z.undefined()])
    .transform((value) => {
      if (typeof value !== "string") return undefined;
      const trimmed = value.trim().toUpperCase();
      return trimmed.length > 0 ? trimmed : undefined;
    })
    .refine(
      (value) => !value || /^[A-Z0-9-]{3,24}$/.test(value),
      "Código inválido (solo mayúsculas, números y guion).",
    ),
  fechaInicio: isoDate,
  duracionMeses: z.union([z.literal(2), z.literal(4), z.literal(6)]),
  maxAlumnos: z
    .number()
    .int("Debe ser un número entero.")
    .min(1, "Debe permitir al menos 1 alumno.")
    .max(300, "Máximo 300 alumnos."),
});

export const desactivarUsuarioInputSchema = z.object({
  userId: z.string().uuid("Usuario inválido."),
});

export const editarDocenteInputSchema = z.object({
  userId: z.string().uuid("Usuario inválido."),
  nombre: safeName,
  apellido: safeName,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Correo inválido.")
    .max(180, "Correo demasiado largo."),
});

export const editarAlumnoInputSchema = z.object({
  userId: z.string().uuid("Usuario inválido."),
  nombre: safeName,
  apellido: safeName,
  email: z
    .union([z.string(), z.undefined()])
    .transform((value) => {
      if (typeof value !== "string") return undefined;
      const trimmed = value.trim().toLowerCase();
      return trimmed.length > 0 ? trimmed : undefined;
    })
    .refine(
      (value) => !value || z.string().email().safeParse(value).success,
      "Correo inválido.",
    )
    .refine(
      (value) => !value || value.length <= 180,
      "Correo demasiado largo.",
    ),
});

export const buscarPersonaPorRutInputSchema = z.object({
  rut: rutValue,
});

export const solicitudDocumentoInputSchema = z.object({
  tipo: z.enum(["credencial", "alumno_regular", "tarjeta_beneficio"]),
  observacion: z
    .union([z.string(), z.undefined()])
    .transform((value) => {
      if (typeof value !== "string") {
        return undefined;
      }

      const cleaned = trimAndCollapse(value);
      return cleaned.length > 0 ? cleaned : undefined;
    })
    .refine(
      (value) => !value || value.length <= 300,
      "La observación debe tener máximo 300 caracteres.",
    )
    .refine(
      (value) => !value || !/[<>]/.test(value),
      "La observación contiene caracteres no permitidos.",
    ),
});

export const comboboxSearchQuerySchema = z
  .string()
  .trim()
  .min(2, "La búsqueda debe tener al menos 2 caracteres.")
  .max(80, "La búsqueda supera el máximo permitido.")
  .refine(
    (value) => !/[<>]/.test(value),
    "La búsqueda contiene caracteres no permitidos.",
  );

export const crearFinanzaInputSchema = z.object({
  tipo: z.enum(["ingreso", "gasto"]),
  monto: z
    .number()
    .positive("El monto debe ser mayor a 0.")
    .refine(
      (value) => Number.isFinite(value),
      "Monto inválido.",
    ),
  descripcion: z
    .string()
    .transform(trimAndCollapse)
    .pipe(
      z
        .string()
        .min(3, "Descripción muy corta.")
        .max(500, "Descripción demasiado larga."),
    ),
  categoria: optionalTrimmed(120),
  asignaturaId: z
    .union([z.string().uuid(), z.undefined()])
    .optional(),
  fecha: isoDate,
  comprobanteUrl: z
    .union([z.string(), z.undefined()])
    .transform((value) => {
      if (typeof value !== "string") return undefined;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    })
    .refine((value) => !value || value.length <= 500, "URL demasiado larga."),
});

export const emitirCertificadoInputSchema = z.object({
  matriculaId: z.string().uuid("Matrícula inválida."),
  tipo: z.enum(["alumno_regular", "termino_curso"]),
});

export const editarFinanzaInputSchema = z.object({
  id: z.string().uuid("Registro financiero inválido."),
  tipo: z.enum(["ingreso", "gasto"]),
  monto: z
    .number()
    .positive("El monto debe ser mayor a 0.")
    .refine(
      (value) => Number.isFinite(value),
      "Monto inválido.",
    ),
  descripcion: z
    .string()
    .transform(trimAndCollapse)
    .pipe(
      z
        .string()
        .min(3, "Descripción muy corta.")
        .max(500, "Descripción demasiado larga."),
    ),
  categoria: optionalTrimmed(120),
  asignaturaId: z
    .union([z.string().uuid(), z.undefined()])
    .optional(),
  fecha: isoDate,
  comprobanteUrl: z
    .union([z.string(), z.undefined()])
    .transform((value) => {
      if (typeof value !== "string") return undefined;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    })
    .refine((value) => !value || value.length <= 500, "URL demasiado larga."),
});

export const cambiarPasswordInputSchema = z
  .object({
    currentPassword: z.string().min(1, "Debes ingresar tu contraseña actual."),
    newPassword: z
      .string()
      .min(8, "La nueva contraseña debe tener mínimo 8 caracteres.")
      .max(72, "La nueva contraseña debe tener máximo 72 caracteres."),
    confirmPassword: z.string().min(1, "Debes confirmar la nueva contraseña."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });
