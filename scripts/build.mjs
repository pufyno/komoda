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

// KOMODA_SPEC / KOMODA_OUT umožňujú spustiť build nad iným specom a zapísať
// inam. Používa to testovacia sada — bez toho by testy prepisovali derived/.
const SPEC_PATH = process.env.KOMODA_SPEC
  ? resolve(process.env.KOMODA_SPEC)
  : resolve(ROOT, "spec/komoda.json");
const OUT_DIR = process.env.KOMODA_OUT
  ? resolve(process.env.KOMODA_OUT)
  : resolve(ROOT, "spec/derived");

const spec = JSON.parse(readFileSync(SPEC_PATH, "utf8"));

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
assertTrue("spodný rad je najvyšší", 
  fronts.heights[fronts.rows - 1] > Math.max(...fronts.heights.slice(0, -1)),
  `spodné čelo ${fronts.heights[fronts.rows - 1]} mm nie je vyššie než ostatné (${fronts.heights.slice(0, -1).join(", ")}) — stratí sa jediná hlboká zásuvka, pozri D5`);
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

/* --- referenčné roviny --------------------------------------------- */
const carcassZ0 = overall.depth - carcassDepth;          // 18 — čelná hrana korpusu
const carcassZ1 = overall.depth;                          // 800 — zadná hrana
const bottomY0 = legs.height;                             // 100
const bottomY1 = bottomY0 + T_BODY;                       // 118
const backZ1 = carcassZ1 - carcass.parts.back.groove.insetFromRear;
const backZ0 = backZ1 - T_BACK;
const railZ1 = backZ0;
const railZ0 = railZ1 - T_BODY;
const golaZ0 = 0;                                         // lícuje s rovinou čiel
const golaZ1 = golaZ0 + gola.between.profileDepth;        // 26 — laps na čelnú hranu korpusu
const golaLap = golaZ1 - carcassZ0;                       // 8 — prekrytie čelnej hrany
const boxZ0 = golaZ1;
const boxZ1 = boxZ0 + drawers.boxDepth;
const dividerX0 = (overall.width - T_BODY) / 2;
const openings = [
  { x0: T_BODY, x1: dividerX0 },
  { x0: dividerX0 + T_BODY, x1: overall.width - T_BODY },
];

check("otvor vľavo = svetlosť", openings[0].x1 - openings[0].x0, openingWidth);
check("otvor vpravo = svetlosť", openings[1].x1 - openings[1].x0, openingWidth);
assertTrue("box sa zmestí za gola profil", boxZ1 <= backZ0,
  `box končí na z = ${boxZ1}, chrbát začína na z = ${backZ0}`);

/* --- zásuvky -------------------------------------------------------- */
const boxWidth = Math.floor(openingWidth - 2 * drawers.slide.clearancePerSide);
// Priestor pre box začína za gola profilom (z 26). Končí na prvej prekážke:
// pod výstuhou je to chrbát (z 777), ale horný rad ide za zadnú výstuhu, ktorá
// visí nižšie (z 759). Väzbové číslo je preto to menšie.
// Pozor, nie carcassDepth − profileDepth − T_BACK: gola začína na z 0, do
// korpusu teda zasahuje len 8 mm, a chrbát je odsadený od zadnej hrany. Tá
// formulka dávala 748 — zhodou okolností dosť konzervatívne na to, aby výstuhu
// úplne zakryla.
const usableDepthBelowRail = backZ0 - boxZ0;   // 751
const usableDepth = railZ0 - boxZ0;            // 733 — horný rad za výstuhou
assertTrue("hĺbka na výsuv", usableDepth >= drawers.boxDepth,
  `k dispozícii ${usableDepth} mm (z ${boxZ0} po výstuhu na ${railZ0}), výsuv potrebuje ${drawers.boxDepth} mm`);
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
  generated: spec.revision,
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
  drawerBox: {
    width: boxWidth,
    depth: drawers.boxDepth,
    usableDepth,
    usableDepthBelowRail,
    spaceZ: [boxZ0, railZ0],
  },
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

// V strednej priečke sú drážky z oboch strán. Pri hĺbke 10 mm v 18 mm
// priečke by sa stretli, preto je tam drážka plytšia — 2 mm materiálu
// medzi nimi. Chrbát preto nie je symetrický: hlbšia strana do boku,
// plytšia do priečky.
const dividerGrooveDepth = Math.floor((T_BODY - 2) / 2);
assertTrue("drážka v priečke udrží chrbát", dividerGrooveDepth >= T_BACK,
  `drážka ${dividerGrooveDepth} mm pre ${T_BACK} mm chrbát — v ${T_BODY} mm priečke sa hlbšia z oboch strán nezmestí`);
