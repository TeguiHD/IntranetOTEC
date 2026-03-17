import assert from "node:assert/strict";
import test from "node:test";

import { formatearRut, normalizarRut, validarRut } from "../src/lib/rut";

test("normalizarRut removes dangerous characters and keeps canonical form", () => {
  assert.equal(normalizarRut("<script>12.345.678-5</script>"), "123456785");
  assert.equal(normalizarRut("12.345.678-k"), "12345678K");
});

test("validarRut accepts valid verifier and rejects invalid values", () => {
  assert.equal(validarRut("12.345.678-5"), true);
  assert.equal(validarRut("12345678-5"), true);
  assert.equal(validarRut("12.345.678-9"), false);
  assert.equal(validarRut("12.345.678"), false);
});

test("formatearRut returns canonical display format", () => {
  assert.equal(formatearRut("123456785"), "12.345.678-5");
});