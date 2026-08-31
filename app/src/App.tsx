import { useCallback, useMemo, useState } from "react";
import Komoda from "./scene/Komoda";
import Sidebar from "./ui/Sidebar";
import DetailPanel from "./ui/DetailPanel";
import { doc, GROUP_ORDER } from "./data";

export default function App() {
  const [visible, setVisible] = useState(() => new Set(GROUP_ORDER));
  const [selected, setSelected] = useState<string | null>(null);
  const [showEnvelope, setShowEnvelope] = useState(false);
  const [openDrawers, setOpenDrawers] = useState(() => new Set<string>());
  const [explode, setExplode] = useState(0);

  const toggle = useCallback((group: string) => {
    setVisible((prev) => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });
  }, []);

  const toggleDrawer = useCallback((id: string) => {
    setOpenDrawers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const setAllDrawers = useCallback((open: boolean) => {
    setOpenDrawers(open ? new Set(doc.drawers.map((d) => d.id)) : new Set());
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
        openDrawers={openDrawers}
        toggleDrawer={toggleDrawer}
        explode={explode}
      />
      <Sidebar
        visible={visible}
        toggle={toggle}
        showEnvelope={showEnvelope}
        setShowEnvelope={setShowEnvelope}
        openCount={openDrawers.size}
        setAllDrawers={setAllDrawers}
        explode={explode}
        setExplode={setExplode}
      />
      {selectedPart ? (
        <DetailPanel
          part={selectedPart}
          open={selectedPart.drawer ? openDrawers.has(selectedPart.drawer) : false}
          onToggleDrawer={toggleDrawer}
          onClose={() => setSelected(null)}
        />
      ) : (
        <aside className="panel hint">
          <strong>Klik</strong> na diel ukáže jeho rozmery a dôvod, prečo je taký.<br />
          <strong>Dvojklik</strong> na zásuvku ju otvorí.
        </aside>
      )}
    </div>
  );
}
