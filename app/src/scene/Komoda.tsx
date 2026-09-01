import { useMemo, useRef, type ReactNode } from "react";
import { BoxGeometry, Group } from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid, Line, Html } from "@react-three/drei";
import { doc, toScene, MM, ENV, colorOf, isMetal, type Palette, type Part, type Vec3 } from "../data";

interface Props {
  visible: Set<string>;
  selected: string | null;
  onSelect: (id: string | null) => void;
  showEnvelope: boolean;
  openDrawers: Set<string>;
  toggleDrawer: (id: string) => void;
  explode: number;
  palette: Palette;
  grain: boolean;
  xray: boolean;
}

/** Rozstrel: diel sa odsunie od stredu modelu úmerne svojej vzdialenosti. */
function explodeOffset(part: Part, explode: number): [number, number, number] {
  if (explode === 0) return [0, 0, 0];
  const [x, y, z] = toScene(part.center);
  const k = explode * 0.55;
  return [x * k, (y - (ENV.height * MM) / 2) * k, z * k];
}

function GrainLines({ part, offset }: { part: Part; offset: [number, number, number] }) {
  const [x0, y0] = part.position;
  const [w, h] = part.size;
  const inset = w * 0.06;
  const lines = [0.25, 0.5, 0.75].map((f) => {
    const y = y0 + h * f;
    const a = toScene([x0 + inset, y, -1]);
    const b = toScene([x0 + w - inset, y, -1]);
    return [
      [a[0] + offset[0], a[1] + offset[1], a[2] + offset[2]],
      [b[0] + offset[0], b[1] + offset[1], b[2] + offset[2]],
    ] as [number, number, number][];
  });
  return (
    <>
      {lines.map((pts, i) => (
        <Line key={i} points={pts} color="#6b4f2c" lineWidth={1.4} transparent opacity={0.7} />
      ))}
    </>
  );
}

function PartMesh({ part, selected, onSelect, onOpen, explode, palette, grain, xray }: {
  part: Part;
  selected: boolean;
  onSelect: (id: string | null) => void;
  onOpen: (drawer: string) => void;
  explode: number;
  palette: Palette;
  grain: boolean;
  xray: boolean;
}) {
  const [px, py, pz] = toScene(part.center);
  const [ox, oy, oz] = explodeOffset(part, explode);
  const [sx, sy, sz] = part.size;
  const color = colorOf(part, palette);
  const metal = isMetal(part.group);
  const r = (part.diameter ?? sx) * MM * 0.5;
  // Röntgen: drevo zpriehľadnie, kovanie zostane plné. Výsuvy a kotvy sú
  // inak zamurované medzi bokom a boxom a zvonku ich vidieť nie je.
  const ghost = xray && !part.hardware && !selected;

  return (
    <>
    <mesh
      position={[px + ox, py + oy, pz + oz]}
      rotation={part.shape === "cylinder" && part.axis === "z" ? [Math.PI / 2, 0, 0] : [0, 0, 0]}
      /* v röntgene sa dá klikať priamo na kovanie — drevo pred ním neprekáža */
      raycast={ghost ? () => null : undefined}
      castShadow
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        onSelect(selected ? null : part.id);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (part.drawer) onOpen(part.drawer);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = part.drawer ? "grab" : "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      {part.shape === "cylinder" ? (
        <cylinderGeometry args={[r, r, (part.axis === "z" ? sz : sy) * MM, 24]} />
      ) : (
        <boxGeometry args={[sx * MM, sy * MM, sz * MM]} />
      )}
      <meshStandardMaterial
        color={selected ? "#ffffff" : color}
        emissive={selected ? "#4b78ff" : "#000000"}
        emissiveIntensity={selected ? 0.45 : 0}
        metalness={metal ? 0.7 : 0.05}
        roughness={metal ? 0.35 : 0.75}
        transparent={ghost}
        opacity={ghost ? 0.12 : 1}
        depthWrite={!ghost}
      />
    </mesh>
    {grain && part.grain && <GrainLines part={part} offset={[ox, oy, oz]} />}
    {selected && <PartDimensions part={part} offset={[ox, oy, oz]} />}
    </>
  );
}

