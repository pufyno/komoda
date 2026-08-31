/**
 * Testy validátora — nie aplikácie.
 *
 * Otázka, na ktorú odpovedajú: keby niekto o pol roka "opravil" spec spôsobom,
 * ktorý vyzerá rozumne, zachytí to build? Každý prípad zámerne pokazí
 * spec/komoda.json a tvrdí, že build skončí nenulovo a povie prečo.
 *
 * Prípady 1–4 sú presne tie "typické chybné opravy" z .claude/CLAUDE.md.
 *
 * Beží nad kópiou specu v dočasnom adresári (KOMODA_SPEC / KOMODA_OUT),
 * takže skutočné spec/derived/ testy nikdy nesiahnu.
 */

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BUILD = resolve(ROOT, "scripts/build.mjs");
const SCHEMA = resolve(ROOT, "scripts/validate-schema.mjs");
const BASE = JSON.parse(readFileSync(resolve(ROOT, "spec/komoda.json"), "utf8"));

let work;
before(() => { work = mkdtempSync(join(tmpdir(), "komoda-test-")); });
after(() => rmSync(work, { recursive: true, force: true }));

/** Spustí generátor nad zmeneným specom. Vráti { code, out, err, outDir }. */
function run(script, mutate) {
  const spec = structuredClone(BASE);
  if (mutate) mutate(spec);
  const specPath = join(work, `spec-${Math.random().toString(36).slice(2)}.json`);
  const outDir = join(work, `out-${Math.random().toString(36).slice(2)}`);
  writeFileSync(specPath, JSON.stringify(spec, null, 2));
  const r = spawnSync(process.execPath, [script], {
    encoding: "utf8",
    env: { ...process.env, KOMODA_SPEC: specPath, KOMODA_OUT: outDir },
  });
  return { code: r.status, out: r.stdout ?? "", err: r.stderr ?? "", outDir };
}

/** Build musí spadnúť a v hlásení musí zaznieť `reason`. */
function expectFail(mutate, reason, script = BUILD) {
  const r = run(script, mutate);
  const all = r.out + r.err;
  assert.notEqual(r.code, 0, `build prešiel, hoci nemal:\n${all}`);
  assert.match(all, reason, `build spadol, ale z iného dôvodu:\n${all}`);
  return r;
}

describe("referenčný spec", () => {
  test("prejde všetkými invariantmi", () => {
    const r = run(BUILD, null);
    assert.equal(r.code, 0, r.out + r.err);
    assert.doesNotMatch(r.out, /CHYBA/);
  });

  test("prejde schémou", () => {
    assert.equal(run(SCHEMA, null).code, 0);
  });

  test("vygeneruje všetky tri odvodené súbory", () => {
    const r = run(BUILD, null);
    assert.deepEqual(
      readdirSync(r.outDir).sort(),
      ["cutlist.json", "geometry.json", "parts.json"],
    );
  });

  test("je deterministický — dva behy dajú bajt na bajt to isté", () => {
    // Poistka proti návratu `generated: new Date()`: derived súbory sa nesmú
    // meniť len tým, že build zbehol iný deň.
    const a = run(BUILD, null);
    const b = run(BUILD, null);
    for (const f of ["geometry.json", "cutlist.json", "parts.json"]) {
      assert.equal(
        readFileSync(join(a.outDir, f), "utf8"),
        readFileSync(join(b.outDir, f), "utf8"),
        `${f} sa medzi dvoma behmi zmenil`,
      );
    }
  });

  test("generated je revízia specu, nie dnešný dátum", () => {
    const r = run(BUILD, (s) => { s.revision = "1999-01-01"; });
    const g = JSON.parse(readFileSync(join(r.outDir, "geometry.json"), "utf8"));
    assert.equal(g.generated, "1999-01-01");
  });
});

describe("typické chybné opravy (.claude/CLAUDE.md)", () => {
  test("zjednotenie gola reveal na 21 rozbije zónu čiel", () => {
    // Vrchný J profil má 22 mm, medziľahlé C profily 21. Kto to "zarovná",
    // stratí 1 mm a súčet čiel + škár už nesedí na 925 mm.
    expectFail((s) => { s.gola.top.reveal = 21; }, /zóna čiel/);
  });

  test("zrovnanie čiel na 4 × 210 zoberie jedinú hlbokú zásuvku", () => {
    // Súčet 840 + 85 = 925 sedí, takže sumu to prejde — chytiť to musí
    // invariant o odstupňovaní (D5).
    expectFail((s) => { s.fronts.heights = [210, 210, 210, 210]; }, /spodný rad je najvyšší/);
  });

  test("zaokrúhlenie hĺbky boxu na 750 prekročí využiteľnú hĺbku", () => {
    // Za gola profilom a chrbtom zostáva 748 mm. 750 sa tam nezmestí.
    expectFail((s) => { s.drawers.boxDepth = 750; }, /hĺbka na výsuv/);
  });

  test("wallAnchor.required: false neprejde schémou", () => {
    expectFail((s) => { s.wallAnchor.required = false; }, /required/, SCHEMA);
  });
});

describe("zvislá a vodorovná skladba", () => {
  test("zmena výšky korpusu bez zmeny nožičiek", () => {
    expectFail((s) => { s.carcass.height = 900; }, /celková výška/);
  });

  test("zmena stredovej škáry bez prepočtu šírky čiel", () => {
    expectFail((s) => { s.fronts.centerGap = 3; }, /šírka = čelá \+ škáry/);
  });

  test("piaty rad čiel bez piateho gola profilu", () => {
    expectFail((s) => { s.fronts.rows = 5; }, /počet gola C profilov/);
  });

  test("tenší korpusový materiál nechá chrbát bez opory", () => {
    // Drážka v priečke sa počíta ako (hrúbka − 2) / 2, aby sa dve protiľahlé
    // nestretli. Pri 16 mm vyjde 7 mm, čo je menej než 8 mm chrbát.
    expectFail((s) => { s.materials.ldtd18.thickness = 16; }, /drážka v priečke/);
  });
});

describe("kolízie a obálka", () => {
  test("hlbší korpus než obálka vysunie diely von", () => {
    expectFail((s) => { s.overall.depth = 700; }, /všetky diely v obálke|box sa zmestí|hĺbka na výsuv/);
  });

  test("hlbší gola profil zareže do boxu", () => {
    expectFail((s) => { s.gola.between.profileDepth = 80; }, /prieniky dielov|box sa zmestí|hĺbka na výsuv/);
  });
});

describe("nekonzistentný spec nezanechá odvodené súbory", () => {
  test("pri páde sa nič nezapíše", () => {
    const r = run(BUILD, (s) => { s.carcass.height = 900; });
    assert.notEqual(r.code, 0);
    assert.equal(existsSync(r.outDir), false, "build zapísal derived súbory, hoci spadol");
  });
});
