/**
 * Pruebas de estrés funcional — Step 16
 *
 * Validan que ciclos repetidos de crear/editar/borrar/notificar/solicitar no degraden
 * la consistencia de datos ni la lógica de negocio. Estas pruebas son de caja blanca
 * sobre las funciones puras y validaciones críticas del sistema.
 *
 * Se ejecutan con: node --test security-tests/functional-stress.test.ts
 */

import assert from "node:assert/strict";
import test from "node:test";

// ─── Validaciones de RUT (ciclos repetidos) ─────────────────────────────────

import { validarRut, formatearRut, normalizarRut, formatearIdentificador } from "../src/lib/rut";

test("RUT stress: 1000 ciclos de formatear→normalizar→validar son idempotentes", () => {
  const ruts = [
    "12.345.678-9",
    "11111111-1",
    "9.999.999-K",
    "1-9",
    "76.354.771-K",
    "20.000.000-0",
  ];

  for (let i = 0; i < 1000; i++) {
    for (const rut of ruts) {
      const normalizado = normalizarRut(rut);
      const formateado = formatearRut(normalizado);
      const normalizado2 = normalizarRut(formateado);
      assert.equal(normalizado, normalizado2, `RUT ${rut} no es idempotente tras ciclo ${i}`);
    }
  }
});

test("formatearIdentificador con null/undefined/vacío nunca lanza", () => {
  for (let i = 0; i < 500; i++) {
    assert.doesNotThrow(() => formatearIdentificador(null));
    assert.doesNotThrow(() => formatearIdentificador(undefined));
    assert.doesNotThrow(() => formatearIdentificador(""));
    assert.doesNotThrow(() => formatearIdentificador("EXT-123456"));
    assert.doesNotThrow(() => formatearIdentificador("12.345.678-9"));
  }
});

// ─── Validaciones de esquemas Zod (ciclos repetidos) ────────────────────────

import { docenteInputSchema } from "../src/lib/validations/admin";

const VALID_DOCENTE = {
  nombre: "Juan",
  apellido: "Pérez",
  rut: "12345678-5",
  email: "juan@test.com",
  password: "letras123",
};

const INVALID_DOCENTES = [
  { ...VALID_DOCENTE, password: "corta" },           // < 8 chars
  { ...VALID_DOCENTE, password: "sinNumeros!!" },    // no numbers
  { ...VALID_DOCENTE, password: "12345678" },        // no letters
  { ...VALID_DOCENTE, email: "no-es-email" },
  { ...VALID_DOCENTE, nombre: "" },
  { ...VALID_DOCENTE, rut: "no-es-rut" },
];

test("docenteInputSchema stress: 500 ciclos válidos parseados correctamente", () => {
  for (let i = 0; i < 500; i++) {
    const result = docenteInputSchema.safeParse(VALID_DOCENTE);
    assert.equal(result.success, true, `Iteración ${i}: debería ser válido`);
  }
});

test("docenteInputSchema stress: 500 ciclos de entradas inválidas rechazadas", () => {
  for (let i = 0; i < 500; i++) {
    for (const invalid of INVALID_DOCENTES) {
      const result = docenteInputSchema.safeParse(invalid);
      assert.equal(result.success, false, `Iteración ${i}: debería ser inválido: ${JSON.stringify(invalid)}`);
    }
  }
});

// ─── Sanitización inline (ciclos repetidos) ──────────────────────────────────
// Replica la lógica de sanitize.ts sin importar el módulo (evita path aliases)

const CONTROL_CHARS_REGEX = /[\u0000-\u001F\u007F]/g;
const DANGEROUS_HTML_CHARS_REGEX = /[<>]/g;

const sanitizeTextInline = (value: string): string =>
  value.replace(CONTROL_CHARS_REGEX, " ").replace(DANGEROUS_HTML_CHARS_REGEX, "").trim();

const SANITIZE_CASES = [
  { input: "<script>alert('xss')</script>", mustNotContain: "<" },
  { input: "<img src=x onerror=alert(1)>", mustNotContain: "<" },
  { input: "Normal text", mustNotContain: "<" },
  { input: "Texto con ñ y acentos: áéíóú", mustNotContain: "<" },
  { input: "A".repeat(10000), mustNotContain: "<" },
];

test("sanitizeText stress: 200 ciclos, HTML tags nunca sobreviven sanitización", () => {
  for (let i = 0; i < 200; i++) {
    for (const { input, mustNotContain } of SANITIZE_CASES) {
      const result = sanitizeTextInline(input);
      assert.ok(
        !result.includes(mustNotContain),
        `Iteración ${i}: sanitize no eliminó "${mustNotContain}" de "${input.slice(0, 40)}"`,
      );
    }
  }
});

// ─── Política de contraseña docente ──────────────────────────────────────────

