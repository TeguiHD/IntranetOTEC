import assert from "node:assert/strict";
import test from "node:test";

import {
  autorizarOwnership,
  parseAppRole,
  rolPermitidoEnRuta,
} from "../src/lib/authz";

test("parseAppRole only accepts valid roles", () => {
  assert.equal(parseAppRole("admin"), "admin");
  assert.equal(parseAppRole("docente"), "docente");
  assert.equal(parseAppRole("alumno"), "alumno");
  assert.equal(parseAppRole("owner"), null);
  assert.equal(parseAppRole(undefined), null);
});

test("rolPermitidoEnRuta denies mismatched route prefix", () => {
  assert.deepEqual(rolPermitidoEnRuta("/admin", "admin"), { permitido: true });
  assert.deepEqual(rolPermitidoEnRuta("/docente", "docente"), { permitido: true });
  assert.deepEqual(rolPermitidoEnRuta("/alumno", "alumno"), { permitido: true });

  const denied = rolPermitidoEnRuta("/admin/asignaturas", "alumno");
  assert.equal(denied.permitido, false);

  if (!denied.permitido) {
    assert.equal(denied.motivo, "role_mismatch_admin");
  }
});

test("autorizarOwnership enforces ownership fail-closed", () => {
  const ownerAccess = autorizarOwnership(
    { userId: "user-a", userRol: "alumno" },
    "user-a",
  );
  assert.deepEqual(ownerAccess, { permitido: true });

  const denied = autorizarOwnership(
    { userId: "user-a", userRol: "alumno" },
    "user-b",
  );
  assert.equal(denied.permitido, false);

  const adminOverride = autorizarOwnership(
    { userId: "admin-1", userRol: "admin" },
    "user-b",
  );
  assert.deepEqual(adminOverride, { permitido: true });

  const ownerMissing = autorizarOwnership(
    { userId: "admin-1", userRol: "admin" },
    null,
  );
  assert.equal(ownerMissing.permitido, false);
});
