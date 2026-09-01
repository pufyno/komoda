import type { MouseEvent } from "react";
import { doc, geometry, ENV, colorOf, partById, type Palette, type Part } from "../data";

export type ViewId = "front" | "side" | "top" | "sectionV" | "sectionH";
export type SectionId = "sectionV" | "sectionH";

export const VIEW_LABEL: Record<ViewId, string> = {
  front: "Nárys",
  side: "Bokorys",
  top: "Pôdorys",
  sectionV: "Rez A–A",
  sectionH: "Rez B–B",
};

/*
 * Ortografický priemet. Všetky diely sú kvádre zarovnané s osami, takže
 * pohľad = výber dvoch osí. Žiadna kamera, žiadna projekčná matica —
 * kreslí sa priamo v milimetroch a SVG sa len škáluje.
 *
 *   spec: X vpravo, Y hore, Z dozadu
 *   SVG:  X vpravo, Y NADOL  → zvislá os sa preklápa
 */
interface Axes {
  h: 0 | 1 | 2;         // os, ktorá ide vodorovne
  v: 0 | 1 | 2;         // os, ktorá ide zvislo (preklopená)
  toward: 0 | 1 | 2;    // os smerom k divákovi
  towardAsc: boolean;   // true = väčšia hodnota je bližšie
  width: number;
  height: number;
  hFlip?: boolean;
}

const AXES: Record<ViewId, Axes> = {
  // spredu: šírka × výška, bližšie je menšie z
  front: { h: 0, v: 1, toward: 2, towardAsc: false, width: ENV.width, height: ENV.height },
  // zboku sprava: hĺbka × výška, čelo vľavo, bližšie je väčšie x
  side: { h: 2, v: 1, toward: 0, towardAsc: true, width: ENV.depth, height: ENV.height },
  // zhora: šírka × hĺbka, čelo dole, bližšie je väčšie y
  top: { h: 0, v: 2, toward: 1, towardAsc: true, width: ENV.width, height: ENV.depth, hFlip: false },
  // Rezy majú rovnaké osi ako pohľad, z ktorého sa odvodzujú — líšia sa len
  // tým, že materiál medzi divákom a rovinou rezu sa nekreslí.
  sectionV: { h: 2, v: 1, toward: 0, towardAsc: true, width: ENV.depth, height: ENV.height },
  sectionH: { h: 0, v: 2, toward: 1, towardAsc: true, width: ENV.width, height: ENV.depth },
};

/*
 * Rezy. Rovina je kolmá na os `toward` príslušného pohľadu:
 *
 *   A–A  zvislá rovina x = const, pozerá sa zľava  → vidno hĺbkovú skladbu
 *   B–B  vodorovná rovina y = const, pozerá sa zhora → vidno šírkovú skladbu
 *
 * Diel, ktorý rovinu pretína, je v reze (šrafovaný). Čo je za ňou, kreslí sa
 * ako pohľad tenkou čiarou. Čo je pred ňou, sa nekreslí — inak by rez nič
 * neodhalil.
 */
export const SECTION: Record<SectionId, { from: ViewId; label: string; max: number; fallback: number }> = {
  sectionV: { from: "front", label: "poloha roviny (x)", max: ENV.width, fallback: ENV.width / 4 },
  sectionH: { from: "side", label: "poloha roviny (y)", max: ENV.height, fallback: ENV.height / 2 },
};

export const isSection = (v: string): v is SectionId => v === "sectionV" || v === "sectionH";

/** Východiskové roviny: stredom ľavej zásuvky a stredom druhého radu. */
export const SECTION_DEFAULT: Record<SectionId, number> = {
  sectionV: Math.round((geometry.columnsX[0].x0 + geometry.columnsX[0].x1) / 2),
  sectionH: Math.round((geometry.rows[1].frontBottomY + geometry.rows[1].frontTopY) / 2),
};

type Placement = "hidden" | "cut" | "beyond";

/** Kde leží diel voči rovine rezu, pri pohľade v smere `ax.toward`. */
function placementOf(p: Part, ax: Axes, at: number): Placement {
  const a = p.position[ax.toward];
  const b = a + p.size[ax.toward];
  if (a < at && at < b) return "cut";
  const nearer = ax.towardAsc ? a >= at : b <= at;
  return nearer ? "hidden" : "beyond";
}

interface Dim {
  dir: "h" | "v";
  from: number;
  to: number;
  level: number;      // 0 = najbližšie ku kresbe
  label?: string;
}

const MARGIN = 300;   // mm, priestor na kóty
const STEP = 95;      // mm, odstup medzi radmi kót