const backWidth = openingWidth + grooveDepth + dividerGrooveDepth;

add("korpus", "Chrbát", carcass.parts.back.count,
  clearHeight + grooveDepth, backWidth, T_BACK, "hdf8",
  `drážka ${carcass.parts.back.groove.width} mm; ${grooveDepth} do boku, ${dividerGrooveDepth} do priečky`);

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

/* ------------------------------------------------------------------ */
/* umiestnenie dielov v priestore (pre vizualizér)                     */
/* ------------------------------------------------------------------ */

/*
 * Súradnice: origin na podlahe, vľavo vpredu. X vpravo, Y hore, Z dozadu.
 * Každý diel má position = minimálny roh kvádra, size = [dx, dy, dz].
 *
 * PREDPOKLADY UMIESTNENIA — nie sú v specu, lebo neovplyvňujú výrobu.
 * Sú to len polohy pre vizualizáciu. Ak sa ukážu ako nesprávne, meň ich
 * TU, nie v specu.
 */
const PLACEMENT = {
  drawerBoxVerticalAlign: "center",   // box zvislo na stred svojho čela
  drawerBoxBottomInset: 10,           // dno boxu 10 mm nad spodnou hranou bokov
  slideHeight: 45,                    // viditeľná výška plnovýsuvu
  legDiameter: 50,                    // nožička je valec
  anchorLength: 80,                   // dĺžka hmoždinky (do steny)
  anchorDiameter: 10,
  anchorOffsetFromDivider: 40,        // stredná kotva vedľa priečky, nie do jej hrany
};

const assumptions = [
  `Zásuvkový box je v otvore vycentrovaný vodorovne (${(openingWidth - boxWidth) / 2} mm na stranu, výsuv potrebuje ${drawers.slide.clearancePerSide}).`,
  "Zásuvkový box je zvislo vycentrovaný na svoje čelo.",
  `Predná hrana boxu začína za gola profilom (z = ${gola.between.profileDepth} mm).`,
  `Gola profil lícuje s rovinou čiel a prekrýva čelnú hranu korpusu o ${gola.between.profileDepth - T_BODY} mm.`,
  `Stredná kotva je odsadená ${PLACEMENT.anchorOffsetFromDivider} mm od priečky, aby nešla do jej hrany.`,
  `Gola profil je modelovaný ako viditeľná škára × hĺbka profilu; skutočný prierez je vysoký ${gola.between.profileHeight} mm a schováva sa za čelami.`,
  "Nožičky sú valce s odsadením cornerInset od hrán korpusu.",
];

const P = [];
const DRAWERS = [];
const place = (id, group, label, pos, size, material, extra = {}) => {
  const [x, y, z] = pos.map((n) => Math.round(n * 100) / 100);
  const [sx, sy, sz] = size.map((n) => Math.round(n * 100) / 100);
  P.push({
    id, group, label, material,
    size: [sx, sy, sz],
    position: [x, y, z],
    center: [Math.round((x + sx / 2) * 100) / 100, Math.round((y + sy / 2) * 100) / 100, Math.round((z + sz / 2) * 100) / 100],
    shape: "box",
    ...extra,
  });
};

/* --- nožičky -------------------------------------------------------- */
const legZ = [carcassZ0 + legs.cornerInset, carcassZ1 - legs.cornerInset];
const legX = [legs.cornerInset, dividerX0 + T_BODY / 2, overall.width - legs.cornerInset];
let legN = 0;
for (const lx of legX) {
  for (const lz of legZ) {
    legN += 1;
    place(`leg-${legN}`, "nožičky", "Nastaviteľná nožička",
      [lx - PLACEMENT.legDiameter / 2, 0, lz - PLACEMENT.legDiameter / 2],
      [PLACEMENT.legDiameter, legs.height, PLACEMENT.legDiameter],
      null, { shape: "cylinder", diameter: PLACEMENT.legDiameter, decision: "D8", hardware: true });
  }
}
assertTrue("počet nožičiek", legN === legs.count, `vygenerovaných ${legN}, spec hovorí ${legs.count}`);

/* --- korpus --------------------------------------------------------- */
place("bottom", "korpus", "Dno", [0, bottomY0, carcassZ0], [overall.width, T_BODY, carcassDepth], "ldtd18",
  { decision: "D1", note: "nesie nožičky" });
