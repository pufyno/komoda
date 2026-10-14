# Rozhodnutia

Prečo sú čísla v `spec/komoda.json` také, aké sú. Bez tohto súboru vyzerá spec ako sada náhodných hodnôt a ktokoľvek (človek aj AI) ich „opraví" na okrúhlejšie.

Stav k 2026-10-14 (hĺbka 650 a sokel — D12, D13). Východisko: technický výkres `docs/technicky-vykres.png`, M 1:10, 27. 4. 2025.

---

## D1 — Full overlay čelá → korpus 632 mm

**Rozhodnutie:** čelá prekrývajú korpus zvonku (`fronts.overlay: "full"`), korpus je 632 mm hlboký, horná doska 650 mm s presahom 18 mm vpredu.

**Prečo:** pri full overlay sedí čelo 18 mm pred čelnou hranou korpusu. Celková hĺbka je 650 mm (D12), takže korpus musí byť 650 − 18 = 632 mm. Doska zostáva 650 mm a vpredu presahuje, aby lícovala s rovinou čiel.

**Pozor:** výkres uvádza „horná doska zarovno s bokmi" — to rieši len ľavú a pravú stranu, nie prednú hranu. Presah vpredu vo výkrese nie je zakótovaný. Je to dopočítaný dôsledok, nie chyba.

**Alternatíva, ktorá padla:** zapustené (inset) čelá by zachovali korpus v plnej hĺbke, ale nefungujú dobre s gola systémom.

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

**Prečo hore 22 a nie 21:** výška čela musí vyjsť na celé číslo. Zóna čiel je 965 mm, čo nie je deliteľné štyrmi po odčítaní 4×21. Podmienka je `(hornýReveal + 3 × vnútornýReveal) mod 4 = 1`. Pri vnútornom 21 vychádza horný 22, 26 alebo 18. Rozdiel 1 mm susedí s doskou, nie s ďalšou škárou — nie je ho vidieť.

**Ak sa reveal líši:** uprav `gola.*.reveal`, spusti `npm run build`. Invariant `zóna čiel` zlyhá a povie ti to. Potom prepočítaj `fronts.heights` tak, aby súčet + škáry = 965.

---

## D4 — Čelo 898 mm, stredná škára 4 mm, bočné 0

**Rozhodnutie:** dve čelá po 898 mm, medzi nimi 4 mm, po stranách nič.

**Prečo:** `898 + 4 + 898 = 1800` presne, v celých číslach.

Pri škáre 3 mm dookola vychádza čelo 895,5 mm. Pri 3 mm len v strede 898,5 mm. Vodorovne sa celé číslo pri 3 mm škáre dosiahnuť nedá — 1800 mínus nepárny súčet škár je nepárne číslo, delené dvomi vždy dá polovicu.

**Vedľajší efekt, ktorý je zlepšením:** bez bočných škár nie je vidieť čelnú hranu boku korpusu a nezbiera sa tam prach. Stredná škára je jediná zvislá línia na 1800 mm — 4 mm namiesto 3 mm je vizuálne nerozoznateľné a dáva toleranciu pri lícovaní.

---

## D5 — Rovnaké čelá 4 × 220 mm

**Rozhodnutie:** všetky štyri rady rovnaké — čelo 898 × 220 mm, box 847 × 160 × 550 mm, vnútri 815 × 140 × 518 mm (~59 l). Rozhodnutie používateľa 2026-10-14.

**Výpočet:** zóna čiel 965 mm − gola škáry (22 + 3 × 21 = 85) = 880 mm, 880 / 4 = 220 — vychádza na celé mm, reveal 21/22 (D3) netreba meniť.

**Box 160:** je zvislo vycentrovaný na čelo. Väzbou je spodný rad: dno korpusu končí na y 78, box začína na y 90 — 12 mm vôle ako predtým. Box 180 by sa ešte zmestil, ale nad dnom by ostali 2 mm. Nad každým boxom ostáva 30 mm pod hornou hranou čela.

**Čo sa tým stratilo** (vedome):

| | odstupňované 190/190/190/310 | 4 × 220 |
|---|---|---|
| vnútorná výška | 6 × 130 + 2 × 230 | 8 × 140 |
| objem spolu | ~523 l | ~473 l |
| balík plienok 250–300 mm | do spodných dvoch | do žiadnej |

Rovnaké boxy sa ale režú z jedného rozmeru a sú navzájom zameniteľné. Cutlist ich zlučuje do jedného riadku.