/** Reťaz kót: susediace úseky pod sebou. */
function chain(bounds: number[], dir: "h" | "v", level: number): Dim[] {
  const out: Dim[] = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    out.push({ dir, from: bounds[i], to: bounds[i + 1], level });
  }
  return out;
}

function dimensionsFor(view: ViewId): Dim[] {
  const T = partById("side-left")?.size[0] ?? 18;
  const legH = partById("leg-1")?.size[1] ?? 100;
  const { rows, columnsX, carcass, top } = geometry;

  if (view === "front") {
    // zvislá reťaz zdola: nožičky → čelá a gola škáry → doska
    const vBounds = [0, legH];
    for (let i = rows.length - 1; i >= 0; i--) {
      vBounds.push(rows[i].frontTopY);
      if (i > 0) vBounds.push(rows[i - 1].frontBottomY);
    }
    vBounds.push(top.y0, top.y1);   // gola J škára a hrúbka dosky zvlášť
    return [
      ...chain([columnsX[0].x0, columnsX[0].x1, columnsX[1].x0, columnsX[1].x1], "h", 0),
      { dir: "h", from: 0, to: ENV.width, level: 1 },
      ...chain(vBounds, "v", 0),
      { dir: "v", from: 0, to: ENV.height, level: 1 },
    ];
  }

  if (view === "side") {
    const boxFront = partById("box-side-l-r1c1")?.position[2] ?? 0;
    const boxDepth = partById("box-side-l-r1c1")?.size[2] ?? 0;
    return [
      ...chain([0, T, ENV.depth], "h", 0),
      { dir: "h", from: boxFront, to: boxFront + boxDepth, level: 1, label: `box ${boxDepth}` },
      { dir: "h", from: 0, to: top.depth, level: 2 },
      ...chain([0, legH, top.y0, top.y1], "v", 0),
      { dir: "v", from: 0, to: ENV.height, level: 1 },
    ];
  }

  if (view === "top") {
    return [
      ...chain([0, T, carcass.dividerX, carcass.dividerX + T, ENV.width - T, ENV.width], "h", 0),
      { dir: "h", from: 0, to: ENV.width, level: 1 },
      ...chain([0, T, ENV.depth], "v", 0),
      { dir: "v", from: 0, to: ENV.depth, level: 1 },
    ];
  }

  const box = partById("box-side-l-r1c1");
  const rail = partById("rear-rail");
  const back = partById("back-1");
  const { spaceZ, usableDepth, width: boxWidth } = geometry.drawerBox;

  if (view === "sectionV") {
    // Hĺbková skladba zpredu dozadu: čelo, gola, box, vzduch, výstuha, chrbát,
    // presah dosky. Presne tie hodnoty, ktoré v pohľade zvonku vidieť nie je.
    const hBounds = [0, T, box?.position[2] ?? 0, (box?.position[2] ?? 0) + (box?.size[2] ?? 0)];
    if (rail) hBounds.push(rail.position[2], rail.position[2] + rail.size[2]);
    if (back) hBounds.push(back.position[2] + back.size[2]);
    hBounds.push(ENV.depth);

    const vBounds = [0, legH];
    for (let i = rows.length - 1; i >= 0; i--) {
      vBounds.push(rows[i].frontTopY);
      if (i > 0) vBounds.push(rows[i - 1].frontBottomY);
    }
    vBounds.push(top.y0, top.y1);

    return [
      ...chain(hBounds, "h", 0),
      { dir: "h", from: spaceZ[0], to: spaceZ[1], level: 1, label: `svetlo ${usableDepth}` },
      { dir: "h", from: 0, to: ENV.depth, level: 2 },
      ...chain(vBounds, "v", 0),
      { dir: "v", from: 0, to: ENV.height, level: 1 },
    ];
  }

  // sectionH — šírková skladba: bok, svetlosť, priečka, svetlosť, bok
  const boxL = partById("box-side-l-r1c1");
  const boxR = partById("box-side-r-r1c1");
  return [
    ...chain([0, T, carcass.dividerX, carcass.dividerX + T, ENV.width - T, ENV.width], "h", 0),
    ...(boxL && boxR
      ? [{
          dir: "h" as const,
          from: boxL.position[0],
          to: boxR.position[0] + boxR.size[0],
          level: 1,
          label: `box ${boxWidth}`,
        }]
      : []),
    { dir: "h", from: 0, to: ENV.width, level: 2 },
    ...chain([0, T, box?.position[2] ?? 0, (box?.position[2] ?? 0) + (box?.size[2] ?? 0), ENV.depth], "v", 0),
    { dir: "v", from: 0, to: ENV.depth, level: 1 },
  ];
}

