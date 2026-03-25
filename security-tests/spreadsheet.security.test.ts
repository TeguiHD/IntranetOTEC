import assert from "node:assert/strict";
import test from "node:test";

import { parseSpreadsheetRowsFromBuffer } from "../src/lib/spreadsheet";

test("parseSpreadsheetRowsFromBuffer rejects unsupported extensions", async () => {
  await assert.rejects(
    parseSpreadsheetRowsFromBuffer(Buffer.from("rut,nombre\n12345678-5,Ana"), "datos.xlsm"),
    /unsupported_spreadsheet_type/,
  );
});

test("parseSpreadsheetRowsFromBuffer neutralizes prototype pollution headers", async () => {
  const rows = await parseSpreadsheetRowsFromBuffer(
    Buffer.from("__proto__,constructor,prototype,nombre\nadmin,true,yes,Ana"),
    "alumnos.csv",
  );

  assert.equal(rows.length, 1);
  const row = rows[0] as Record<string, unknown>;

  assert.equal(Object.prototype.hasOwnProperty.call(row, "__proto__"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(row, "constructor"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(row, "prototype"), false);
  assert.equal(row.col_1, "admin");
  assert.equal(row.col_2, "true");
  assert.equal(row.col_3, "yes");
  assert.equal(row.nombre, "Ana");
  assert.equal((Object.prototype as Record<string, unknown>).admin, undefined);
});