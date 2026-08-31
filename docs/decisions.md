# Rozhodnutia

Prečo sú čísla v `spec/komoda.json` také, aké sú. Bez tohto súboru vyzerá spec ako sada náhodných hodnôt a ktokoľvek (človek aj AI) ich „opraví" na okrúhlejšie.

Stav k 2026-08-31. Východisko: technický výkres `docs/technicky-vykres.png`, M 1:10, 27. 4. 2025.

---

## D1 — Full overlay čelá → korpus 782 mm

**Rozhodnutie:** čelá prekrývajú korpus zvonku (`fronts.overlay: "full"`), korpus je 782 mm hlboký, horná doska 800 mm s presahom 18 mm vpredu.

**Prečo:** pri full overlay sedí čelo 18 mm pred čelnou hranou korpusu. Celková hĺbka je 800 mm, takže korpus musí byť 800 − 18 = 782 mm. Doska zostáva 800 mm a vpredu presahuje, aby lícovala s rovinou čiel.

**Pozor:** výkres uvádza „horná doska zarovno s bokmi" — to rieši len ľavú a pravú stranu, nie prednú hranu. Presah vpredu vo výkrese nie je zakótovaný. Je to dopočítaný dôsledok, nie chyba.

**Alternatíva, ktorá padla:** zapustené (inset) čelá by zachovali korpus 800 mm, ale nefungujú dobre s gola systémom.

---

## D2 — Gola namiesto frézovaného úchytu

**Rozhodnutie:** hliníkový gola systém — profil J pod hornou doskou, 3× profil C medzi radmi. Povrch čierny matný.

**Prečo:** pôvodný návrh mal frézovaný zapustený úchyt v hornej hrane čela (18–20 mm hlboký, 8–10 mm vysoký) pri škárach 3 mm. **To sa nedá otvoriť.** Do 3 mm medzery sa prsty nedostanú a vrchná zásuvka je navyše zablokovaná hornou doskou.

**Zvážené alternatívy:**

| Variant | Prečo padol |
|---|---|
| Push-to-open | S tlmeným dojazdom vyžaduje undermount výsuvy. Batoľa otvorí spodné rady. |
| J-profil (skosenie 45°) | Skosenie na LDTD odhalí surové jadro. Riešenie nalepeným profilom stojí toľko čo gola, ale vyzerá horšie. |

**Cena:** ~60–80 € (2× C 3 m + 1× J 2 m + koncovky). Skorší odhad 150–250 € bol nesprávny.

---

## D3 — Reveal 21/22 mm je ZVOLENÝ, nie odčítaný

**Rozhodnutie:** gola J reveal 22 mm, gola C reveal 21 mm.

**Prečo takto:** presný reveal konkrétnych profilov nie je vo verejných katalógoch — výrobcovia ho uvádzajú až v montážnom návode. Uvádzaných 73,5 × 26 mm je celkový prierez profilu vrátane príchytiek za čelami, **nie viditeľná medzera**.

Preto je logika obrátená: zvolili sme cieľový reveal a podľa neho sa objednáva profil. 21 mm je najrozšírenejší európsky štandard.

**Prečo hore 22 a nie 21:** výška čela musí vyjsť na celé číslo. Zóna čiel je 925 mm, čo nie je deliteľné štyrmi po odčítaní 4×21. Podmienka je `(hornýReveal + 3 × vnútornýReveal) mod 4 = 1`. Pri vnútornom 21 vychádza horný 22, 26 alebo 18. Rozdiel 1 mm susedí s doskou, nie s ďalšou škárou — nie je ho vidieť.

**Ak sa reveal líši:** uprav `gola.*.reveal`, spusti `npm run build`. Invariant `zóna čiel` zlyhá a povie ti to. Potom prepočítaj `fronts.heights` tak, aby súčet + škáry = 925.

---

## D4 — Čelo 898 mm, stredná škára 4 mm, bočné 0

**Rozhodnutie:** dve čelá po 898 mm, medzi nimi 4 mm, po stranách nič.

**Prečo:** `898 + 4 + 898 = 1800` presne, v celých číslach.

Pri škáre 3 mm dookola vychádza čelo 895,5 mm. Pri 3 mm len v strede 898,5 mm. Vodorovne sa celé číslo pri 3 mm škáre dosiahnuť nedá — 1800 mínus nepárny súčet škár je nepárne číslo, delené dvomi vždy dá polovicu.

**Vedľajší efekt, ktorý je zlepšením:** bez bočných škár nie je vidieť čelnú hranu boku korpusu a nezbiera sa tam prach. Stredná škára je jediná zvislá línia na 1800 mm — 4 mm namiesto 3 mm je vizuálne nerozoznateľné a dáva toleranciu pri lícovaní.

---

## D5 — Odstupňované výšky čiel 190/190/190/270

**Rozhodnutie:** horné tri rady po 190 mm, spodný 270 mm.

**Prečo:** pri rovnakých čelách vychádza 210 mm na rad. Balík plienok má 250–300 mm — do žiadnej z ôsmich zásuviek by sa nezmestil. Spodná zásuvka má pri 270 mm čele vnútornú svetlosť ~227 mm, čo pokryje plienky naležato, deky aj náhradné posteľné prádlo.

Horné tri majú vnútri ~130 mm, čo je na detské oblečenie viac než dosť.

