/**
 * dedupe-tildes.mjs
 *
 * Consolida cursos y asignaturas duplicadas por variantes de tildes / mayúsculas / espacios.
 *
 * Reglas (acordadas con cliente):
 *   - CURSOS > PERIODOS jerarquía. Dedupe a nivel `cursos` (templates) primero.
 *   - Luego colapsa `asignaturas` con misma (cursoId, periodoId, turno).
 *   - Re-vincula `matriculas` y `clases` al canónico. Si ya existe matrícula en el
 *     canónico para el alumno, soft-deletea la duplicada (preserva la existente).
 *   - Soft-delete (`eliminado_at`) en cursos/asignaturas/matriculas/clases sobrantes
 *     — reversible vía SQL.
 *
 * Run:
 *   node scripts/dedupe-tildes.mjs --dry-run         (default, no escribe)
 *   node scripts/dedupe-tildes.mjs --apply           (escribe + CSV)
 */

import pg from "pg";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const DRY_RUN = !process.argv.includes("--apply");
const DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://otec:otec@127.0.0.1:5433/otec_db";

const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 5 });

const slug = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const csvRows = [];
const log = (...args) => console.log("[dedupe]", ...args);
const report = (row) => csvRows.push(row);

async function q(client, sql, params = []) {
  return client.query(sql, params);
}

async function dedupeCursos(client) {
  log("─── Fase 1: dedupe cursos por slug ───");
  const { rows: cursos } = await q(
    client,
    `SELECT c.id, c.nombre, c.codigo,
       (SELECT COUNT(*) FROM asignaturas a WHERE a.curso_id = c.id AND a.eliminado_at IS NULL) AS n_asig
     FROM cursos c
     WHERE c.eliminado_at IS NULL
     ORDER BY c.created_at ASC`,
  );

  const groups = new Map();
  for (const c of cursos) {
    const key = slug(c.nombre);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }

  let mergeCount = 0;
  for (const [key, group] of groups) {
    if (group.length < 2) continue;
    // canónico: el de más asignaturas (tie-break: el de nombre más largo con tildes)
    group.sort((a, b) => {
      if (b.n_asig !== a.n_asig) return Number(b.n_asig) - Number(a.n_asig);
      return b.nombre.length - a.nombre.length;
    });
    const [canonico, ...descartar] = group;
    const descIds = descartar.map((d) => d.id);

    log(
      `  slug="${key}" → canónico="${canonico.nombre}" (id=${canonico.id}, ${canonico.n_asig} secciones)`,
    );
    for (const d of descartar) {
      log(`    descarta "${d.nombre}" (id=${d.id}, ${d.n_asig} secciones)`);
      report({
        fase: "cursos",
        slug: key,
        canonico_id: canonico.id,
        canonico_nombre: canonico.nombre,
        descartado_id: d.id,
        descartado_nombre: d.nombre,
        movido: `${d.n_asig} asignaturas`,
      });
    }

    if (!DRY_RUN) {
      await q(
        client,
        `UPDATE asignaturas SET curso_id = $1, updated_at = now()
         WHERE curso_id = ANY($2::uuid[]) AND eliminado_at IS NULL`,
        [canonico.id, descIds],
      );
      await q(
        client,
        `UPDATE cursos SET eliminado_at = now(), updated_at = now()
         WHERE id = ANY($1::uuid[]) AND eliminado_at IS NULL`,
        [descIds],
      );
    }
    mergeCount += descartar.length;
  }
  log(`  → ${mergeCount} cursos consolidados`);
}