place("side-left", "korpus", "Bok ľavý", [0, bottomY1, carcassZ0], [T_BODY, sideHeight, carcassDepth], "ldtd18",
  { decision: "D1" });
place("side-right", "korpus", "Bok pravý", [overall.width - T_BODY, bottomY1, carcassZ0], [T_BODY, sideHeight, carcassDepth], "ldtd18",
  { decision: "D1" });
place("divider", "korpus", "Stredná priečka", [dividerX0, bottomY1, carcassZ0], [T_BODY, sideHeight, carcassDepth], "ldtd18",
  { note: "výrez 100 × 18 vzadu hore pre zadnú výstuhu" });
place("top", "korpus", "Horná doska", [0, topUnderside, 0], [overall.width, T_TOP, carcass.parts.top.depth], "ldtd25",
  { decision: "D1", note: `presah vpredu ${carcass.parts.top.overhang.front} mm` });
place("rear-rail", "korpus", "Zadná výstuha", [T_BODY, topUnderside - carcass.parts.rearRail.height, railZ0],
  [overall.width - 2 * T_BODY, carcass.parts.rearRail.height, T_BODY], "ldtd18",
  { decision: "D7", note: "kotvenie do steny" });

const gd = carcass.parts.back.groove.depth;
openings.forEach((o, i) => {
  const leftInset = i === 0 ? gd : dividerGrooveDepth;    // vonkajší bok vs. priečka
  place(`back-${i + 1}`, "korpus", "Chrbát", [o.x0 - leftInset, bottomY1 - gd, backZ0],
    [backWidth, clearHeight + gd, T_BACK], "hdf8",
    { note: `${gd} mm do boku, ${dividerGrooveDepth} mm do priečky` });
});

/* --- čelá, gola, zásuvky, výsuvy ------------------------------------ */
place("gola-j", "gola", `Gola profil J (reveal ${gola.top.reveal})`,
  [0, topUnderside - gola.top.reveal, golaZ0], [overall.width, gola.top.reveal, gola.between.profileDepth], null,
  { decision: "D2", hardware: true, profileType: gola.top.profileType, profileHeight: gola.between.profileHeight, finish: gola.finish });

rows.forEach((r, i) => {
  if (i < rows.length - 1) {
    place(`gola-c-${i + 1}`, "gola", `Gola profil C (reveal ${gola.between.reveal})`,
      [0, r.frontBottomY - gola.between.reveal, golaZ0],
      [overall.width, gola.between.reveal, gola.between.profileDepth], null,
      { decision: "D2", hardware: true, profileType: gola.between.profileType, profileHeight: gola.between.profileHeight, finish: gola.finish });
  }

  columnsX.forEach((c, j) => {
    const o = openings[j];
    const bx0 = o.x0 + (openingWidth - boxWidth) / 2;
    const bh = drawers.boxSideHeights[i];
    const by0 = r.frontBottomY + (r.frontHeight - bh) / 2;
    const tag = `r${i + 1}c${j + 1}`;

    place(`front-${tag}`, "čelá", `Čelo ${r.frontHeight} mm`, [c.x0, r.frontBottomY, 0],
      [fronts.width, r.frontHeight, T_BODY], "ldtd18",
      { decision: i === rows.length - 1 ? "D5" : "D4", edging: "ABS 2 mm dookola",
        grain: fronts.grain.direction, drawer: tag });

    // Vnútorný priestor boxu — to, čo sa doň reálne zmestí.
    const inner = {
      width: boxWidth - 2 * T_BOX,
      depth: drawers.boxDepth - 2 * T_BOX,
      height: bh - PLACEMENT.drawerBoxBottomInset - t("hdf10"),
    };
    assertTrue(`svetlosť boxu (rad ${i + 1})`, inner.height > 0 && inner.width > 0 && inner.depth > 0,
      `vyšla ${inner.width} × ${inner.height} × ${inner.depth}`);
    DRAWERS.push({
      id: tag, row: i, col: j,
      frontHeight: r.frontHeight,
      boxSideHeight: bh,
      inner,
      travel: drawers.boxDepth,
      openTo: [bx0, by0, boxZ0],
    });

    place(`box-side-l-${tag}`, "zásuvky", `Bok boxu (rad ${i + 1})`, [bx0, by0, boxZ0],
      [T_BOX, bh, drawers.boxDepth], "ldtd16", { decision: "D6", drawer: tag });
    place(`box-side-r-${tag}`, "zásuvky", `Bok boxu (rad ${i + 1})`, [bx0 + boxWidth - T_BOX, by0, boxZ0],
      [T_BOX, bh, drawers.boxDepth], "ldtd16", { decision: "D6", drawer: tag });
    place(`box-front-${tag}`, "zásuvky", `Predok boxu (rad ${i + 1})`, [bx0 + T_BOX, by0, boxZ0],
      [boxWidth - 2 * T_BOX, bh, T_BOX], "ldtd16", { decision: "D6", drawer: tag });
    place(`box-back-${tag}`, "zásuvky", `Zadok boxu (rad ${i + 1})`, [bx0 + T_BOX, by0, boxZ1 - T_BOX],
      [boxWidth - 2 * T_BOX, bh, T_BOX], "ldtd16", { decision: "D6", drawer: tag });
    place(`box-bottom-${tag}`, "zásuvky", `Dno boxu (rad ${i + 1})`,
      [bx0 + T_BOX - boxGroove, by0 + PLACEMENT.drawerBoxBottomInset, boxZ0 + T_BOX - boxGroove],
      [boxWidth - 2 * T_BOX + 2 * boxGroove, t("hdf10"), drawers.boxDepth - 2 * T_BOX + 2 * boxGroove], "hdf10",
      { decision: "D6", drawer: tag, note: `v drážke ${boxGroove} mm` });

    const sy = by0 + (bh - PLACEMENT.slideHeight) / 2;
    place(`slide-l-${tag}`, "výsuvy", "Bočný plnovýsuv", [o.x0, sy, boxZ0],
      [drawers.slide.clearancePerSide, PLACEMENT.slideHeight, drawers.slide.length], null,
      { decision: "D6", hardware: true, loadKg: drawers.slide.loadKg });
    place(`slide-r-${tag}`, "výsuvy", "Bočný plnovýsuv", [o.x1 - drawers.slide.clearancePerSide, sy, boxZ0],
      [drawers.slide.clearancePerSide, PLACEMENT.slideHeight, drawers.slide.length], null,
      { decision: "D6", hardware: true, loadKg: drawers.slide.loadKg });
  });
});

