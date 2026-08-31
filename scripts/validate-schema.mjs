#!/usr/bin/env node
/**
 * Validuje spec/komoda.json proti spec/komoda.schema.json.
 * Kontroluje ŠTRUKTÚRU. Aritmetiku kontroluje scripts/build.mjs.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(resolve(ROOT, p), "utf8"));

const schema = read("spec/komoda.schema.json");
const spec = process.env.KOMODA_SPEC
  ? JSON.parse(readFileSync(resolve(process.env.KOMODA_SPEC), "utf8"))
  : read("spec/komoda.json");

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const validate = ajv.compile(schema);

if (validate(spec)) {
  console.log("  ok    schéma");
  process.exit(0);
}

console.error(`\n${validate.errors.length} CHÝB V SCHÉME:`);
for (const e of validate.errors) {
  console.error(`  ✗ ${e.instancePath || "/"} ${e.message}${e.params ? " " + JSON.stringify(e.params) : ""}`);
}
console.error("");
process.exit(1);
