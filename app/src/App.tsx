import { useCallback, useMemo, useState } from "react";
import Komoda from "./scene/Komoda";
import Sidebar from "./ui/Sidebar";
import DetailPanel from "./ui/DetailPanel";
import { doc, GROUP_ORDER } from "./data";

export default function App() {
  const [visible, setVisible] = useState(() => new Set(GROUP_ORDER));
  const [selected, setSelected] = useState<string | null>(null);
  const [showEnvelope, setShowEnvelope] = useState(false);

  const toggle = useCallback((group: string) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }, []);

  const selectedPart = useMemo(
    () => doc.parts.find((p) => p.id === selected) ?? null,
    [selected],
  );

  return (
    <div className="app">
      <Komoda
        visible={visible}
        selected={selected}
        onSelect={setSelected}
        showEnvelope={showEnvelope}
      />
      <Sidebar
        visible={visible}
        toggle={toggle}
        showEnvelope={showEnvelope}
        setShowEnvelope={setShowEnvelope}
      />
      {selectedPart ? (
        <DetailPanel part={selectedPart} onClose={() => setSelected(null)} />
      ) : (
        <aside className="panel hint">Klikni na diel a uvidíš jeho rozmery a dôvod, prečo je taký.</aside>
      )}
    </div>
  );
}
