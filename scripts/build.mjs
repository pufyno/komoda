#!/usr/bin/env node
/**
 * Validuje invarianty spec/komoda.json a generuje odvodenú geometriu + cutlist.
 *
 * Ak validácia zlyhá, spec je nekonzistentný. Oprav SPEC, nie tento skript.
 *
 *   node scripts/build.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const spec = JSON.parse(readFileSync(resolve(ROOT, "spec/komoda.json"), "utf8"));

/* ------------------------------------------------------------------ */
/* kontrola invariantov                                               */
/* ------------------------------------------------------------------ */

const failures = [];
const checks = [];

function check(name, actual, expected, note = "") {
  const ok = Math.abs(actual - expected) < 0.001;
  checks.push({ name, actual, expected, ok, note });
  if (!ok) failures.push(`${name}: je ${actual}, má byť ${expected}${note ? ` — ${note}` : ""}`);
  return ok;
}

function assertTrue(name, cond, msg) {
  checks.push({ name, ok: cond, note: msg });
  if (!cond) failures.push(`${name}: ${msg}`);
}

const t = (key) => spec.materials[key].thickness;

const T_TOP = t("ldtd25");     // 25
const T_BODY = t("ldtd18");    // 18
const T_BOX = t("ldtd16");     // 16
const T_BACK = t("hdf8");      // 8

const { overall, carcass, fronts, drawers, gola, legs } = spec;

/* --- zvislá skladba ------------------------------------------------ */
check("celková výška = nožičky + korpus", legs.height + carcass.height, overall.height);

const frontZone = carcass.height - T_TOP;
const revealSum = gola.top.reveal + gola.between.reveal * gola.between.count;
const frontsSum = fronts.heights.reduce((a, b) => a + b, 0);
check("zóna čiel = čelá + gola škáry", frontsSum + revealSum, frontZone,
  `zóna je ${frontZone} mm (korpus ${carcass.height} − doska ${T_TOP})`);

assertTrue("počet gola C profilov", gola.between.count === fronts.rows - 1,
  `pri ${fronts.rows} radoch musí byť ${fronts.rows - 1} profilov medzi radmi, je ${gola.between.count}`);
assertTrue("počet výšok čiel", fronts.heights.length === fronts.rows,
  `${fronts.heights.length} výšok pre ${fronts.rows} radov`);
assertTrue("počet výšok boxov", drawers.boxSideHeights.length === fronts.rows,
  `${drawers.boxSideHeights.length} výšok pre ${fronts.rows} radov`);

/* --- vodorovná skladba --------------------------------------------- */
check("šírka = čelá + škáry",
  fronts.width * fronts.columns + fronts.centerGap * (fronts.columns - 1) + fronts.sideGap * 2,
  overall.width);

const carcassDepth = overall.depth - T_BODY;   // full overlay: čelo sedí na vonkajšku
const sideHeight = carcass.height - T_TOP - T_BODY;
const openingWidth = (overall.width - 2 * T_BODY - T_BODY) / fronts.columns;
const clearHeight = carcass.height - T_TOP - T_BODY;

check("svetlosť priehradky", openingWidth, 873);
check("svetlá výška korpusu", clearHeight, 907);
check("výška boku korpusu", sideHeight, 907);

/* --- zásuvky -------------------------------------------------------- */
const boxWidth = Math.floor(openingWidth - 2 * drawers.slide.clearancePerSide);
const usableDepth = carcassDepth - gola.between.profileDepth - T_BACK;
assertTrue("hĺbka na výsuv", usableDepth >= drawers.boxDepth,
  `k dispozícii ${usableDepth} mm, výsuv potrebuje ${drawers.boxDepth} mm`);
assertTrue("počet zásuviek", drawers.count === fronts.rows * fronts.columns,
  `${drawers.count} ≠ ${fronts.rows} × ${fronts.columns}`);

