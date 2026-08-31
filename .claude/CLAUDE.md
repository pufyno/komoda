# komoda — pokyny pre prácu s projektom

Projekt je **parametrický spec kusu nábytku** (komoda / prebaľovací pult, 1800 × 1050 × 800 mm) a nad ním sa stavia vizualizér.

## Zdroj pravdy

`spec/komoda.json` je **jediný** zdroj pravdy pre geometriu.

- NIKDY nehardcoduj rozmery do kódu v `app/`. Vždy čítaj zo specu alebo z `spec/derived/`.
- `spec/derived/` je GENEROVANÉ. Needituj ho ručne — prepíše sa.
- Odvodené hodnoty (hĺbka korpusu, svetlosť, šírka boxu, pozície radov) sa **počítajú**, nezapisujú do specu.

## Po každej zmene specu

```bash
npm run validate
```

Spustí kontrolu schémy aj aritmetických invariantov a pregeneruje `spec/derived/`.
Pri nekonzistentnom spece sa **nezapíše nič** — derived súbory zostanú také, aké boli.

```bash
npm test
```

`test/invariants.test.mjs` testuje validátor, nie nábytok: každý prípad zámerne
pokazí spec a tvrdí, že build spadne a povie prečo. Prvé štyri sú presne tie
chybné „opravy" nižšie. Beží nad kópiou specu v temp adresári
(`KOMODA_SPEC` / `KOMODA_OUT`), takže sa `spec/derived/` nedotkne.
Keď pridáš invariant, pridaj k nemu prípad — inak nevieš, či vôbec funguje.

**Ak validácia zlyhá, nekonzistentný je spec — nie skript.** Neupravuj `scripts/build.mjs`, aby test prešiel. Oprav hodnoty v specu.

## Invarianty, ktoré musia platiť

| Invariant | Hodnota |
|---|---|
| celková výška = nožičky + korpus | 100 + 950 = 1050 |
| zóna čiel = súčet čiel + gola škáry | 925 |
| šírka = čelá + škáry | 898 + 4 + 898 = 1800 |
| svetlosť priehradky | (1800 − 3 × 18) / 2 = 873 |
| svetlá výška korpusu | 950 − 25 − 18 = 907 |
| spodná hrana posledného čela = spodok korpusu | 100 |
| hĺbka na výsuv ≥ hĺbka boxu | 748 ≥ 700 |
| drážka v priečke udrží chrbát | 8 ≥ 8 |
| spodný rad je najvyšší | 270 > 190 |
| všetky diely v obálke | 1800 × 1050 × 800 |
| žiadne nechcené prieniky dielov | 54 zamýšľaných, 0 iných |

## Než niečo „opravíš"

Čísla v specu vyzerajú miestami nepravidelne (gola reveal 22 hore vs 21 medzi radmi; čelá 190/190/190/270; box 847 a nie 850). **Všetky sú zámerné.** Dôvod ku každému je v `docs/decisions.md`. Prečítaj si to, než niečo zaokrúhliš.

Typické chybné „opravy":
- zjednotiť gola reveal na 21 → výška čela prestane vyjsť na celé číslo
- zrovnať čelá na 4× 210 → stratí sa jediná hlboká zásuvka (súčet 925 sedí, chytá to až invariant „spodný rad je najvyšší")
- zaokrúhliť box na 850 → zásuvka sa zasekne
- nastaviť `wallAnchor.required: false` → komoda sa preklopí

## Konvencie súradníc

Origin na podlahe, vľavo vpredu. **X** vpravo, **Y** hore, **Z** dozadu. Všetko v milimetroch. Táto konvencia platí v `spec/derived/geometry.json`, `parts.json` aj vo vizualizéri.

Referenčné roviny: čelá sú v z 0–18, gola profily lícujú s nimi (z 0–26), korpus začína na z 18, chrbát je na z 777–785, zadná hrana na z 800.

## `parts.json` — čo kreslí vizualizér

`spec/derived/parts.json` je zoznam všetkých 85 dielov s umiestnením v priestore: `position` je minimálny roh kvádra, `size` je `[dx, dy, dz]`, `center` je stred (priamo pre `BoxGeometry`). Každý diel má `group`, `material` a väčšina aj `decision` — odkaz na D1–D11 v `docs/decisions.md`.

**Aplikácia nič nepočíta, len kreslí.** Ak potrebuješ v `app/` nový rozmer alebo pozíciu, pridaj ho do generátora v `build.mjs`, nie do komponentu.

Polohy, ktoré nevyplývajú zo specu (vycentrovanie boxu v otvore, výška výsuvu, odsadenie kotvy od priečky), sú v konštante `PLACEMENT` v `build.mjs` a vypisujú sa do `parts.json` → `assumptions`. Meň ich tam — do specu nepatria, lebo neovplyvňujú výrobu.

Generátor kontroluje kolízie: každý prienik dvoch dielov musí byť v zozname `ALLOWED` (drážka, výrez) a musí mať očakávanú hĺbku. Čokoľvek iné build zhodí. Vďaka tomu sa chyba v modeli nájde pri validácii, nie až očami v 3D.

## Stav

Spec je kompletný a validuje. Otvorené položky sú v `spec/komoda.json` → `openQuestions`; blokujúca je len `gola-reveal-verify`.

`app/` je zatiaľ prázdny. Pri stavbe vizualizéra: 2D pohľady sú na technický výkres presnejšie a lacnejšie ako 3D. Ak 3D, čítaj `spec/derived/geometry.json`, nie `komoda.json`.