**História:** pôvodne 190/190/190/270 s jedinou hlbokou zásuvkou na plienky. Dokument vtedy tvrdil vnútornú výšku ~227 mm, model dával 180 (box 200 − 10 vôľa pod dnom − 10 dno). Po znížení sokla (D13) 190/190/190/310 s boxom 250, potom zjednotené. Invariant „spodný rad je najvyšší", ktorý odstupňovanie strážil, bol odstránený.

**Kontrola:** `22 + 220 + 21 + 220 + 21 + 220 + 21 + 220 = 965` ✓

---

## D6 — Bočné výsuvy, box 847 × 550 mm

**Rozhodnutie:** bočné guličkové plnovýsuvy s tlmením, 550 mm, box 847 × 550 mm.

**Výpočet:** svetlosť 873 mm − 2 × 12,7 mm = 847,6 → zaokrúhlené **nadol** na 847.

**Prečo 12,7 a nie 12,5:** priemyselný štandard je ½" = 12,7 mm. Výkres uvádzal „šírku zásuvky cca 850–870 mm", čo zodpovedá undermount výsuvom, nie bočným.

**Prečo nadol:** 1 mm vôle navyše nevadí, zaseknutá zásuvka áno.

**Dĺžka 550:** od zadnej roviny gola profilu (z 26) po zadnú výstuhu (z 609) je 583 mm. Výsuvy sa predávajú po 50 mm, takže najdlhší, ktorý sa zmestí, je 550. Rezerva 33 mm. Pri hĺbke komody 800 to bolo 700 mm.

**Zvážená alternatíva:** undermount (Blum Tandem) — box ~860 mm, výrazne lepší chod, ~100 € navyše na 8 zásuviek. Zamietnuté kvôli cene, ale je to legitímny upgrade.

---

## D7 — Zadná výstuha je povinná

**Rozhodnutie:** LDTD 18 mm, 1764 × 100 mm, hore vzadu, pred chrbtom.

**Prečo:** kotvenie do steny. Chrbát je 8 mm HDF v drážke — do toho sa kotva dať nedá. Bez výstuhy nie je komodu čím prikotviť.

**Prečo hore a nie dole:** pákový moment pri preklopení je najväčší navrchu.

**Prečo nie aj predná výstuha:** priehyb 25 mm dosky na rozpone 873 mm pri 30 kg bodovom zaťažení je ~1,6 mm, čo je prijateľné. Gola J profil navyše spevňuje čelnú hranu. Skoršie tvrdenie o nutnosti prednej výstuhy kvôli priehybu bolo nadhodnotené.

---

## D8 — Pracovná výška 1050 mm ponechaná

**Rozhodnutie:** výška zostáva 1050 mm — sokel 60 mm + korpus 990 mm (D13).

**Známy kompromis:** s podložkou vyjde pracovná plocha na ~1090 mm. Bežná prebaľovacia výška je 950–1000 mm. Pri postave 175 cm je 1090 mm zhruba na úrovni lakťov, čo znamená prebaľovanie so zdvihnutými ramenami.

**Vedomé rozhodnutie používateľa.** Rektifikačné pätky majú rozsah len ±15 mm — na vyrovnanie podlahy, nie na zmenu ergonómie.

**Zvážené znovu pri sokli (D13):** zníženie sokla zo 100 na 60 mm uvoľnilo 40 mm. Dali sa použiť na nižšiu komodu (1010 mm, s podložkou ~1050) alebo na hlbšiu spodnú zásuvku pri zachovaní 1050. Používateľ zvolil zásuvky (dnes 4 × 220, D5) — výška a tým aj tento kompromis ostáva.

---

## D9 — Podložka: zóna je placeholder

**Rozhodnutie:** `changingPad` má placeholder 800 × 600 a `thickness: null`.

**Prečo je to otvorené:** výkres predpokladal podložku 800 × 700 mm. Po zmene hĺbky na 650 (D12) sa na dosku nezmestí — invariant „podložka sa zmestí na dosku" to stráži. Bežné prebaľovacie podložky majú 700–850 × 500–750 mm, takže treba vyberať z plytšej polovice. Logika musí ísť opačne: kúpiť podložku (hĺbka najviac 650), potom zakótovať zónu. 600 je len odhad, ktorý nechá vpredu 50 mm.

**Bezpečnosť:** komoda nemá pevnú zábranu. Namiesto stavaného nadstavca sa zvolila **podložka s vyvýšenými bokmi** — rieši to isté, lacnejšie, bez zásahu do dosky. Poloha na doske: vodorovne na stred, v hĺbke zarovno dozadu — všetko voľné miesto ostane vpredu.

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

