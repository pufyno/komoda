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

## Než niečo „opravíš"

Čísla v specu vyzerajú miestami nepravidelne (gola reveal 22 hore vs 21 medzi radmi; čelá 190/190/190/270; box 847 a nie 850). **Všetky sú zámerné.** Dôvod ku každému je v `docs/decisions.md`. Prečítaj si to, než niečo zaokrúhliš.

Typické chybné „opravy":
- zjednotiť gola reveal na 21 → výška čela prestane vyjsť na celé číslo
- zrovnať čelá na 4× 210 → stratí sa jediná hlboká zásuvka
- zaokrúhliť box na 850 → zásuvka sa zasekne
- nastaviť `wallAnchor.required: false` → komoda sa preklopí

## Konvencie súradníc

Origin na podlahe, vľavo vpredu. **X** vpravo, **Y** hore, **Z** dozadu. Všetko v milimetroch. Táto konvencia platí v `spec/derived/geometry.json` aj vo vizualizéri.

## Stav

Spec je kompletný a validuje. Otvorené položky sú v `spec/komoda.json` → `openQuestions`; blokujúca je len `gola-reveal-verify`.

`app/` je zatiaľ prázdny. Pri stavbe vizualizéra: 2D pohľady sú na technický výkres presnejšie a lacnejšie ako 3D. Ak 3D, čítaj `spec/derived/geometry.json`, nie `komoda.json`.