**Kontrola:** `22 + 190 + 21 + 190 + 21 + 190 + 21 + 270 = 925` ✓

---

## D6 — Bočné výsuvy, box 847 mm

**Rozhodnutie:** bočné guličkové plnovýsuvy s tlmením, 700 mm, box 847 mm.

**Výpočet:** svetlosť 873 mm − 2 × 12,7 mm = 847,6 → zaokrúhlené **nadol** na 847.

**Prečo 12,7 a nie 12,5:** priemyselný štandard je ½" = 12,7 mm. Výkres uvádzal „šírku zásuvky cca 850–870 mm", čo zodpovedá undermount výsuvom, nie bočným.

**Prečo nadol:** 1 mm vôle navyše nevadí, zaseknutá zásuvka áno.

**Zvážená alternatíva:** undermount (Blum Tandem) — box ~860 mm, výrazne lepší chod, ~100 € navyše na 8 zásuviek. Zamietnuté kvôli cene, ale je to legitímny upgrade.

---

## D7 — Zadná výstuha je povinná

**Rozhodnutie:** LDTD 18 mm, 1764 × 100 mm, hore vzadu, pred chrbtom.

**Prečo:** kotvenie do steny. Chrbát je 8 mm HDF v drážke — do toho sa kotva dať nedá. Bez výstuhy nie je komodu čím prikotviť.

**Prečo hore a nie dole:** pákový moment pri preklopení je najväčší navrchu.

**Prečo nie aj predná výstuha:** priehyb 25 mm dosky na rozpone 873 mm pri 30 kg bodovom zaťažení je ~1,6 mm, čo je prijateľné. Gola J profil navyše spevňuje čelnú hranu. Skoršie tvrdenie o nutnosti prednej výstuhy kvôli priehybu bolo nadhodnotené.

---

## D8 — Pracovná výška 1050 mm ponechaná

**Rozhodnutie:** výška zostáva 1050 mm, nožičky 100 mm.

**Známy kompromis:** s podložkou vyjde pracovná plocha na ~1090 mm. Bežná prebaľovacia výška je 950–1000 mm. Pri postave 175 cm je 1090 mm zhruba na úrovni lakťov, čo znamená prebaľovanie so zdvihnutými ramenami.

**Vedomé rozhodnutie používateľa.** Nožičky sú nastaviteľné, ale ich rozsah je len ±15 mm — na vyrovnanie podlahy, nie na zmenu ergonómie.

---

## D9 — Podložka: zóna je placeholder

**Rozhodnutie:** `changingPad` má rozmery z výkresu (800 × 700) a `thickness: null`.

**Prečo je to otvorené:** výkres predpokladá, že podložka 800 × 700 mm existuje. Bežné prebaľovacie podložky majú 700–850 × 500–750 mm — 800 × 700 je na hornej hranici. Logika musí ísť opačne: kúpiť podložku, potom zakótovať zónu.

**Bezpečnosť:** komoda nemá pevnú zábranu. Namiesto stavaného nadstavca sa zvolila **podložka s vyvýšenými bokmi** — rieši to isté, lacnejšie, bez zásahu do dosky. Poloha na doske: vodorovne na stred, v hĺbke zarovno dozadu (100 mm voľných vpredu namiesto 50 mm pri centrovaní).

---

## D10 — Dekor svetlý dub, dva dôsledky pre nárez

**Rozhodnutie:** svetlý dub, matný, konkrétny kód podľa vzorkovníka.

**Dôsledok 1 — smer kresby.** Letokruh beží vodorovne, po dĺžke čela. Ak má kresba na rade nadväzovať, čelá sa musia rezať v poradí z jednej dosky. Povedať stolárovi vopred; po náreze sa to neopraví.

**Dôsledok 2 — ABS hrany s potlačou.** Jednofarebná hrana je na drevenom dekore okamžite vidieť. Viditeľných hrán je 8 čiel × 4 = 32.

---

## D11 — Chrbát 891 mm, drážka v priečke plytšia

**Rozhodnutie:** drážka pre chrbát je 10 mm hlboká v bokoch a v dne, ale len **8 mm v strednej priečke**. Chrbát je preto 891 mm široký, nie 893.

**Prečo:** priečka je 18 mm a chrbty do nej idú z oboch strán. Pri 10 mm z každej strany by sa drážky stretli a priečka by bola v tej línii prerezaná. Pri 8 mm ostávajú medzi nimi 2 mm materiálu.

**Ako sa to našlo:** kontrolou kolízií v `scripts/build.mjs` pri stavbe vizualizéra. Pôvodný výpočet `873 + 2 × 10 = 893` platí len pre diel, ktorý má na oboch stranách vonkajší bok — pri strednej priečke nie je vyrobiteľný.

**Dôsledok pre montáž:** chrbát nie je symetrický. Hlbšia strana ide do vonkajšieho boku, plytšia do priečky. Oba chrbty sú rovnaké, len sa vkladajú zrkadlovo.

---

## Čo zostáva otvorené

Sledované v `spec/komoda.json` → `openQuestions`:

| ID | Blokuje výrobu |
|---|---|
| `gola-reveal-verify` | **áno** — určuje výšky čiel |
| `pad-dimensions` | nie |
| `decor-code` | nie |
