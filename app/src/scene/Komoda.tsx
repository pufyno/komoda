import { useMemo, useRef } from "react";
import { BoxGeometry, Group } from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { doc, toScene, MM, ENV, GROUP_COLOR, isMetal, type Part } from "../data";

interface Props {
  visible: Set<string>;
  selected: string | null;
  onSelect: (id: string | null) => void;
  showEnvelope: boolean;
  openDrawers: Set<string>;
  toggleDrawer: (id: string) => void;
  explode: number;
}

/** Rozstrel: diel sa odsunie od stredu modelu úmerne svojej vzdialenosti. */
function explodeOffset(part: Part, explode: number): [number, number, number] {
  if (explode === 0) return [0, 0, 0];
  const [x, y, z] = toScene(part.center);
  const k = explode * 0.55;
  return [x * k, (y - (ENV.height * MM) / 2) * k, z * k];
}

function PartMesh({ part, selected, onSelect, onOpen, explode }: {
  part: Part;
  selected: boolean;
  onSelect: (id: string | null) => void;
  onOpen: (drawer: string) => void;
  explode: number;
}) {
  const [px, py, pz] = toScene(part.center);
  const [ox, oy, oz] = explodeOffset(part, explode);
  const [sx, sy, sz] = part.size;
  const color = GROUP_COLOR[part.group] ?? "#999";
  const metal = isMetal(part.group);
  const r = (part.diameter ?? sx) * MM * 0.5;

  return (
    <mesh
      position={[px + ox, py + oy, pz + oz]}
      rotation={part.shape === "cylinder" && part.axis === "z" ? [Math.PI / 2, 0, 0] : [0, 0, 0]}
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
      />
    </mesh>
  );
}

/** Zásuvka sa vysúva dopredu — v scéne je to +Z, lebo spec má Z dozadu. */
function DrawerGroup({ parts, open, travel, ...rest }: {
  parts: Part[];
  open: boolean;
  travel: number;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onOpen: (drawer: string) => void;
  explode: number;
}) {
  const ref = useRef<Group>(null);
  const target = open ? travel * MM : 0;

  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    const step = Math.min(1, delta * 6);
    g.position.z += (target - g.position.z) * step;
  });

  return (
    <group ref={ref}>
      {parts.map((p) => (
        <PartMesh
          key={p.id}
          part={p}
          selected={p.id === rest.selected}
          onSelect={rest.onSelect}
          onOpen={rest.onOpen}
          explode={rest.explode}
        />
      ))}
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
  visible, selected, onSelect, showEnvelope, openDrawers, toggleDrawer, explode,
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
