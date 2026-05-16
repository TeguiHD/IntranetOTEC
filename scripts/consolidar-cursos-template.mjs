/**
 * consolidar-cursos-template.mjs
 *
 * Consolida cursos "fantasma" (creados por el import como curso=sección)
 * a sus cursos template correctos (los que ya existen con N horas y categoría).
 *
 * Ejemplo:
 *   FANTASMA: "Podología Clínica Martes 12:30" (1 sección, este curso ES la sección)
 *   TEMPLATE: "PODOLOGÍA CLÍNICA" (0 secciones actuales, 12 históricas)
 *   ACCIÓN:   reasignar la sección al template, soft-delete del fantasma
 *
 * Heurística de match:
 *   - Strip de "<Día> <HH:MM>" del final del nombre fantasma
 *   - Slug normalizado (sin tildes, lower, espacios colapsados)
 *   - Match contra cursos sin secciones activas (templates)
 *
 * Run:
 *   node scripts/consolidar-cursos-template.mjs            (dry-run)
 *   node scripts/consolidar-cursos-template.mjs --apply
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

// Strip "<Día> <HH:MM>" o solo "<HH:MM>" al final.
// Días aceptados (con/sin tilde, mayus/min): Lunes, Martes, Miércoles, Jueves, Viernes, Sábado, Domingo + ONLINE
const TAIL_RX =
  /\s+(ONLINE\s+)?(Lunes|Martes|Mi[eé]rcoles|Jueves|Viernes|S[aá]bado|Domingo)\s+\d{1,2}[:.]\d{2}\s*$/iu;
const TAIL_NO_DAY_RX = /\s+(ONLINE)?\s*\d{1,2}[:.]\d{2}\s*$/iu;

function baseName(nombre) {
  let s = String(nombre).trim();
  s = s.replace(TAIL_RX, "");
  s = s.replace(TAIL_NO_DAY_RX, "");
  return s.trim();
}

const matches = [];
const noMatches = [];

async function main() {
  console.log(`[consolidar] MODO: ${DRY_RUN ? "DRY-RUN" : "APPLY"}`);
  console.log(`[consolidar] DB: ${DATABASE_URL.replace(/:[^:@]+@/, ":***@")}`);
  const client = await pool.connect();
  try {
    // 1) fantasmas: cursos visibles con exactamente 1 sección activa cuyo nombre
    //    contenga el patrón "<día> <HH:MM>" o sea un código IMP-/CUR- residual del import.
    const { rows: fantasmas } = await client.query(`
      SELECT c.id, c.nombre, c.codigo,
        (SELECT COUNT(*) FROM asignaturas a WHERE a.curso_id = c.id AND a.eliminado_at IS NULL) AS n_act,
        (SELECT COUNT(*) FROM asignaturas a WHERE a.curso_id = c.id) AS n_total
      FROM cursos c
      WHERE c.eliminado_at IS NULL
      ORDER BY c.nombre
    `);

    // 2) templates: cursos visibles sin secciones activas
    const templates = fantasmas.filter((c) => Number(c.n_act) === 0);
    const candidatosFantasma = fantasmas.filter((c) => Number(c.n_act) >= 1);

    console.log(`[consolidar] cursos visibles: ${fantasmas.length}`);
    console.log(`[consolidar] templates candidatos (0 secciones activas): ${templates.length}`);
    console.log(`[consolidar] cursos con secciones activas (potenciales fantasma): ${candidatosFantasma.length}`);

    const templatesPorSlug = new Map();
    for (const t of templates) {
      const k = slug(t.nombre);
      if (!templatesPorSlug.has(k)) templatesPorSlug.set(k, []);
      templatesPorSlug.get(k).push(t);
    }

    if (!DRY_RUN) await client.query("BEGIN");

    for (const f of candidatosFantasma) {
      const base = baseName(f.nombre);
      if (base === f.nombre) {
        // No tiene día/hora al final → es un curso normal, no fantasma
        continue;
      }
      const k = slug(base);
      const candidatos = templatesPorSlug.get(k) ?? [];

      if (candidatos.length === 0) {
        noMatches.push({
          fantasma_id: f.id,
          fantasma_nombre: f.nombre,
          fantasma_codigo: f.codigo,
          base_extraida: base,
          slug: k,
          razon: "sin template match",
        });
        continue;
      }
      if (candidatos.length > 1) {
        noMatches.push({
          fantasma_id: f.id,
          fantasma_nombre: f.nombre,
          fantasma_codigo: f.codigo,
          base_extraida: base,
          slug: k,
          razon: `ambiguo: ${candidatos.length} templates match (${candidatos.map((c) => c.nombre).join(" | ")})`,
        });
        continue;
      }
      const tmpl = candidatos[0];
      matches.push({
        fantasma_id: f.id,
        fantasma_nombre: f.nombre,
        fantasma_codigo: f.codigo,
        secciones_a_reasignar: f.n_act,
        template_id: tmpl.id,
        template_nombre: tmpl.nombre,
        template_codigo: tmpl.codigo,
      });

      if (!DRY_RUN) {
        await client.query(
          `UPDATE asignaturas SET curso_id = $1, updated_at = now()
           WHERE curso_id = $2 AND eliminado_at IS NULL`,
          [tmpl.id, f.id],
        );
        await client.query(
          `UPDATE cursos SET eliminado_at = now(), updated_at = now()
           WHERE id = $1 AND eliminado_at IS NULL`,
          [f.id],
        );
      }
    }

    if (!DRY_RUN) {
      await client.query("COMMIT");
      console.log("[consolidar] ✓ COMMIT");
    } else {
      console.log("[consolidar] ✓ DRY-RUN OK (sin cambios en DB)");
    }
    console.log(`[consolidar] matches: ${matches.length} | sin match: ${noMatches.length}`);
  } catch (err) {
    if (!DRY_RUN) await client.query("ROLLBACK").catch(() => {});
    console.error("[consolidar] ERROR:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }

  // CSVs
  mkdirSync("backups", { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);

  const writeCsv = (file, rows) => {
    if (rows.length === 0) return null;
    const headers = Object.keys(rows[0]);
    const esc = (v) => {
      if (v == null) return "";
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.join(",")];
    for (const r of rows) lines.push(headers.map((h) => esc(r[h])).join(","));
    writeFileSync(file, lines.join("\n"));
    return file;
  };

  const fMatch = writeCsv(join("backups", `consolidar-match-${stamp}.csv`), matches);
  const fNo = writeCsv(join("backups", `consolidar-nomatch-${stamp}.csv`), noMatches);
  if (fMatch) console.log(`[consolidar] CSV match: ${fMatch}`);
  if (fNo) console.log(`[consolidar] CSV no-match: ${fNo}`);
}

main();