async function dedupeAsignaturas(client) {
  log("─── Fase 2: dedupe asignaturas por (curso_id, periodo_id, turno) ───");
  const { rows: grupos } = await q(
    client,
    `SELECT curso_id, periodo_id, turno, ARRAY_AGG(id ORDER BY created_at ASC) AS ids
     FROM asignaturas
     WHERE eliminado_at IS NULL
     GROUP BY curso_id, periodo_id, turno
     HAVING COUNT(*) > 1`,
  );

  let mergeCount = 0;
  for (const g of grupos) {
    const ids = g.ids;
    const { rows: metricas } = await q(
      client,
      `SELECT a.id, a.nombre,
         (SELECT COUNT(*) FROM matriculas m WHERE m.asignatura_id = a.id AND m.eliminado_at IS NULL) AS n_mat,
         (SELECT COUNT(*) FROM clases c WHERE c.asignatura_id = a.id AND c.eliminado_at IS NULL) AS n_cla
       FROM asignaturas a
       WHERE a.id = ANY($1::uuid[])`,
      [ids],
    );
    metricas.sort((a, b) => {
      if (b.n_mat !== a.n_mat) return Number(b.n_mat) - Number(a.n_mat);
      return Number(b.n_cla) - Number(a.n_cla);
    });
    const [canonico, ...descartar] = metricas;
    const descIds = descartar.map((d) => d.id);

    log(
      `  grupo (curso=${g.curso_id}, periodo=${g.periodo_id}, turno=${g.turno}) → canónico="${canonico.nombre}" (id=${canonico.id}, mat=${canonico.n_mat})`,
    );
    for (const d of descartar) {
      log(`    descarta "${d.nombre}" (id=${d.id}, mat=${d.n_mat}, cla=${d.n_cla})`);
      report({
        fase: "asignaturas",
        slug: `${g.curso_id}/${g.periodo_id}/${g.turno}`,
        canonico_id: canonico.id,
        canonico_nombre: canonico.nombre,
        descartado_id: d.id,
        descartado_nombre: d.nombre,
        movido: `mat=${d.n_mat}, cla=${d.n_cla}`,
      });
    }

    if (!DRY_RUN) {
      // matriculas: re-vincular las que NO colisionan con alumno ya inscrito en canónica
      // colisiones (alumno ya en canónica): soft-delete la duplicada
      await q(
        client,
        `UPDATE matriculas m
         SET eliminado_at = now()
         WHERE m.asignatura_id = ANY($1::uuid[])
           AND m.eliminado_at IS NULL
           AND EXISTS (
             SELECT 1 FROM matriculas existing
             WHERE existing.alumno_id = m.alumno_id
               AND existing.asignatura_id = $2
               AND existing.eliminado_at IS NULL
           )`,
        [descIds, canonico.id],
      );
      await q(
        client,
        `UPDATE matriculas
         SET asignatura_id = $1
         WHERE asignatura_id = ANY($2::uuid[]) AND eliminado_at IS NULL`,
        [canonico.id, descIds],
      );
      // clases: re-vincular todas al canónico
      await q(
        client,
        `UPDATE clases
         SET asignatura_id = $1
         WHERE asignatura_id = ANY($2::uuid[]) AND eliminado_at IS NULL`,
        [canonico.id, descIds],
      );
      // soft-delete asignaturas descartadas
      await q(
        client,
        `UPDATE asignaturas SET eliminado_at = now(), updated_at = now()
         WHERE id = ANY($1::uuid[]) AND eliminado_at IS NULL`,
        [descIds],
      );
    }
    mergeCount += descartar.length;
  }
  log(`  → ${mergeCount} asignaturas consolidadas`);
}

async function main() {
  log(`MODO: ${DRY_RUN ? "DRY-RUN (no escribe)" : "APPLY"}`);
  log(`DB: ${DATABASE_URL.replace(/:[^:@]+@/, ":***@")}`);
  const client = await pool.connect();
  try {
    if (!DRY_RUN) await q(client, "BEGIN");
    await dedupeCursos(client);
    await dedupeAsignaturas(client);
    if (!DRY_RUN) {
      await q(client, "COMMIT");
      log("✓ COMMIT");
    } else {
      log("✓ DRY-RUN completado, sin cambios en DB");
    }
  } catch (err) {
    if (!DRY_RUN) await q(client, "ROLLBACK").catch(() => {});
    console.error("[dedupe] ERROR:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }

  if (csvRows.length > 0) {
    mkdirSync("backups", { recursive: true });
    const date = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
    const file = join("backups", `dedupe-report-${date}.csv`);
    const header = "fase,slug,canonico_id,canonico_nombre,descartado_id,descartado_nombre,movido";
    const lines = csvRows.map((r) =>
      [
        r.fase,
        JSON.stringify(r.slug),
        r.canonico_id,
        JSON.stringify(r.canonico_nombre),
        r.descartado_id,
        JSON.stringify(r.descartado_nombre),
        JSON.stringify(r.movido),
      ].join(","),
    );
    writeFileSync(file, [header, ...lines].join("\n"));
    log(`✓ Reporte CSV: ${file}`);
  }
}

main();
