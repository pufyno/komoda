import partsJson from "../../spec/derived/parts.json";
import geometryJson from "../../spec/derived/geometry.json";
import cutlistJson from "../../spec/derived/cutlist.json";
import specJson from "../../spec/komoda.json";

/*
 * Jediný vstup vizualizéra sú generované súbory zo spec/derived/.
 * Tu sa NEPOČÍTA žiadna geometria — len sa prevádza z milimetrov
 * do metrov a z konvencie specu (Z dozadu) do konvencie three.js
 * (Z k divákovi). Ak treba nový rozmer, patrí do scripts/build.mjs.
 */

export type Vec3 = [number, number, number];

export interface Part {
  id: string;
  group: string;
  label: string;
  material: string | null;
  size: Vec3;
  position: Vec3;
  center: Vec3;
  shape: "box" | "cylinder";
  decision?: string;
  note?: string;
  edging?: string;
  grain?: string;
  hardware?: boolean;
  diameter?: number;
  axis?: "z";
  profileType?: string;
  profileHeight?: number;
  finish?: string;
  loadKg?: number;
  drawer?: string;
}

export interface Drawer {
  id: string;
  row: number;
  col: number;
  frontHeight: number;
  boxSideHeight: number;
  inner: { width: number; depth: number; height: number };
  travel: number;
}

export interface PartsDoc {
  generated: string;
  units: string;
  envelope: { width: number; height: number; depth: number };
  axes: Record<string, string>;
  assumptions: string[];
  groups: string[];
  drawers: Drawer[];
  parts: Part[];
  intendedIntersections: { a: string; b: string; overlap: Vec3; reason: string }[];
}

export const doc = partsJson as unknown as PartsDoc;
export const geometry = geometryJson as unknown as {
  carcass: { openingWidth: number; clearHeight: number; depth: number; dividerX: number };
  top: { y0: number; y1: number; depth: number; frontOverhang: number };
  drawerBox: { width: number; depth: number; usableDepth: number };
  rows: { row: number; frontHeight: number; frontTopY: number; frontBottomY: number }[];
  columnsX: { col: number; x0: number; x1: number }[];
};

/** Diel podľa id — pre rozmery, ktoré sa nemajú písať do kódu ručne. */
export const partById = (id: string): Part | undefined => doc.parts.find((p) => p.id === id);

export interface CutPart {
  group: string;
  name: string;
  qty: number;
  length: number;
  width: number;
  thickness: number;
  material: string;
  note: string;
}

export interface Hardware {
  item: string;
  qty: number | string;
  length: number | null;
  note: string;
}

export const cutlist = cutlistJson as unknown as {
  generated: string;
  parts: CutPart[];
  hardware: Hardware[];
};

export interface OpenQuestion {
  id: string;
  q: string;
  impact?: string;
  blocking?: boolean;
}

export const spec = specJson as unknown as {
  revision: string;
  openQuestions: OpenQuestion[];
  fronts: { grain: { direction: string; sequentialCut: boolean; note: string } };
  edging: { material: string; thickness: number; note: string };
};

export const ENV = doc.envelope;

/** mm → m */
export const MM = 0.001;

/** Spec: origin vľavo vpredu na podlahe, Z dozadu. three.js: model vycentrovaný, Z k divákovi. */
export function toScene([x, y, z]: Vec3): Vec3 {
  return [(x - ENV.width / 2) * MM, y * MM, -(z - ENV.depth / 2) * MM];
}

export const GROUP_COLOR: Record<string, string> = {
  korpus: "#8ea3b8",
  "čelá": "#d3a05e",
  "zásuvky": "#7fae9f",
  gola: "#525c69",
  "výsuvy": "#9aa1a8",
  "nožičky": "#9aa3ad",
  kotvenie: "#c05a44",
};

export const GROUP_ORDER = ["korpus", "čelá", "gola", "zásuvky", "výsuvy", "nožičky", "kotvenie"];

export const isMetal = (group: string) =>
  group === "gola" || group === "výsuvy" || group === "nožičky" || group === "kotvenie";

/*
 * Dve palety. "schéma" odlišuje diely podľa funkcie — na čítanie
 * konštrukcie. "dekor" ukazuje, ako to bude vyzerať: svetlý dub,
 * čierna matná gola, pozinkované výsuvy.
 */
export type Palette = "scheme" | "decor";

const DECOR_MATERIAL: Record<string, string> = {
  ldtd25: "#cbaa7e",
  ldtd18: "#c7a173",
  ldtd16: "#bd976a",
  hdf10: "#a68d6d",
  hdf8: "#93806a",
};

const DECOR_GROUP: Record<string, string> = {
  gola: "#1f2227",
  "výsuvy": "#8d949c",
  "nožičky": "#34383f",
  kotvenie: "#a84f3c",
};

export function colorOf(part: Part, palette: Palette): string {
  if (palette === "scheme") return GROUP_COLOR[part.group] ?? "#999";
  if (part.material && DECOR_MATERIAL[part.material]) return DECOR_MATERIAL[part.material];
  return DECOR_GROUP[part.group] ?? GROUP_COLOR[part.group] ?? "#999";
}

export const drawerOf = (part: Part): string | null => part.drawer ?? null;

export function countByGroup(parts: Part[]): Record<string, number> {
  return parts.reduce<Record<string, number>>((acc, p) => {
    acc[p.group] = (acc[p.group] ?? 0) + 1;
    return acc;
  }, {});
}

/** Odkazy na docs/decisions.md — vysvetlenie, prečo má diel taký rozmer. */
export const DECISION_TITLE: Record<string, string> = {
  D1: "Full overlay čelá → korpus 782 mm",
  D2: "Gola namiesto frézovaného úchytu",
  D3: "Reveal 21/22 mm je zvolený, nie odčítaný",
  D4: "Čelo 898 mm, stredná škára 4 mm",
  D5: "Odstupňované výšky čiel 190/190/190/270",
  D6: "Bočné výsuvy, box 847 mm",
  D7: "Zadná výstuha je povinná",
  D8: "Pracovná výška 1050 mm ponechaná",
  D9: "Podložka: zóna je placeholder",
  D10: "Dekor svetlý dub, dôsledky pre nárez",
  D11: "Chrbát 891 mm, drážka v priečke plytšia",
};

export const DECISIONS_URL =
  "https://github.com/pufyno/komoda/blob/main/docs/decisions.md";
