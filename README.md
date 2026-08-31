# komoda

Parametrický spec komody / prebaľovacieho pultu **1800 × 1050 × 800 mm**, 8 zásuviek (2 × 4), bezúchytkové otváranie cez gola profil.

Repo je zdroj dát pre vizualizér, nie len archív výkresu. Obrázok je referencia — čísla žijú v `spec/komoda.json`.

```
spec/komoda.json          ← jediný zdroj pravdy
spec/komoda.schema.json   ← štruktúra
spec/derived/             ← GENEROVANÉ (geometria + cutlist)
scripts/build.mjs         ← invarianty + generátor
docs/decisions.md         ← prečo sú čísla také, aké sú
docs/technicky-vykres.png ← pôvodný výkres, M 1:10
app/                      ← vizualizér (zatiaľ prázdny)
```

## Použitie

```bash
npm install
npm run validate     # schéma + aritmetické invarianty + regenerácia derived/
```

Validácia zlyhá pri každej nekonzistencii — napr. keď súčet výšok čiel a gola škár nedá 925 mm.

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