/** Skupina, ktorá dobehne na `target` po osi Z. */
function SlidingGroup({ target, children }: { target: number; children: ReactNode }) {
  const ref = useRef<Group>(null);
  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    const step = Math.min(1, delta * 6);
    g.position.z += (target - g.position.z) * step;
  });
  return <group ref={ref}>{children}</group>;
}

/*
 * Zásuvka sa vysúva dopredu — v scéne je to +Z, lebo spec má Z dozadu.
 * Nie všetko v nej ide rovnakou dráhou: box ide celú, stredný člen
 * plnovýsuvu polovičnú (travelFactor z parts.json). Vďaka tomu výsuv pri
 * otvorení premostí medzeru medzi korpusom a boxom namiesto toho, aby s
 * boxom odletel alebo zostal trčať vzadu.
 */
function DrawerGroup({ parts, open, travel, ...rest }: {
  parts: Part[];
  open: boolean;
  travel: number;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onOpen: (drawer: string) => void;
  explode: number;
  palette: Palette;
  grain: boolean;
  xray: boolean;
}) {
  const target = open ? travel * MM : 0;

  const byFactor = useMemo(() => {
    const m = new Map<number, Part[]>();
    for (const p of parts) {
      const f = p.travelFactor ?? 1;
      const list = m.get(f) ?? [];
      list.push(p);
      m.set(f, list);
    }
    return [...m].sort((a, b) => a[0] - b[0]);
  }, [parts]);

  return (
    <>
      {byFactor.map(([factor, group]) => (
        <SlidingGroup key={factor} target={target * factor}>
          {group.map((p) => (
            <PartMesh
              key={p.id}
              part={p}
              selected={p.id === rest.selected}
              onSelect={rest.onSelect}
              onOpen={rest.onOpen}
              explode={rest.explode}
              palette={rest.palette}
              grain={rest.grain}
              xray={rest.xray}
            />
          ))}
        </SlidingGroup>
      ))}
    </>
  );
}

/*
 * Kóty vybraného dielu priamo v scéne. Tri čiary pozdĺž jeho hrán —
 * šírka dole, výška vľavo, hĺbka vpravo — s vynášacími čiarami od rohov,
 * aby bolo vidieť, čoho sa kóta týka. Čísla idú z parts.json, nikde sa
 * nič nepočíta okrem odsadenia kóty od dielu.
 */
const DIM_GAP = 55;      // mm, odsadenie kóty od hrany dielu
const DIM_COLOR = "#7dd3fc";

function DimLine3D({ a, b, label }: { a: Vec3; b: Vec3; label: string }) {
  const mid: Vec3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  return (
    <>
      <Line points={[a, b]} color={DIM_COLOR} lineWidth={1.8} />
      <Html position={mid} center zIndexRange={[20, 0]} pointerEvents="none">
        <span className="dim3d">{label}</span>
      </Html>
    </>
  );
}

function PartDimensions({ part, offset }: { part: Part; offset: Vec3 }) {
  const [w, h, d] = part.size;
  const [x0, y0, z0] = part.position;
  const g = DIM_GAP;

  // spec → scéna, plus posun z rozstrelu
  const P = (x: number, y: number, z: number): Vec3 => {
    const [a, b, c] = toScene([x, y, z]);
    return [a + offset[0], b + offset[1], c + offset[2]];
  };
  const round = (v: number) => Math.round(v * 10) / 10;

  return (
    <group>
      {/* obrys dielu, aby bolo jasné, ktorý to je */}
      <Line
        points={[P(x0, y0, z0), P(x0 + w, y0, z0), P(x0 + w, y0 + h, z0), P(x0, y0 + h, z0), P(x0, y0, z0)]}
        color={DIM_COLOR}
        lineWidth={1.2}
        transparent
        opacity={0.5}
      />
      {/* šírka — dole */}
      <Line points={[P(x0, y0, z0), P(x0, y0 - g, z0)]} color={DIM_COLOR} lineWidth={0.8} transparent opacity={0.5} />
      <Line points={[P(x0 + w, y0, z0), P(x0 + w, y0 - g, z0)]} color={DIM_COLOR} lineWidth={0.8} transparent opacity={0.5} />
      <DimLine3D a={P(x0, y0 - g, z0)} b={P(x0 + w, y0 - g, z0)} label={String(round(w))} />
      {/* výška — vľavo */}
      <Line points={[P(x0, y0, z0), P(x0 - g, y0, z0)]} color={DIM_COLOR} lineWidth={0.8} transparent opacity={0.5} />
      <Line points={[P(x0, y0 + h, z0), P(x0 - g, y0 + h, z0)]} color={DIM_COLOR} lineWidth={0.8} transparent opacity={0.5} />
      <DimLine3D a={P(x0 - g, y0, z0)} b={P(x0 - g, y0 + h, z0)} label={String(round(h))} />
      {/* hĺbka — vpravo */}
      <Line points={[P(x0 + w, y0, z0), P(x0 + w + g, y0, z0)]} color={DIM_COLOR} lineWidth={0.8} transparent opacity={0.5} />
      <Line points={[P(x0 + w, y0, z0 + d), P(x0 + w + g, y0, z0 + d)]} color={DIM_COLOR} lineWidth={0.8} transparent opacity={0.5} />
      <DimLine3D a={P(x0 + w + g, y0, z0)} b={P(x0 + w + g, y0, z0 + d)} label={String(round(d))} />
    </group>
  );
}

