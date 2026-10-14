# komoda — pokyny pre prácu s projektom

Projekt je **parametrický spec kusu nábytku** (komoda / prebaľovací pult, 1800 × 1050 × 650 mm) a nad ním sa stavia vizualizér.

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
| doska = obálka | 1800 × 650 |
| celková výška = sokel + korpus | 60 + 990 = 1050 |
| vôľa pod soklom ≥ rektifikácia | 15 ≥ 15 |
| zóna čiel = súčet čiel + gola škáry | 965 |
| šírka = čelá + škáry | 898 + 4 + 898 = 1800 |
| svetlosť priehradky | (1800 − 3 × 18) / 2 = 873 |
| svetlá výška korpusu | 990 − 25 − 18 = 947 |
| spodná hrana posledného čela = spodok korpusu | 60 |
| hĺbka na výsuv ≥ hĺbka boxu | 583 ≥ 550 |
| výsuv = hĺbka boxu | 550 = 550 |
| podložka sa zmestí na dosku | 600 ≤ 650 |
| drážka v priečke udrží chrbát | 8 ≥ 8 |
| spodný rad je najvyšší | 310 > 190 |
| všetky diely v obálke | 1800 × 1050 × 650 |
| žiadne nechcené prieniky dielov | 54 zamýšľaných, 0 iných |

## Než niečo „opravíš"

Čísla v specu vyzerajú miestami nepravidelne (gola reveal 22 hore vs 21 medzi radmi; čelá 190/190/190/310; box 847 a nie 850). **Všetky sú zámerné.** Dôvod ku každému je v `docs/decisions.md`. Prečítaj si to, než niečo zaokrúhliš.

Typické chybné „opravy":
- zjednotiť gola reveal na 21 → výška čela prestane vyjsť na celé číslo
- zrovnať čelá na 4× 220 → stratí sa jediná hlboká zásuvka (súčet 965 sedí, chytá to až invariant „spodný rad je najvyšší")
- zaokrúhliť box na 850 → zásuvka sa zasekne
- nastaviť `wallAnchor.required: false` → komoda sa preklopí

## Konvencie súradníc

Origin na podlahe, vľavo vpredu. **X** vpravo, **Y** hore, **Z** dozadu. Všetko v milimetroch. Táto konvencia platí v `spec/derived/geometry.json`, `parts.json` aj vo vizualizéri.

Referenčné roviny: čelá sú v z 0–18, korpus začína na z 18, zadná výstuha na z 609–627, chrbát na z 627–635, zadná hrana na z 650. Gola profil je rozdelený: lišta v škáre lícuje s čelami (z 0–18), montážna stena je za nimi (z 18–26) a prekrýva čelnú hranu korpusu o 8 mm. Rám sokla je v x 0–1800, z 18–620, y 15–60 a stojí na pätkách — zarovno s korpusom (bokmi aj čelnou hranou), 30 mm od steny kvôli soklovej lište.

## `parts.json` — čo kreslí vizualizér

`spec/derived/parts.json` je zoznam všetkých 94 dielov s umiestnením v priestore: `position` je minimálny roh kvádra, `size` je `[dx, dy, dz]`, `center` je stred (priamo pre `BoxGeometry`). Každý diel má `group`, `material` a väčšina aj `decision` — odkaz na D1–D13 v `docs/decisions.md`.

**Aplikácia nič nepočíta, len kreslí.** Ak potrebuješ v `app/` nový rozmer alebo pozíciu, pridaj ho do generátora v `build.mjs`, nie do komponentu.

Polohy, ktoré nevyplývajú zo specu (vycentrovanie boxu v otvore, výška výsuvu, odsadenie kotvy od priečky), sú v konštante `PLACEMENT` v `build.mjs` a vypisujú sa do `parts.json` → `assumptions`. Meň ich tam — do specu nepatria, lebo neovplyvňujú výrobu.

Generátor kontroluje kolízie: každý prienik dvoch dielov musí byť v zozname `ALLOWED` (drážka, výrez) a musí mať očakávanú hĺbku. Čokoľvek iné build zhodí. Vďaka tomu sa chyba v modeli nájde pri validácii, nie až očami v 3D.

## Vizualizér — ako je postavený

2D pohľady aj rezy sú čisté SVG počítané z `parts.json`. Všetky diely sú kvádre zarovnané s osami, takže priemet je výber dvoch osí a rez je klasifikácia dielov voči jednej rovine (`placementOf` v `app/src/views/Drawing.tsx`). Žiadna projekčná matica, žiadna CSG. Nový pohľad alebo rez sa pridáva do `AXES` / `SECTION`, kóty do `dimensionsFor`.

Kovanie, ktoré model zjednodušuje (všetko vypísané v `parts.json` → `assumptions`):

- gola profil nie je extrudovaný J/C prierez, ale **dva kvádre** — lišta v škáre (z 0–18) a montážna stena za čelami (z 18–26). Zámerne: kolízna kontrola tak zostáva presná a nepotrebuje výnimky.
- plnovýsuv je **jeden diel za stredný člen** s `travelFactor: 0.5`; skriňový a zásuvkový člen model nemá.
- kolíky a excentre model nemá vôbec — spec ich necháva na technológiu zhotoviteľa a vymýšľať si ich pozície by bolo horšie než ich nemať.

### Dve pasti v `app/src/styles.css`

1. **Media queries musia zostať na konci súboru**, v poradí mobil → tlač. Keď boli v strede, neskoršie základné pravidlá ich prebíjali a polovica mobilného layoutu bola ticho mŕtva. Po zmene over poradie na zbuildenom CSS, nielen v zdroji.
2. **`cssTarget` vo `vite.config.ts` musí zostať konzervatívny.** Bez neho minifikátor prepíše `max-width: 900px` na rozsahový zápis `(width <= 900px)`, ktorý Safari pred 16.4 nepozná — a celý mobilný layout na starších iPhonoch vypadne bez akejkoľvek chyby.

## Stav

Spec je kompletný a validuje. Vizualizér je hotový a nasadený na <https://komoda-olive.vercel.app>.

Hotové: 3D scéna s otváraním zásuviek, rozstrelom a röntgenom kovania; nárys, bokorys, pôdorys; rez A–A a B–B s posuvnou rovinou; kóty vybraného dielu priamo v scéne aj vo výkrese; tlačiteľný cutlist; mobilný layout pod 900 px; 27 testov validátora a CI na každý push.

Otvorené položky sú v `spec/komoda.json` → `openQuestions`. Blokujúca je len `gola-reveal-verify` — reveal gola profilu treba overiť v montážnom návode. Nie je to úloha pre kód: kým nie je datasheet, nedá sa potvrdiť, že 21/22 mm je správne. V UI je označená štítkom v sekcii *Otvorené otázky*, to isté upozornenie nesie cutlist.

Nápady, ktoré sa zvažovali a neurobili: `docs/technicky-vykres.png` ako referenčná podkladová vrstva pod nárys, klávesová obsluha a prístupnosť, skutočný extrudovaný prierez gola profilu.