## D12 — Hĺbka 650 mm

**Rozhodnutie:** celková hĺbka 650 mm namiesto 800 (dohoda používateľov 2026-10-14).

**Čo z toho vyplýva** (všetko počíta `build.mjs`, v specu sa menia len `overall.depth`, `top.depth`, box a výsuv):

| | 800 | 650 |
|---|---|---|
| korpus | 782 | 632 |
| chrbát | z 777–785 | z 627–635 |
| zadná výstuha | z 759–777 | z 609–627 |
| hĺbka na výsuv | 733 | 583 |
| box / výsuv | 700 | 550 |
| svetlosť boxu do hĺbky | 668 | 518 |

**Čo sa nemení:** šírky, výšky, čelá, gola, výstuha a kotvenie. Hĺbka do nich nevstupuje.

**Pozor na podložku:** pôvodná zóna 800 × 700 sa na dosku 650 nezmestí — pozri D9.

---

## D13 — Sokel 60 mm ako rám na rektifikačných pätkách

**Rozhodnutie:** namiesto viditeľných nožičiek samostatný rám z LDTD 18 pod korpusom, vysoký 60 mm a zarovno s korpusom. Predná a zadná doska idú cez celú šírku (1800 mm), bočné a stredná sú medzi nimi (566 mm). Výška dosiek 45 mm, pod nimi 6 rektifikačných pätiek zaskrutkovaných do spodnej hrany (2 rohy a 1 pod priečkou v prednej aj zadnej doske). Rám nesie korpus.

**Odsadenie:**

| strana | mm | prečo |
|---|---|---|
| vpredu | 18 | meria sa od roviny čiel; 18 = čelná hrana korpusu. Čelá full overlay korpus prekrývajú, takže pod spodným čelom ostane schodík 18 mm |
| vľavo / vpravo | 0 | zarovno s bokmi korpusu |
| vzadu | 30 | pri stene je soklová lišta; rám zarovno dozadu by sa o ňu oprel a komoda by nedosadla k stene, kotva by korpus k stene ťahala. Zozadu to nevidno |

**Prečo zarovno a nie zapustený:** rozhodnutie používateľa. Prvá verzia mala 50 mm zapustenie vpredu aj po bokoch (tieňová škára, miesto na špičky nôh). Pri zarovnaní je miesto na špičky len 18 mm.

**Prečo rám a nie boky po zem:** korpus má rovnakú konštrukciu (boky stoja na dne, dno cez celú šírku), takže D1, D7 a D11 platia ďalej. Pätky zachovajú vyrovnanie podlahy ±15 mm, čo by pri bokoch až po zem riešili len klzáky a podložky.

**Prečo 60 a nie 100:** 100 mm bola výška nožičiek, sokel ju nepotrebuje. Kuchynské nožičky do sokla sa bežne predávajú od ~80–100 mm, preto pri 60 mm nie sú nožičky vnútri rámu, ale pätky v jeho hrane a rám nesie korpus sám. Ušetrených 40 mm dostali zásuvky (D5, D8).

**Stredná doska:** priečka nesie polovicu zásuviek. Pri pätkách v ráme by bez opory visela na dne korpusu s rozponom cez celú šírku. Stredná doska je presne pod priečkou; test to stráži.

**Vôľa 15 mm pod rámom:** je to vysunutie pätiek v strednej polohe. Musí byť aspoň taká ako rozsah rektifikácie, inak pri znížení pätiek dosadne rám na podlahu. Stráži to invariant „vôľa pod soklom ≥ rektifikácia". **Pri zarovnanom ráme je medzera vidieť** zboku aj spredu — ako pri nábytku na kĺzačoch. Kto ju nechce, môže ju po vyrovnaní zakryť soklovým tesnením (kuchynský PVC profil do drážky), alebo zapustiť rám.

**Lišta:** smie byť najviac 30 mm hrubá (zadné odsadenie, odhad) a **najviac 60 mm vysoká** — vyššie už je dno korpusu. Ak je lišta vyššia, treba ju za komodou odrezať. Sledované v `openQuestions` → `skirting`.

---

## Čo zostáva otvorené

Sledované v `spec/komoda.json` → `openQuestions`:

| ID | Blokuje výrobu |
|---|---|
| `gola-reveal-verify` | **áno** — určuje výšky čiel |
| `pad-dimensions` | nie |
| `skirting` | nie — len zadné odsadenie sokla |
| `decor-code` | nie |