function Envelope() {
  const h = ENV.height * MM;
  const box = useMemo(() => new BoxGeometry(ENV.width * MM, h, ENV.depth * MM), [h]);
  return (
    <lineSegments position={[0, h / 2, 0]}>
      <edgesGeometry args={[box]} />
      <lineBasicMaterial color="#5b6470" />
    </lineSegments>
  );
}

export default function Komoda({
  visible, selected, onSelect, showEnvelope, openDrawers, toggleDrawer, explode, palette, grain, xray,
}: Props) {
  const { fixed, byDrawer } = useMemo(() => {
    const shown = doc.parts.filter((p) => visible.has(p.group));
    const byDrawer = new Map<string, Part[]>();
    const fixed: Part[] = [];
    for (const p of shown) {
      if (p.drawer) {
        const list = byDrawer.get(p.drawer) ?? [];
        list.push(p);
        byDrawer.set(p.drawer, list);
      } else {
        fixed.push(p);
      }
    }
    return { fixed, byDrawer };
  }, [visible]);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [1.9, 1.35, 2.4], fov: 40, near: 0.05, far: 60 }}
      onPointerMissed={() => onSelect(null)}
    >
      <color attach="background" args={["#151a21"]} />
      <hemisphereLight intensity={0.6} groundColor="#10141a" />
      <directionalLight
        position={[2.5, 4, 3]}
        intensity={2.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-2}
        shadow-camera-right={2}
        shadow-camera-top={2}
        shadow-camera-bottom={-2}
      />
      <directionalLight position={[-3, 2, -2]} intensity={0.6} />
      <directionalLight position={[0, 1, -4]} intensity={0.4} />

      <group>
        {fixed.map((p) => (
          <PartMesh
            key={p.id}
            part={p}
            selected={p.id === selected}
            onSelect={onSelect}
            onOpen={toggleDrawer}
            explode={explode}
            palette={palette}
            grain={grain}
            xray={xray}
          />
        ))}
        {[...byDrawer].map(([id, parts]) => (
          <DrawerGroup
            key={id}
            parts={parts}
            open={openDrawers.has(id)}
            travel={doc.drawers.find((d) => d.id === id)?.travel ?? 0}
            selected={selected}
            onSelect={onSelect}
            onOpen={toggleDrawer}
            explode={explode}
            palette={palette}
            grain={grain}
            xray={xray}
          />
        ))}
        {showEnvelope && <Envelope />}
      </group>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <planeGeometry args={[14, 14]} />
        <shadowMaterial opacity={0.35} />
      </mesh>
      <Grid
        args={[14, 14]}
        cellSize={0.1}
        sectionSize={1}
        cellColor="#202833"
        sectionColor="#303b4b"
        fadeDistance={11}
        infiniteGrid
      />

      <OrbitControls
        makeDefault
        target={[0, ENV.height * MM * 0.45, 0]}
        minDistance={0.8}
        maxDistance={9}
        maxPolarAngle={Math.PI / 2 - 0.02}
        enableDamping
      />
    </Canvas>
  );
}