function DimLine({ dim, ax }: { dim: Dim; ax: Axes }) {
  const size = Math.abs(dim.to - dim.from);
  if (size < 1) return null;
  const label = dim.label ?? String(Math.round(size * 10) / 10);
  const off = MARGIN * 0.28 + dim.level * STEP;

  if (dim.dir === "h") {
    const y = ax.height + off;
    const [a, b] = [dim.from, dim.to];
    return (
      <g className="dim">
        <line x1={a} y1={ax.height} x2={a} y2={y + 18} />
        <line x1={b} y1={ax.height} x2={b} y2={y + 18} />
        <line x1={a} y1={y} x2={b} y2={y} markerStart="url(#tick)" markerEnd="url(#tick)" />
        <text x={(a + b) / 2} y={y - 16} textAnchor="middle">{label}</text>
      </g>
    );
  }

  // zvislé kóty vpravo; spec Y ide hore, SVG nadol
  const x = ax.width + off;
  const a = ax.height - dim.from;
  const b = ax.height - dim.to;
  return (
    <g className="dim">
      <line x1={ax.width} y1={a} x2={x + 18} y2={a} />
      <line x1={ax.width} y1={b} x2={x + 18} y2={b} />
      <line x1={x} y1={a} x2={x} y2={b} markerStart="url(#tick)" markerEnd="url(#tick)" />
      <text x={x + 14} y={(a + b) / 2} textAnchor="start" dominantBaseline="middle">{label}</text>
    </g>
  );
}

/*
 * Kóty vybraného dielu priamo pri ňom. V pohľade sú v pláne len dva jeho
 * rozmery — ten tretí ide do hĺbky a nedá sa okótovať bez skreslenia, preto
 * ho vypisuje popiska. Kóty sa lepia na diel, nie na okraj listu, takže je
 * hneď vidieť, čoho sa týkajú.
 */
function PartDims({ part, ax, rect }: {
  part: Part; ax: Axes; rect: { x: number; y: number; w: number; h: number };
}) {
  const g = 40;                        // mm, odsadenie kóty od hrany dielu
  const round = (v: number) => Math.round(v * 10) / 10;
  const hSize = round(part.size[ax.h]);
  const vSize = round(part.size[ax.v]);
  const depth = round(part.size[ax.toward]);
  const { x, y, w, h } = rect;

  return (
    <g className="partdims">
      {/* vodorovný rozmer — nad dielom */}
      <line x1={x} y1={y} x2={x} y2={y - g - 10} className="ext" />
      <line x1={x + w} y1={y} x2={x + w} y2={y - g - 10} className="ext" />
      <line x1={x} y1={y - g} x2={x + w} y2={y - g} markerStart="url(#tick)" markerEnd="url(#tick)" />
      <text x={x + w / 2} y={y - g - 16} textAnchor="middle">{hSize}</text>

      {/* zvislý rozmer — vpravo od dielu */}
      <line x1={x + w} y1={y} x2={x + w + g + 10} y2={y} className="ext" />
      <line x1={x + w} y1={y + h} x2={x + w + g + 10} y2={y + h} className="ext" />
      <line x1={x + w + g} y1={y} x2={x + w + g} y2={y + h} markerStart="url(#tick)" markerEnd="url(#tick)" />
      <text x={x + w + g + 16} y={y + h / 2} textAnchor="start" dominantBaseline="middle">{vSize}</text>

      {/* tretí rozmer sa v tomto pohľade okótovať nedá */}
      <text className="away" x={x + w / 2} y={y + h + g} textAnchor="middle">
        do hĺbky {depth}
      </text>
    </g>
  );
}

/** Čiarkovaná stopa roviny rezu v pohľade, z ktorého sa rez odvodzuje. */
function SectionMark({ ax, vertical, at, label }: {
  ax: Axes; vertical: boolean; at: number; label: string;
}) {
  if (vertical) {
    return (
      <g className="secmark">
        <line x1={at} y1={-MARGIN * 0.3} x2={at} y2={ax.height + MARGIN * 0.12} />
        <text x={at} y={-MARGIN * 0.34} textAnchor="middle">{label}&#8211;{label}</text>
      </g>
    );
  }
  const y = ax.height - at;
  return (
    <g className="secmark">
      <line x1={-MARGIN * 0.3} y1={y} x2={ax.width + MARGIN * 0.12} y2={y} />
      <text x={-MARGIN * 0.34} y={y} textAnchor="end" dominantBaseline="middle">{label}&#8211;{label}</text>
    </g>
  );
}

