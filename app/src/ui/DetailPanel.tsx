import { DECISION_TITLE, DECISIONS_URL, GROUP_COLOR, doc, type Part } from "../data";

const MATERIAL_LABEL: Record<string, string> = {
  ldtd25: "LDTD 25 mm",
  ldtd18: "LDTD 18 mm",
  ldtd16: "LDTD 16 mm",
  hdf10: "HDF 10 mm",
  hdf8: "HDF 8 mm",
};

interface Props {
  part: Part;
  open: boolean;
  onToggleDrawer: (id: string) => void;
  onClose: () => void;
}

export default function DetailPanel({ part, open, onToggleDrawer, onClose }: Props) {
  const [sx, sy, sz] = part.size;
  const [px, py, pz] = part.position;
  const drawer = part.drawer ? doc.drawers.find((d) => d.id === part.drawer) : undefined;

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

        {part.material && (<><dt>Materiál</dt><dd>{MATERIAL_LABEL[part.material] ?? part.material}</dd></>)}
        {part.edging && (<><dt>Hrana</dt><dd>{part.edging}</dd></>)}
        {part.grain && (<><dt>Kresba</dt><dd>{part.grain === "horizontal" ? "vodorovná" : part.grain}</dd></>)}
        {part.profileType && (<><dt>Profil</dt><dd>{part.profileType}, {part.profileHeight} mm, {part.finish}</dd></>)}
        {part.loadKg && (<><dt>Nosnosť</dt><dd className="num">{part.loadKg} kg</dd></>)}

        <dt>Poloha</dt>
        <dd className="num">x {px} · y {py} · z {pz}</dd>
      </dl>

      {drawer && (
        <div className="drawer-box">
          <h3>Zásuvka — rad {drawer.row + 1}, {drawer.col === 0 ? "vľavo" : "vpravo"}</h3>
          <dl>
            <dt>Svetlosť boxu</dt>
            <dd className="num">{drawer.inner.width} × {drawer.inner.height} × {drawer.inner.depth}</dd>
            <dt>Výška bokov</dt>
            <dd className="num">{drawer.boxSideHeight} mm</dd>
            <dt>Výsuv</dt>
            <dd className="num">{drawer.travel} mm (plný)</dd>
          </dl>
          <button className="action" onClick={() => onToggleDrawer(drawer.id)}>
            {open ? "Zavrieť zásuvku" : "Otvoriť zásuvku"}
          </button>
        </div>
      )}

      {part.note && <p className="note">{part.note}</p>}

      {part.decision && (
        <a className="decision" href={DECISIONS_URL} target="_blank" rel="noreferrer">
          <strong>{part.decision}</strong> {DECISION_TITLE[part.decision] ?? ""}
        </a>
      )}
    </aside>
  );
}
