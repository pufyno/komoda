import { DECISION_TITLE, DECISIONS_URL, GROUP_COLOR, type Part } from "../data";

const MATERIAL_LABEL: Record<string, string> = {
  ldtd25: "LDTD 25 mm",
  ldtd18: "LDTD 18 mm",
  ldtd16: "LDTD 16 mm",
  hdf10: "HDF 10 mm",
  hdf8: "HDF 8 mm",
};

export default function DetailPanel({ part, onClose }: { part: Part; onClose: () => void }) {
  const [sx, sy, sz] = part.size;
  const [px, py, pz] = part.position;

  return (
    <aside className="panel detail">
      <header>
        <span className="swatch" style={{ background: GROUP_COLOR[part.group] ?? "#999" }} />
        <h2>{part.label}</h2>
        <button onClick={onClose} aria-label="Zavrieť">×</button>
      </header>

      <dl>
        <dt>Skupina</dt>
        <dd>{part.group}</dd>

        <dt>Rozmer</dt>
        <dd className="num">{sx} × {sy} × {sz} mm</dd>

        {part.material && (
          <>
            <dt>Materiál</dt>
            <dd>{MATERIAL_LABEL[part.material] ?? part.material}</dd>
          </>
        )}
        {part.edging && (<><dt>Hrana</dt><dd>{part.edging}</dd></>)}
        {part.grain && (<><dt>Kresba</dt><dd>{part.grain === "horizontal" ? "vodorovná, po dĺžke čela" : part.grain}</dd></>)}
        {part.profileType && (<><dt>Profil</dt><dd>{part.profileType}, prierez {part.profileHeight} mm, {part.finish}</dd></>)}
        {part.loadKg && (<><dt>Nosnosť</dt><dd className="num">{part.loadKg} kg</dd></>)}

        <dt>Poloha</dt>
        <dd className="num">x {px} · y {py} · z {pz}</dd>
      </dl>

      {part.note && <p className="note">{part.note}</p>}

      {part.decision && (
        <a className="decision" href={DECISIONS_URL} target="_blank" rel="noreferrer">
          <strong>{part.decision}</strong> {DECISION_TITLE[part.decision] ?? ""}
        </a>
      )}
    </aside>
  );
}
