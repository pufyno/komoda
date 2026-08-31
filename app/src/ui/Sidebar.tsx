import { useState } from "react";
import { doc, geometry, GROUP_COLOR, GROUP_ORDER, countByGroup } from "../data";

interface Props {
  visible: Set<string>;
  toggle: (group: string) => void;
  showEnvelope: boolean;
  setShowEnvelope: (v: boolean) => void;
}

export default function Sidebar({ visible, toggle, showEnvelope, setShowEnvelope }: Props) {
  const [openAssumptions, setOpenAssumptions] = useState(false);
  const counts = countByGroup(doc.parts);
  const groups = GROUP_ORDER.filter((g) => counts[g]);

  return (
    <aside className="panel sidebar">
      <h1>Komoda<span>prebaľovací pult</span></h1>

      <p className="dims">
        1800 × 1050 × 800 mm · 8 zásuviek · gola
      </p>

      <section>
        <h3>Vrstvy</h3>
        <ul className="layers">
          {groups.map((g) => (
            <li key={g}>
              <label>
                <input type="checkbox" checked={visible.has(g)} onChange={() => toggle(g)} />
                <span className="swatch" style={{ background: GROUP_COLOR[g] }} />
                {g}
                <em>{counts[g]}</em>
              </label>
            </li>
          ))}
          <li className="sep">
            <label>
              <input type="checkbox" checked={showEnvelope} onChange={(e) => setShowEnvelope(e.target.checked)} />
              <span className="swatch outline" />
              obálka
            </label>
          </li>
        </ul>
      </section>

      <section>
        <h3>Kľúčové rozmery</h3>
        <dl className="facts">
          <dt>Svetlosť priehradky</dt>
          <dd className="num">{geometry.carcass.openingWidth} × {geometry.carcass.clearHeight}</dd>
          <dt>Zásuvkový box</dt>
          <dd className="num">{geometry.drawerBox.width} × {geometry.drawerBox.depth}</dd>
          <dt>Hĺbka na výsuv</dt>
          <dd className="num">{geometry.drawerBox.usableDepth} (potreba {geometry.drawerBox.depth})</dd>
        </dl>
      </section>

      <section className="assumptions">
        <button onClick={() => setOpenAssumptions(!openAssumptions)}>
          {openAssumptions ? "▾" : "▸"} Predpoklady umiestnenia ({doc.assumptions.length})
        </button>
        {openAssumptions && (
          <ul>
            {doc.assumptions.map((a) => <li key={a}>{a}</li>)}
          </ul>
        )}
      </section>

      <footer>
        {doc.parts.length} dielov · generované {doc.generated}<br />
        zo <code>spec/komoda.json</code>
      </footer>
    </aside>
  );
}