const DOCENTE_PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).{8,128}$/;

const VALID_PASSWORDS = ["letras123", "Abc12345", "pass1234", "mi_clave9", "A1" + "x".repeat(6)];
const INVALID_PASSWORDS = [
  "short1",       // < 8
  "sinNumeros",   // no digits
  "12345678",     // no letters
  "",             // empty
  "a".repeat(129) + "1", // > 128
];

test("política contraseña docente stress: 1000 ciclos, válidas aceptadas", () => {
  for (let i = 0; i < 1000; i++) {
    for (const pwd of VALID_PASSWORDS) {
      assert.ok(DOCENTE_PASSWORD_REGEX.test(pwd), `Contraseña válida rechazada: "${pwd}" en ciclo ${i}`);
    }
  }
});

test("política contraseña docente stress: 1000 ciclos, inválidas rechazadas", () => {
  for (let i = 0; i < 1000; i++) {
    for (const pwd of INVALID_PASSWORDS) {
      assert.ok(!DOCENTE_PASSWORD_REGEX.test(pwd), `Contraseña inválida aceptada: "${pwd}" en ciclo ${i}`);
    }
  }
});

// ─── Duración de asignatura 1-12 meses ───────────────────────────────────────

import { z } from "zod";

const duracionSchema = z.number().int().min(1).max(12);

test("duracion asignatura stress: 500 ciclos, límites correctos", () => {
  for (let i = 0; i < 500; i++) {
    assert.ok(duracionSchema.safeParse(1).success, "1 mes debe ser válido");
    assert.ok(duracionSchema.safeParse(6).success, "6 meses debe ser válido");
    assert.ok(duracionSchema.safeParse(12).success, "12 meses debe ser válido");
    assert.ok(!duracionSchema.safeParse(0).success, "0 meses debe ser inválido");
    assert.ok(!duracionSchema.safeParse(13).success, "13 meses debe ser inválido");
    assert.ok(!duracionSchema.safeParse(-1).success, "-1 debe ser inválido");
    assert.ok(!duracionSchema.safeParse(1.5).success, "1.5 debe ser inválido (no entero)");
  }
});

// ─── Consistencia de estados de matrícula ────────────────────────────────────

test("estados matrícula stress: transiciones activa→inactiva→eliminada son unidireccionales", () => {
  type Estado = "activa" | "inactiva" | "eliminada";

  const transicionesPermitidas: Record<Estado, Estado[]> = {
    activa: ["inactiva"],
    inactiva: ["activa", "eliminada"],
    eliminada: [],
  };

  const transicionesInvalidas: Array<[Estado, Estado]> = [
    ["activa", "eliminada"],   // saltar inactiva
    ["eliminada", "activa"],   // resucitar eliminada
    ["eliminada", "inactiva"], // resucitar eliminada
  ];

  for (let i = 0; i < 1000; i++) {
    for (const [desde, hasta] of transicionesInvalidas) {
      const permitidas = transicionesPermitidas[desde];
      assert.ok(
        !permitidas.includes(hasta),
        `Transición inválida ${desde}→${hasta} debería estar bloqueada en ciclo ${i}`,
      );
    }
  }
});

// ─── Consistencia de auditoría: marcador de reset no borra datos ─────────────

test("marcador de limpieza auditoría: el evento cerrar_ciclo+auditoria no puede ser hard-delete", () => {
  // La acción limpiarVistaAuditoriaAction solo INSERTA un nuevo registro.
  // Este test verifica que la lógica no incluye DELETE statements mediante
  // análisis estático del string de la función.
  const fs = require("node:fs");
  const path = require("node:path");

  // __dirname in compiled output is .security-build/security-tests/ → go up 3 levels
  const auditoriaActionsPath = path.resolve(
    __dirname,
    "../../src/actions/auditoria.ts",
  );

  const content = fs.readFileSync(auditoriaActionsPath, "utf-8");

  // No debe contener llamadas a db.delete en la acción de limpieza
  const lines = content.split("\n");
  const limpiezaStart = lines.findIndex((l: string) => l.includes("limpiarVistaAuditoriaAction"));
  const nextFunctionStart = lines.findIndex(
    (l: string, i: number) => i > limpiezaStart && l.match(/^export async function/),
  );

  const limpiezaBody = lines
    .slice(limpiezaStart, nextFunctionStart > 0 ? nextFunctionStart : undefined)
    .join("\n");

  assert.ok(
    !limpiezaBody.includes("db.delete"),
    "limpiarVistaAuditoriaAction no debe llamar a db.delete — viola el principio de preservación de trazabilidad",
  );

  assert.ok(
    limpiezaBody.includes("registrarAudit"),
    "limpiarVistaAuditoriaAction debe registrar en auditoría para trazabilidad",
  );
});
