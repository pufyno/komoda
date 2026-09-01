# komoda

Parametrický spec komody / prebaľovacieho pultu **1800 × 1050 × 800 mm**, 8 zásuviek (2 × 4), bezúchytkové otváranie cez gola profil.

Repo je zdroj dát pre vizualizér, nie len archív výkresu. Obrázok je referencia — čísla žijú v `spec/komoda.json`.

```
spec/komoda.json          ← jediný zdroj pravdy
spec/komoda.schema.json   ← štruktúra
spec/derived/             ← GENEROVANÉ (geometria + cutlist + diely v priestore)
scripts/build.mjs         ← invarianty + generátor
docs/decisions.md         ← prečo sú čísla také, aké sú
docs/technicky-vykres.png ← pôvodný výkres, M 1:10
app/                      ← vizualizér (Vite + react-three-fiber)
```

## Použitie

```bash
npm install
npm run validate     # schéma + aritmetické invarianty + regenerácia derived/
npm test             # testy validátora — pokazený spec musí build zhodiť
npm run dev          # vizualizér na http://localhost:5173
npm run build        # validácia + produkčný build do app/dist
```

Validácia zlyhá pri každej nekonzistencii — napr. keď súčet výšok čiel a gola škár nedá 925 mm, keď diel vytŕča z obálky 1800 × 1050 × 800, alebo keď sa dva diely prekrývajú mimo drážky.

`spec/derived/parts.json` obsahuje všetkých 89 dielov s pozíciou a rozmermi v priestore — to je vstup pre vizualizér v `app/`.

## Kľúčové rozmery

| | |
|---|---|
| Korpus | 1800 × 950 × 782 |
| Horná doska | 1800 × 800 × 25, presah vpredu 18 |
| Svetlosť priehradky | 873 × 907 |
| Čelá | 898 × 190 / 190 / 190 / 270, stredná škára 4 |
| Gola | J reveal 22 (hore), C reveal 21 (3× medzi radmi) |
| Zásuvkový box | 847 × 700, bočné plnovýsuvy |
| Nožičky | 6 × 100 mm nastaviteľné |

Odôvodnenie ku každému číslu je v [`docs/decisions.md`](docs/decisions.md).

## Otvorené

- **`gola-reveal-verify`** — reveal 21/22 mm je zvolený cieľ, nie odčítaný z datasheetu. Over v montážnom návode pri objednávke; ak sa líši, prepočítajú sa výšky čiel.
- `pad-dimensions` — prebaľovacia podložka sa ešte nekúpila, zóna 800 × 700 je placeholder.
- `decor-code` — svetlý dub, konkrétny kód podľa vzorkovníka.

## Vizualizér

Interaktívny 3D model v `app/`. Číta výhradne `spec/derived/parts.json` — **nepočíta žiadnu geometriu**.

- **klik** na diel → rozmer, materiál, hrana a rozhodnutie z `docs/decisions.md`, ktoré ten rozmer vysvetľuje
- **dvojklik** na zásuvku → vysunie sa na plný výsuv 700 mm a ukáže svetlosť boxu (815 × 130 × 668, spodný rad 815 × 180 × 668). Výsuv ide s ňou polovičnou dráhou, ako stredný člen naozaj — pri plnom otvorení trčí 342 mm pred korpus
- rozstrel na slideri, prepínanie vrstiev, obálka 1800 × 1050 × 800
- **nárys / bokorys / pôdorys** ako čisté SVG s kótami — ortografický priemet sa počíta priamo z `parts.json`, nie cez 3D kameru, takže čiary sú ostré a tlač je presná
- **rez A–A / B–B** s posuvnou rovinou. Šrafované diely rovina pretína, tenké sú za ňou, materiál pred ňou sa nekreslí. Stopa roviny je čiarkovane vyznačená v náryse. Rez A–A rozpisuje hĺbkovú skladbu 18 + 8 + 700 + 33 + 18 + 8 + 15 = 800 a svetlo 733 mm pre box; rez B–B šírkovú 18 + 873 + 18 + 873 + 18 = 1800
- **kovanie** — panel so zoznamom z `cutlist.json`, tlačidlo *len kovanie* a **röntgen**, v ktorom drevo zpriehľadní a kliká sa priamo na výsuvy a kotvy. Bez toho ich vidieť nie je: výsuv je medzi bokom a boxom, kotva za chrbtom
- **rozmery pri dieli** — po kliknutí sa okótuje priamo v scéne aj vo výkrese, nielen v tabuľke
- **cutlist** ako tlačiteľná tabuľka z `spec/derived/cutlist.json`
- prepínač **schéma / dekor** — schéma odlišuje diely podľa funkcie, dekor ukazuje svetlý dub, čiernu matnú golu a pozinkované výsuvy
- **smer kresby dubu** (D10) a banner s blokujúcou otvorenou otázkou zo `spec/komoda.json`

Pod 900 px sa layout prepne na mobilný: taby sú vodorovne rolovateľný pás s ☰ vľavo, bočný panel a detail sú spodné plachty, výkres sa dá rolovať v plnej čitateľnej veľkosti namiesto zmenšenia na šírku telefónu. Gestá v 3D patria OrbitControls, zásuvka sa otvára tlačidlom v detaile (dvojklik je na dotyk nespoľahlivý).

three.js sa načítava až pri prepnutí na 3D — kresby a cutlist sa otvárajú z 72 kB bundle.

Stack: Vite + React + [react-three-fiber](https://github.com/pmndrs/react-three-fiber). Výstup je statický, bez servera.

### Nasadenie na Vercel

Projekt sa importuje z tohto repa. Root Directory zostáva na koreni, aby build videl `spec/`:

Build command a output directory sú v `vercel.json`, takže sa nenastavujú klikaním. V dashboarde stačí Framework Preset `Other` a Root Directory na koreni repa (aby build videl `spec/`).

`npm run build` spúšťa validáciu pred buildom, takže **nekonzistentný spec zhodí deploy** a na produkciu sa nedostane.

## CI

`.github/workflows/ci.yml` beží na každý push do `main` a na každý PR:
validácia → testy → typecheck → build. Naviac kontroluje, že commitnuté
`spec/derived/` sedí s výstupom generátora — ručná editácia alebo zabudnuté
`npm run validate` neprejdú.

## Claude Code

`.claude/settings.json` deklaruje dve plugin marketplace a zapína po jednom plugine z každej, takže po klonovaní repa má každý rovnaké skills bez ručnej inštalácie.

| Plugin | Marketplace |
|---|---|
| `superpowers` | [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) |
| `mattpocock-skills` | [mattpocock/skills](https://github.com/mattpocock/skills) |

Pluginy sa načítavajú pri štarte session — po čerstvom klonovaní treba reštart.

Ručná inštalácia mimo repa (user scope):

```
/plugin marketplace add anthropics/claude-plugins-official
/plugin install superpowers@claude-plugins-official

/plugin marketplace add mattpocock/skills
/plugin install mattpocock-skills@mattpocock
```

Marketplace musí byť pridaná pred inštaláciou.

Pokyny pre prácu so specom sú v [`.claude/CLAUDE.md`](.claude/CLAUDE.md).
