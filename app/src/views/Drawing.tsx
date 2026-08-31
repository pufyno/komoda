import { doc, geometry, ENV, colorOf, partById, type Palette, type Part } from "../data";

export type ViewId = "front" | "side" | "top";

export const VIEW_LABEL: Record<ViewId, string> = {
  front: "Nárys",
  side: "Bokorys",
  top: "Pôdorys",
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
};

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

  return [
    ...chain([0, T, carcass.dividerX, carcass.dividerX + T, ENV.width - T, ENV.width], "h", 0),
    { dir: "h", from: 0, to: ENV.width, level: 1 },
    ...chain([0, T, ENV.depth], "v", 0),
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

export default function Drawing({ view, visible, selected, onSelect, palette, grain }: {
  view: ViewId;
  visible: Set<string>;
  selected: string | null;
  onSelect: (id: string | null) => void;
  palette: Palette;
  grain: boolean;
}) {
  const ax = AXES[view];

  const parts = doc.parts
    .filter((p) => visible.has(p.group))
    .slice()
    .sort((a, b) =>
      ax.towardAsc
        ? a.position[ax.toward] - b.position[ax.toward]
        : b.position[ax.toward] - a.position[ax.toward],
    );

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
        </defs>

        <g className="parts">
          {parts.map((p) => {
            const r = rectOf(p);
            return (
              <rect
                key={p.id}
                x={r.x}
                y={r.y}
                width={r.w}
                height={r.h}
                fill={colorOf(p, palette)}
                className={p.id === selected ? "part sel" : "part"}
                vectorEffect="non-scaling-stroke"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(p.id === selected ? null : p.id);
                }}
              />
            );
          })}
        </g>

        {grain && view === "front" && (
          <g className="grain">
            {parts.filter((p) => p.grain).map((p) => {
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

        <text className="caption" x={0} y={ax.height + MARGIN * 0.95}>
          {VIEW_LABEL[view]} · mm · {doc.generated}
        </text>
      </svg>
    </div>
  );
}
