import assert from "node:assert/strict";
import test from "node:test";

import {
  coerceCertificadoSnapshot,
  isCodigoCertificadoValido,
  sanitizeCertificadoText,
} from "../src/lib/certificados";

test("isCodigoCertificadoValido accepts canonical UUID and rejects injected payloads", () => {
  assert.equal(
    isCodigoCertificadoValido("550e8400-e29b-41d4-a716-446655440000"),
    true,
  );
  assert.equal(isCodigoCertificadoValido("../../etc/passwd"), false);
  assert.equal(isCodigoCertificadoValido("<script>alert(1)</script>"), false);
  assert.equal(isCodigoCertificadoValido("550e8400-e29b-41d4-a716-446655440000;DROP"), false);
});

test("coerceCertificadoSnapshot sanitizes plain payload and rejects polluted objects", () => {
  const clean = coerceCertificadoSnapshot({
    alumnoNombre: "<b>Maria</b>",
    alumnoApellido: "Perez",
    alumnoRut: "12.345.678-5",
    asignaturaId: "11111111-1111-4111-8111-111111111111",
    fechaEmision: "2026-03-24T18:30:00.000Z",
  });

  assert.equal(clean.alumnoNombre, "bMaria/b");
  assert.equal(clean.alumnoApellido, "Perez");

  const polluted = {
    alumnoNombre: "Juan",
    __proto__: { admin: true },
  };
  const parsedPolluted = coerceCertificadoSnapshot(polluted);

  assert.equal(parsedPolluted.alumnoNombre, null);
  assert.equal(parsedPolluted.alumnoApellido, null);
  assert.equal(parsedPolluted.alumnoRut, null);
  assert.equal(parsedPolluted.asignaturaId, null);
  assert.equal(parsedPolluted.fechaEmision, null);
});

test("sanitizeCertificadoText removes control and tag characters", () => {
  const input = "\u0000<script>Codigo</script>\n\tOK";
  const sanitized = sanitizeCertificadoText(input, 80);
  assert.equal(sanitized, "scriptCodigo/scriptOK");
});