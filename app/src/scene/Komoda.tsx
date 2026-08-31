import { useMemo } from "react";
import { BoxGeometry } from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { doc, toScene, MM, ENV, GROUP_COLOR, isMetal, type Part } from "../data";

interface Props {
  visible: Set<string>;
  selected: string | null;
  onSelect: (id: string | null) => void;
  showEnvelope: boolean;
}

function PartMesh({ part, selected, onSelect }: {
  part: Part;
  selected: boolean;
  onSelect: (id: string | null) => void;
}) {
  const pos = toScene(part.center);
  const [sx, sy, sz] = part.size;
  const color = GROUP_COLOR[part.group] ?? "#999";
  const metal = isMetal(part.group);

  const geom =
    part.shape === "cylinder" ? (
      <cylinderGeometry args={[(part.diameter ?? sx) * MM * 0.5, (part.diameter ?? sx) * MM * 0.5, (part.axis === "z" ? sz : sy) * MM, 24]} />
    ) : (
      <boxGeometry args={[sx * MM, sy * MM, sz * MM]} />
    );

  return (
    <mesh
      position={pos}
      rotation={part.shape === "cylinder" && part.axis === "z" ? [Math.PI / 2, 0, 0] : [0, 0, 0]}
      castShadow
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        onSelect(selected ? null : part.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      {geom}
      <meshStandardMaterial
        color={selected ? "#ffffff" : color}
        emissive={selected ? "#4b78ff" : "#000000"}
        emissiveIntensity={selected ? 0.45 : 0}
        metalness={metal ? 0.75 : 0.05}
        roughness={metal ? 0.35 : 0.75}
      />
    </mesh>
  );
}

function Envelope() {
  const h = ENV.height * MM;
  const box = useMemo(
    () => new BoxGeometry(ENV.width * MM, h, ENV.depth * MM),
    [h],
  );
  return (
    <lineSegments position={[0, h / 2, 0]}>
      <edgesGeometry args={[box]} />
      <lineBasicMaterial color="#5b6470" />
    </lineSegments>
  );
}

export default function Komoda({ visible, selected, onSelect, showEnvelope }: Props) {
  const parts = useMemo(() => doc.parts.filter((p) => visible.has(p.group)), [visible]);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [1.9, 1.35, 2.4], fov: 40, near: 0.05, far: 60 }}
      onPointerMissed={() => onSelect(null)}
    >
      <color attach="background" args={["#11151b"]} />
      <hemisphereLight intensity={0.55} groundColor="#0c0f14" />
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
      <directionalLight position={[-3, 2, -2]} intensity={0.5} />

      <group>
        {parts.map((p) => (
          <PartMesh key={p.id} part={p} selected={p.id === selected} onSelect={onSelect} />
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
        cellColor="#1e2530"
        sectionColor="#2d3644"
        fadeDistance={11}
        infiniteGrid
        position={[0, 0, 0]}
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