/* --- kotvenie ------------------------------------------------------- */
const anchorX = [legs.cornerInset, dividerX0 - PLACEMENT.anchorOffsetFromDivider, overall.width - legs.cornerInset];
anchorX.forEach((ax, i) => {
  place(`anchor-${i + 1}`, "kotvenie", "Hmoždinka do steny",
    [ax - PLACEMENT.anchorDiameter / 2, topUnderside - carcass.parts.rearRail.height / 2, railZ0],
    [PLACEMENT.anchorDiameter, PLACEMENT.anchorDiameter, T_BODY], null,
    { shape: "cylinder", axis: "z", decision: "D7", hardware: true,
      fastener: spec.wallAnchor.fastener,
      note: `prechádza výstuhou; do steny pokračuje ďalších ${PLACEMENT.anchorLength - T_BODY} mm` });
});
assertTrue("počet pohyblivých zásuviek", DRAWERS.length === drawers.count,
  `vygenerovaných ${DRAWERS.length}, spec hovorí ${drawers.count}`);
assertTrue("počet kotiev", anchorX.length === spec.wallAnchor.count,
  `vygenerovaných ${anchorX.length}, spec hovorí ${spec.wallAnchor.count}`);

/* ------------------------------------------------------------------ */
/* kontrola obálky a kolízií                                           */
/* ------------------------------------------------------------------ */

const EPS = 0.001;
const outside = P.filter((p) =>
  p.position[0] < -EPS || p.position[1] < -EPS || p.position[2] < -EPS ||
  p.position[0] + p.size[0] > overall.width + EPS ||
  p.position[1] + p.size[1] > overall.height + EPS ||
  p.position[2] + p.size[2] > overall.depth + EPS);

assertTrue("všetky diely v obálke", outside.length === 0,
  outside.length ? `mimo 1800 × 1050 × 800: ${outside.map((p) => p.id).join(", ")}` : "");

/*
 * Povolené prieniky. Každý je stolársky zámer, nie chyba modelu —
 * drážka alebo výrez. Prienik mimo tohto zoznamu = chyba.
 */
