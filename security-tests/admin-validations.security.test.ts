import assert from "node:assert/strict";
import test from "node:test";

import {
  alumnoInputSchema,
  buscarPersonaPorRutInputSchema,
  crearClaseInputSchema,
  docenteInputSchema,
  solicitudDocumentoInputSchema,
} from "../src/lib/validations/admin";

test("docenteInputSchema rejects weak passwords", () => {
  const weak = docenteInputSchema.safeParse({
    nombre: "Docente",
    apellido: "Prueba",
    rut: "12.345.678-5",
    email: "docente@miotec.cl",
    password: "123456789012",
  });

  assert.equal(weak.success, false);

  const strong = docenteInputSchema.safeParse({
    nombre: "Docente",
    apellido: "Prueba",
    rut: "12.345.678-5",
    email: "docente@miotec.cl",
    password: "ClaveSegura2026!!",
  });

  assert.equal(strong.success, true);
});

test("alumnoInputSchema supports RUT and foreign credential with strict validation", () => {
  const invalidRut = alumnoInputSchema.safeParse({
    credencialTipo: "rut",
    nombre: "Alumno",
    apellido: "Prueba",
    rut: "12.345.678-9",
    email: "alumno@miotec.cl",
  });

  assert.equal(invalidRut.success, false);

  const validRut = alumnoInputSchema.safeParse({
    credencialTipo: "rut",
    nombre: "Alumno",
    apellido: "Prueba",
    rut: "12.345.678-5",
    email: "alumno@miotec.cl",
  });

  assert.equal(validRut.success, true);

  const missingForeignCredential = alumnoInputSchema.safeParse({
    credencialTipo: "extranjera",
    nombre: "Alumno",
    apellido: "Prueba",
    email: "alumno@miotec.cl",
  });

  assert.equal(missingForeignCredential.success, false);

  const validForeignCredential = alumnoInputSchema.safeParse({
    credencialTipo: "extranjera",
    nombre: "Alumno",
    apellido: "Prueba",
    credencialExtranjera: "PASS-12345",
    email: "alumno@miotec.cl",
  });

  assert.equal(validForeignCredential.success, true);
});

test("solicitudDocumentoInputSchema rejects invalid type and script payloads", () => {
  const invalidType = solicitudDocumentoInputSchema.safeParse({
    tipo: "otro",
  });

  assert.equal(invalidType.success, false);

  const injectedObservation = solicitudDocumentoInputSchema.safeParse({
    tipo: "credencial",
    observacion: "<script>alert(1)</script>",
  });

  assert.equal(injectedObservation.success, false);
});

test("crearClaseInputSchema blocks unsafe video URLs", () => {
  const unsafeUrl = crearClaseInputSchema.safeParse({
    asignaturaId: "11111111-1111-4111-8111-111111111111",
    titulo: "Sesión 1",
    descripcion: "Intro",
    fecha: "2026-03-15",
    horaInicio: "10:00",
    numeroSesion: 1,
    tipoUrl: "youtube",
    urlGrabacion: "http://evil.example/video",
    publicada: true,
  });

  assert.equal(unsafeUrl.success, false);

  const safeUrl = crearClaseInputSchema.safeParse({
    asignaturaId: "11111111-1111-4111-8111-111111111111",
    titulo: "Sesión 1",
    descripcion: "Intro",
    fecha: "2026-03-15",
    horaInicio: "10:00",
    numeroSesion: 1,
    tipoUrl: "youtube",
    urlGrabacion: "https://www.youtube.com/watch?v=test",
    publicada: true,
  });

  assert.equal(safeUrl.success, true);
});

test("buscarPersonaPorRutInputSchema rejects malformed or injected payloads", () => {
  const injected = buscarPersonaPorRutInputSchema.safeParse({
    rut: "<script>12.345.678-5</script>",
  });

  assert.equal(injected.success, false);

  const valid = buscarPersonaPorRutInputSchema.safeParse({
    rut: "12.345.678-5",
  });

  assert.equal(valid.success, true);
});