/* --- kotvenie ------------------------------------------------------- */
assertTrue("kotvenie cez výstuhu", spec.wallAnchor.through === "rearRail",
  "kotva musí ísť cez zadnú výstuhu — do 8 mm HDF ju dať nemožno");

/* ------------------------------------------------------------------ */
/* odvodená geometria (pre vizualizér)                                */
/* ------------------------------------------------------------------ */

// Súradnice: origin na podlahe, vľavo vpredu. X vpravo, Y hore, Z dozadu.
const carcassBottomY = legs.height;
const topUnderside = carcassBottomY + carcass.height - T_TOP;

const rows = [];
let cursorY = topUnderside - gola.top.reveal;   // pod J profilom
for (let i = 0; i < fronts.rows; i++) {
  const h = fronts.heights[i];
  rows.push({
    row: i,
    frontHeight: h,
    frontTopY: Math.round(cursorY * 100) / 100,
    frontBottomY: Math.round((cursorY - h) * 100) / 100,
    boxSideHeight: drawers.boxSideHeights[i],
  });
  cursorY -= h;
  if (i < fronts.rows - 1) cursorY -= gola.between.reveal;
}

check("spodná hrana posledného čela = spodok korpusu",
  rows[rows.length - 1].frontBottomY, carcassBottomY,
  "čelá musia presne vyplniť zónu");

const columnsX = [
  { col: 0, x0: fronts.sideGap, x1: fronts.sideGap + fronts.width },
  { col: 1, x0: fronts.sideGap + fronts.width + fronts.centerGap, x1: overall.width - fronts.sideGap },
];

const geometry = {
  generated: new Date().toISOString().slice(0, 10),
  source: "spec/komoda.json",
  warning: "GENEROVANÉ — needituj ručne. Zmeň spec a spusti npm run build.",
  carcass: {
    width: overall.width,
    height: carcass.height,
    depth: carcassDepth,
    bottomY: carcassBottomY,
    sideHeight,
    openingWidth,
    clearHeight,
    dividerX: (overall.width - T_BODY) / 2,
  },
  top: {
    y0: topUnderside,
    y1: topUnderside + T_TOP,
    depth: carcass.parts.top.depth,
    frontOverhang: carcass.parts.top.overhang.front,
  },
  frontZone: { height: frontZone, y0: carcassBottomY, y1: topUnderside },
  rows,
  columnsX,
  drawerBox: { width: boxWidth, depth: drawers.boxDepth, usableDepth },
  changingPad: spec.changingPad.thickness === null ? { status: "PLACEHOLDER" } : {
    x0: (overall.width - spec.changingPad.width) / 2,
    z0: overall.depth - spec.changingPad.depth,
    surfaceY: topUnderside + T_TOP + spec.changingPad.thickness,
  },
};

/* ------------------------------------------------------------------ */
/* cutlist                                                            */
/* ------------------------------------------------------------------ */

const parts = [];
const add = (group, name, qty, l, w, thk, material, note = "") =>
  parts.push({ group, name, qty, length: l, width: w, thickness: thk, material, note });

add("korpus", "Dno", 1, overall.width, carcassDepth, T_BODY, "ldtd18", "nesie nožičky");
add("korpus", "Bok", 2, sideHeight, carcassDepth, T_BODY, "ldtd18", "stojí na dne");
add("korpus", "Stredná priečka", 1, sideHeight, carcassDepth, T_BODY, "ldtd18");
add("korpus", "Horná doska", 1, overall.width, carcass.parts.top.depth, T_TOP, "ldtd25", "presah vpredu 18 mm");
add("korpus", "Zadná výstuha", 1, overall.width - 2 * T_BODY, carcass.parts.rearRail.height, T_BODY, "ldtd18", "kotvenie do steny");

const grooveDepth = carcass.parts.back.groove.depth;
add("korpus", "Chrbát", carcass.parts.back.count,
  clearHeight + grooveDepth, openingWidth + 2 * grooveDepth, T_BACK, "hdf8",
  `drážka ${carcass.parts.back.groove.width} × ${grooveDepth} mm`);

