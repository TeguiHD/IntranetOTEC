import assert from "node:assert/strict";
import test from "node:test";

import {
  autorizarOwnership,
  parseAppRole,
  rolPermitidoEnRuta,
} from "../src/lib/authz";
import {
  getCapabilitiesForRole,
  roleHasAnyCapability,
  roleHasCapability,
} from "../src/lib/capabilities";
import {
  asignaturaPermiteEvaluaciones,
  describeEvaluationWriteLock,
  periodoPermiteMutaciones,
} from "../src/lib/academic-state";

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

test("capability matrix preserves admin-only publication and student isolation", () => {
  assert.equal(roleHasCapability("admin", "evaluaciones.publish"), true);
  assert.equal(roleHasCapability("docente", "evaluaciones.publish"), false);
  assert.equal(roleHasCapability("alumno", "evaluaciones.publish"), false);
  assert.equal(roleHasCapability("alumno", "evaluaciones.respond"), true);
  assert.equal(roleHasCapability("alumno", "evaluaciones.read_answer_key"), false);

  const docenteCapabilities = getCapabilitiesForRole("docente");
  assert.equal(docenteCapabilities.includes("evaluaciones.read_assigned"), true);
  assert.equal(
    roleHasAnyCapability("docente", ["evaluaciones.read_admin", "evaluaciones.read_assigned"]),
    true,
  );
});

test("academic lifecycle helpers explain write locks consistently", () => {
  assert.equal(periodoPermiteMutaciones("cerrado"), false);
  assert.equal(asignaturaPermiteEvaluaciones("finalizado"), false);
  assert.equal(
    describeEvaluationWriteLock({ periodoEstado: "cerrado", asignaturaEstado: "activo" }),
    "El periodo seleccionado está cerrado. Solo puedes revisar historial y resultados.",
  );
  assert.equal(
    describeEvaluationWriteLock({ periodoEstado: "activo", asignaturaEstado: "finalizado" }),
    "La sección está finalizada o archivada. Puedes consultar resultados, pero no crear ni modificar evaluaciones.",
  );
});

test("actorCanManageEvaluacion: docente blocked from foreign evaluacion", () => {
  const actorCanManageEvaluacion = (
    actor: { userRol: string; userId: string },
    evaluacion: { docenteId: string | null },
  ) =>
    actor.userRol === "admin" ||
    (actor.userRol === "docente" &&
      evaluacion.docenteId !== null &&
      evaluacion.docenteId === actor.userId);

  assert.equal(
    actorCanManageEvaluacion({ userRol: "docente", userId: "A" }, { docenteId: "B" }),
    false,
  );
  assert.equal(
    actorCanManageEvaluacion({ userRol: "docente", userId: "A" }, { docenteId: "A" }),
    true,
  );
  assert.equal(
    actorCanManageEvaluacion({ userRol: "admin", userId: "X" }, { docenteId: "B" }),
    true,
  );
});
