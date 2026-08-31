import { cutlist, doc } from "../data";

const MATERIAL_LABEL: Record<string, string> = {
  ldtd25: "LDTD 25",
  ldtd18: "LDTD 18",
  ldtd16: "LDTD 16",
  hdf10: "HDF 10",
  hdf8: "HDF 8",
};

export default function Cutlist() {
  const groups = [...new Set(cutlist.parts.map((p) => p.group))];
  const totalPieces = cutlist.parts.reduce((a, p) => a + p.qty, 0);

  return (
    <div className="sheet cutlist">
      <header>
        <h2>Nárezový plán</h2>
        <p>
          Komoda 1800 × 1050 × 800 mm · {totalPieces} kusov · generované {cutlist.generated}
          <br />
          Rozmery v mm, dĺžka × šírka. Hrany ABS 2 mm s potlačou v dekore.
        </p>
      </header>

      {groups.map((g) => (
        <section key={g}>
          <h3>{g}</h3>
          <table>
            <thead>
              <tr>
                <th>Diel</th>
                <th className="r">ks</th>
                <th className="r">dĺžka</th>
                <th className="r">šírka</th>
                <th className="r">hr.</th>
                <th>materiál</th>
                <th>poznámka</th>
              </tr>
            </thead>
            <tbody>
              {cutlist.parts.filter((p) => p.group === g).map((p, i) => (
                <tr key={`${p.name}-${i}`}>
                  <td>{p.name}</td>
                  <td className="r num">{p.qty}</td>
                  <td className="r num">{p.length}</td>
                  <td className="r num">{p.width}</td>
                  <td className="r num">{p.thickness}</td>
                  <td>{MATERIAL_LABEL[p.material] ?? p.material}</td>
                  <td className="note-cell">{p.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      <section>
        <h3>kovanie</h3>
        <table>
          <thead>
            <tr>
              <th>Položka</th>
              <th className="r">množstvo</th>
              <th className="r">dĺžka</th>
              <th>poznámka</th>
            </tr>
          </thead>
          <tbody>
            {cutlist.hardware.map((h) => (
              <tr key={h.item}>
                <td>{h.item}</td>
                <td className="r num">{h.qty}</td>
                <td className="r num">{h.length ?? "—"}</td>
                <td className="note-cell">{h.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer>
        <p>
          <strong>Pred nárezom over:</strong> reveal gola profilu v montážnom návode
          (ak nie je 21/22 mm, menia sa výšky čiel). Čelá rezať v poradí z jednej
          dosky, aby kresba dubu nadväzovala.
        </p>
        <p className="src">
          Zdroj: <code>spec/komoda.json</code> → <code>spec/derived/cutlist.json</code>.
          Svetlosť boxu {doc.drawers[0].inner.width} × {doc.drawers[0].inner.height} × {doc.drawers[0].inner.depth} mm.
        </p>
      </footer>
    </div>
  );
}