const ALLOWED = [
  { a: /^back-/, b: /^side-/, axis: 0, expect: gd, reason: "chrbát v drážke v boku" },
  { a: /^back-/, b: /^divider$/, axis: 0, expect: dividerGrooveDepth, reason: "chrbát v plytšej drážke v priečke" },
  { a: /^gola-/, b: /^(side-|divider$)/, axis: 2, expect: golaLap, reason: "gola profil nalícovaný na čelnú hranu korpusu" },
  { a: /^anchor-/, b: /^rear-rail$/, axis: 2, expect: T_BODY, reason: "kotva prechádza zadnou výstuhou" },
  { a: /^back-/, b: /^bottom$/, axis: 1, expect: gd, reason: "chrbát v drážke v dne" },
  { a: /^rear-rail$/, b: /^divider$/, axis: 0, expect: T_BODY, reason: "výstuha prechádza výrezom v priečke" },
  { a: /^box-bottom-/, b: /^box-side-/, axis: 0, expect: boxGroove, reason: "dno boxu v drážke boku" },
  { a: /^box-bottom-/, b: /^box-(front|back)-/, axis: 2, expect: boxGroove, reason: "dno boxu v drážke predku/zadku" },
];

const overlapOf = (p, q) => [0, 1, 2].map((k) =>
  Math.min(p.position[k] + p.size[k], q.position[k] + q.size[k]) - Math.max(p.position[k], q.position[k]));

const intersections = [];
const badIntersections = [];
for (let i = 0; i < P.length; i++) {
  for (let j = i + 1; j < P.length; j++) {
    const ov = overlapOf(P[i], P[j]);
    if (ov.some((v) => v <= EPS)) continue;   // dotyk alebo medzera, nie prienik
    const rule = ALLOWED.find((r) =>
      (r.a.test(P[i].id) && r.b.test(P[j].id)) || (r.a.test(P[j].id) && r.b.test(P[i].id)));
    const rec = { a: P[i].id, b: P[j].id, overlap: ov.map((v) => Math.round(v * 100) / 100) };
    if (!rule) { badIntersections.push(rec); continue; }
    if (Math.abs(ov[rule.axis] - rule.expect) > EPS) {
      badIntersections.push({ ...rec, rule: rule.reason, expected: rule.expect, got: ov[rule.axis] });
      continue;
    }
    intersections.push({ ...rec, reason: rule.reason });
  }
}

assertTrue("žiadne nechcené prieniky dielov", badIntersections.length === 0,
  badIntersections.length
    ? badIntersections.slice(0, 6).map((b) => `${b.a} × ${b.b} [${b.overlap.join(", ")}]${b.rule ? ` (${b.rule}: čakalo sa ${b.expected}, je ${b.got})` : ""}`).join("; ")
    : "");

const partsDoc = {
  generated: geometry.generated,
  source: "spec/komoda.json",
  warning: geometry.warning,
  units: spec.units,
  axes: { origin: "podlaha, vľavo vpredu", x: "vpravo", y: "hore", z: "dozadu" },
  envelope: { width: overall.width, height: overall.height, depth: overall.depth },
  note: "position = minimálny roh kvádra, size = [dx, dy, dz], center = stred (pre BoxGeometry).",
  assumptions,
  groups: [...new Set(P.map((p) => p.group))],
  drawers: DRAWERS,
  parts: P,
  intendedIntersections: intersections,
};

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

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(resolve(OUT_DIR, "geometry.json"), JSON.stringify(geometry, null, 2) + "\n");
writeFileSync(resolve(OUT_DIR, "cutlist.json"), JSON.stringify({
  generated: geometry.generated,
  source: "spec/komoda.json",
  warning: geometry.warning,
  parts,
  hardware,
}, null, 2) + "\n");
writeFileSync(resolve(OUT_DIR, "parts.json"), JSON.stringify(partsDoc, null, 2) + "\n");

console.log("\nODVODENÉ");
console.log(`  korpus            ${overall.width} × ${carcass.height} × ${carcassDepth}`);
console.log(`  svetlosť          ${openingWidth} × ${clearHeight}`);
console.log(`  čelo              ${fronts.width} × [${fronts.heights.join(", ")}]`);
console.log(`  box               ${boxWidth} × ${drawers.boxDepth}`);
console.log(`  hĺbka na výsuv    ${usableDepth} = z ${boxZ0}..${railZ0} za výstuhou, ${usableDepthBelowRail} pod ňou (potreba ${drawers.boxDepth})`);
console.log(`\n  ${parts.reduce((a, p) => a + p.qty, 0)} dielov v cutliste`);
console.log(`  ${P.length} dielov umiestnených v priestore`);
console.log("  → spec/derived/geometry.json");
console.log("  → spec/derived/cutlist.json");
console.log("  → spec/derived/parts.json\n");