export default function Drawing({ view, visible, selected, onSelect, palette, grain, sectionAt }: {
  view: ViewId;
  visible: Set<string>;
  selected: string | null;
  onSelect: (id: string | null) => void;
  palette: Palette;
  grain: boolean;
  sectionAt: Record<SectionId, number>;
}) {
  const ax = AXES[view];
  const at = isSection(view) ? sectionAt[view] : null;

  const parts = doc.parts
    .filter((p) => visible.has(p.group))
    .slice()
    .sort((a, b) =>
      ax.towardAsc
        ? a.position[ax.toward] - b.position[ax.toward]
        : b.position[ax.toward] - a.position[ax.toward],
    );

  // V reze sa materiál medzi divákom a rovinou zahodí, zvyšok sa rozdelí na
  // to, čo je v reze, a to, čo za ním len vidno. Rez sa kreslí navrch.
  const shown = parts
    .map((p) => ({ p, where: at === null ? ("beyond" as Placement) : placementOf(p, ax, at) }))
    .filter((x) => x.where !== "hidden");
  const ordered = at === null
    ? shown
    : [...shown.filter((x) => x.where === "beyond"), ...shown.filter((x) => x.where === "cut")];

  const selectedPart = selected ? (ordered.find((x) => x.p.id === selected)?.p ?? null) : null;

  const rectOf = (p: Part) => {
    const x = p.position[ax.h];
    const w = p.size[ax.h];
    const h = p.size[ax.v];
    // zvislá os sa preklápa: v SVG rastie nadol.
    // Pri pôdoryse to zároveň otočí hĺbku tak, že čelo je dole.
    const y = ax.height - p.position[ax.v] - h;
    return { x, y, w, h };
  };

  return (
    <div className="sheet">
      <svg
        viewBox={`${-MARGIN} ${-MARGIN * 0.4} ${ax.width + MARGIN * 2} ${ax.height + MARGIN * 1.4}`}
        preserveAspectRatio="xMidYMid meet"
        onClick={() => onSelect(null)}
      >
        <defs>
          <marker id="tick" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
            <line x1="2" y1="8" x2="8" y2="2" stroke="currentColor" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
          </marker>
          {/* šrafovanie rezaného materiálu, 45° á 24 mm v mierke výkresu */}
          <pattern id="hatch" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="24" strokeWidth="3.5" />
          </pattern>
        </defs>

        {view === "front" && (
          <>
            <SectionMark ax={ax} vertical at={sectionAt.sectionV} label="A" />
            <SectionMark ax={ax} vertical={false} at={sectionAt.sectionH} label="B" />
          </>
        )}
        {view === "side" && <SectionMark ax={ax} vertical={false} at={sectionAt.sectionH} label="B" />}
        {view === "top" && <SectionMark ax={ax} vertical at={sectionAt.sectionV} label="A" />}

        <g className="parts">
          {ordered.map(({ p, where }) => {
            const r = rectOf(p);
            const cls = ["part", at !== null ? where : "", p.id === selected ? "sel" : ""]
              .filter(Boolean)
              .join(" ");
            const onClick = (e: MouseEvent) => {
              e.stopPropagation();
              onSelect(p.id === selected ? null : p.id);
            };
            return (
              <g key={p.id}>
                <rect
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.h}
                  fill={colorOf(p, palette)}
                  className={cls}
                  vectorEffect="non-scaling-stroke"
                  onClick={onClick}
                />
                {where === "cut" && at !== null && (
                  <rect
                    x={r.x}
                    y={r.y}
                    width={r.w}
                    height={r.h}
                    fill="url(#hatch)"
                    className="hatch"
                    onClick={onClick}
                  />
                )}
              </g>
            );
          })}
        </g>

        {grain && view === "front" && (
          <g className="grain">
            {ordered.map((x) => x.p).filter((p) => p.grain).map((p) => {
              const r = rectOf(p);
              return [0.25, 0.5, 0.75].map((f) => (
                <line
                  key={`${p.id}-${f}`}
                  x1={r.x + r.w * 0.06}
                  x2={r.x + r.w * 0.94}
                  y1={r.y + r.h * f}
                  y2={r.y + r.h * f}
                  vectorEffect="non-scaling-stroke"
                />
              ));
            })}
          </g>
        )}

        <g className="dims">
          {dimensionsFor(view).map((d, i) => (
            <DimLine key={i} dim={d} ax={ax} />
          ))}
        </g>

        {selectedPart && <PartDims part={selectedPart} ax={ax} rect={rectOf(selectedPart)} />}

        <text className="caption" x={0} y={ax.height + MARGIN * 0.95}>
          {VIEW_LABEL[view]}
          {at !== null && ` · rovina ${view === "sectionV" ? "x" : "y"} = ${at}`}
          {" · mm · "}{doc.generated}
        </text>
      </svg>
    </div>
  );
}
