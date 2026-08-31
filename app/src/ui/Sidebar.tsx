import { useState } from "react";
import { doc, geometry, GROUP_COLOR, GROUP_ORDER, countByGroup } from "../data";

interface Props {
  visible: Set<string>;
  toggle: (group: string) => void;
  showEnvelope: boolean;
  setShowEnvelope: (v: boolean) => void;
  openCount: number;
  setAllDrawers: (open: boolean) => void;
  explode: number;
  setExplode: (v: number) => void;
}

export default function Sidebar({
  visible, toggle, showEnvelope, setShowEnvelope,
  openCount, setAllDrawers, explode, setExplode,
}: Props) {
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
        <h3>Zásuvky</h3>
        <div className="controls">
          <button
            className="action"
            onClick={() => setAllDrawers(openCount < doc.drawers.length)}
          >
            {openCount < doc.drawers.length ? "Otvoriť všetky" : "Zavrieť všetky"}
          </button>
          <span className="counter">{openCount} / {doc.drawers.length}</span>
        </div>
        <p className="micro">Dvojklik na zásuvku ju otvorí samostatne.</p>
      </section>

      <section>
        <h3>Rozstrel</h3>
        <input
          className="slider"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={explode}
          onChange={(e) => setExplode(Number(e.target.value))}
        />
        <p className="micro">Odsunie diely od stredu, aby bolo vidieť skladbu.</p>
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
          <dt>Svetlosť boxu</dt>
          <dd className="num">{doc.drawers[0].inner.width} × {doc.drawers[0].inner.height}</dd>
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