const byHeight = {};
fronts.heights.forEach((h) => { byHeight[h] = (byHeight[h] || 0) + fronts.columns; });
for (const [h, qty] of Object.entries(byHeight)) {
  add("čelá", `Čelo ${h} mm`, qty, fronts.width, Number(h), T_BODY, "ldtd18", "ABS 2 mm dookola");
}

const boxGroove = 8;
fronts.heights.forEach((_, i) => {
  const h = drawers.boxSideHeights[i];
  const qty = fronts.columns;
  add("zásuvky", `Bok boxu (rad ${i + 1})`, qty * 2, drawers.boxDepth, h, T_BOX, "ldtd16");
  add("zásuvky", `Predok/zadok boxu (rad ${i + 1})`, qty * 2, boxWidth - 2 * T_BOX, h, T_BOX, "ldtd16");
  add("zásuvky", `Dno boxu (rad ${i + 1})`, qty,
    boxWidth - 2 * T_BOX + 2 * boxGroove, drawers.boxDepth - 2 * T_BOX + 2 * boxGroove, t("hdf10"), "hdf10");
});

const hardware = [
  { item: "Gola profil J (pod dosku)", qty: 1, length: gola.top.lengthEach, note: `reveal ${gola.top.reveal} mm, ${gola.finish}` },
  { item: "Gola profil C (medzi radmi)", qty: gola.between.count, length: gola.between.lengthEach, note: `reveal ${gola.between.reveal} mm, ${gola.finish}` },
  { item: "Bočný plnovýsuv s tlmením", qty: `${drawers.count} párov`, length: drawers.slide.length, note: `${drawers.slide.clearancePerSide} mm/stranu, ${drawers.slide.loadKg} kg` },
  { item: "Nastaviteľná nožička", qty: legs.count, length: legs.height, note: legs.layout },
  { item: "Hmoždinka do tehly", qty: spec.wallAnchor.count, length: null, note: spec.wallAnchor.fastener },
  { item: "Kolík + excenter", qty: "podľa technológie", length: null, note: spec.joinery.carcass },
];

/* ------------------------------------------------------------------ */
/* výstup                                                             */
/* ------------------------------------------------------------------ */

mkdirSync(resolve(ROOT, "spec/derived"), { recursive: true });
writeFileSync(resolve(ROOT, "spec/derived/geometry.json"), JSON.stringify(geometry, null, 2) + "\n");
writeFileSync(resolve(ROOT, "spec/derived/cutlist.json"), JSON.stringify({
  generated: geometry.generated,
  source: "spec/komoda.json",
  warning: geometry.warning,
  parts,
  hardware,
}, null, 2) + "\n");

const pad = (s, n) => String(s).padEnd(n);
console.log("\nINVARIANTY");
for (const c of checks) {
  const mark = c.ok ? "  ok  " : " CHYBA";
  const val = c.expected !== undefined ? `${c.actual} = ${c.expected}` : "";
  console.log(`${mark}  ${pad(c.name, 44)} ${val}`);
}

if (failures.length) {
  console.error(`\n${failures.length} CHÝB:`);
  failures.forEach((f) => console.error(`  ✗ ${f}`));
  console.error("\nSpec je nekonzistentný. Oprav spec/komoda.json.\n");
  process.exit(1);
}

console.log("\nODVODENÉ");
console.log(`  korpus            ${overall.width} × ${carcass.height} × ${carcassDepth}`);
console.log(`  svetlosť          ${openingWidth} × ${clearHeight}`);
console.log(`  čelo              ${fronts.width} × [${fronts.heights.join(", ")}]`);
console.log(`  box               ${boxWidth} × ${drawers.boxDepth}`);
console.log(`  hĺbka na výsuv    ${usableDepth} (potreba ${drawers.boxDepth})`);
console.log(`\n  ${parts.reduce((a, p) => a + p.qty, 0)} dielov v cutliste`);
console.log("  → spec/derived/geometry.json");
console.log("  → spec/derived/cutlist.json\n");
