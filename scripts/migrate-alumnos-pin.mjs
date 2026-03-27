/**
 * Script de migracion: convierte los passwords de alumnos existentes
 * del formato antiguo (bcrypt(RUT_SALT + identificador + userId))
 * al nuevo formato (bcrypt(PIN de 4 digitos)).
 *
 * Uso:
 *   node scripts/migrate-alumnos-pin.mjs
 *
 * Requiere la variable de entorno DATABASE_URL en .env
 */

import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// Cargar .env manualmente
const envPath = resolve(__dirname, "../.env");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
} catch {
  console.error("No se pudo cargar .env. Asegurate de que el archivo exista.");
  process.exit(1);
}

const { default: pg } = await import("pg");
const { default: bcrypt } = await import("bcryptjs");

function derivarPinPredeterminado(identificadorLogin) {
  const isForeign = identificadorLogin.trim().toUpperCase().startsWith("EXT-");

  if (isForeign) {
    const body = identificadorLogin.replace(/^EXT-/i, "");
    const digits = body.replace(/[^0-9]/g, "");
    return digits.length >= 4 ? digits.slice(-4) : digits.padStart(4, "0");
  }

  // RUT chileno: sin digito verificador
  const cleaned = identificadorLogin.replace(/[^0-9kK]/g, "").toUpperCase();
  const rutBody = cleaned.length >= 2 ? cleaned.slice(0, -1) : cleaned;
  return rutBody.length >= 4 ? rutBody.slice(-4) : rutBody.padStart(4, "0");
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL no esta definida en .env");
  process.exit(1);
}

const client = new pg.Client({ connectionString });

try {
  await client.connect();
  console.log("Conectado a la base de datos.");

  // Obtener todos los alumnos activos con RUT
  const { rows: alumnos } = await client.query(`
    SELECT id, rut, nombre, apellido
    FROM usuarios
    WHERE rol = 'alumno'
      AND activo = true
      AND eliminado_at IS NULL
      AND rut IS NOT NULL
    ORDER BY apellido, nombre
  `);

  console.log(`Total alumnos a migrar: ${alumnos.length}`);

  let migrados = 0;
  let errores = 0;

  for (const alumno of alumnos) {
    try {
      const pin = derivarPinPredeterminado(alumno.rut);
      const hash = await bcrypt.hash(pin, 12);

      await client.query(
        `UPDATE usuarios SET password = $1, pin_cambiado = false, updated_at = now() WHERE id = $2`,
        [hash, alumno.id],
      );

      migrados++;
      if (migrados % 10 === 0) {
        process.stdout.write(`  Progreso: ${migrados}/${alumnos.length}\r`);
      }
    } catch (err) {
      console.error(`\nError migrando alumno ${alumno.id} (${alumno.nombre} ${alumno.apellido}): ${err.message}`);
      errores++;
    }
  }

  console.log(`\nMigracion completada: ${migrados} migrados, ${errores} errores.`);
} catch (err) {
  console.error("Error durante la migracion:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
