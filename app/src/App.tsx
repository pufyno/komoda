import { useCallback, useMemo, useState } from "react";
import Komoda from "./scene/Komoda";
import Drawing from "./views/Drawing";
import Cutlist from "./views/Cutlist";
import Sidebar from "./ui/Sidebar";
import DetailPanel from "./ui/DetailPanel";
import Tabs, { type Mode } from "./ui/Tabs";
import { doc, GROUP_ORDER } from "./data";

export default function App() {
  const [mode, setMode] = useState<Mode>("3d");
  const [visible, setVisible] = useState(() => new Set(GROUP_ORDER));
  const [selected, setSelected] = useState<string | null>(null);
  const [showEnvelope, setShowEnvelope] = useState(false);
  const [openDrawers, setOpenDrawers] = useState(() => new Set<string>());
  const [explode, setExplode] = useState(0);

  const toggle = useCallback((group: string) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }, []);

  const toggleDrawer = useCallback((id: string) => {
    setOpenDrawers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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

  const is3d = mode === "3d";
  const isCutlist = mode === "cutlist";

  return (
    <div className={`app mode-${mode}`}>
      {is3d && (
        <Komoda
          visible={visible}
          selected={selected}
          onSelect={setSelected}
          showEnvelope={showEnvelope}
          openDrawers={openDrawers}
          toggleDrawer={toggleDrawer}
          explode={explode}
        />
      )}
      {!is3d && !isCutlist && (
        <Drawing view={mode} visible={visible} selected={selected} onSelect={setSelected} />
      )}
      {isCutlist && <Cutlist />}

      <Tabs mode={mode} setMode={setMode} />

      {!isCutlist && (
        <Sidebar
          visible={visible}
          toggle={toggle}
          showEnvelope={showEnvelope}
          setShowEnvelope={setShowEnvelope}
          openCount={openDrawers.size}
          setAllDrawers={setAllDrawers}
          explode={explode}
          setExplode={setExplode}
          is3d={is3d}
        />
      )}

      {!isCutlist && (selectedPart ? (
        <DetailPanel
          part={selectedPart}
          open={selectedPart.drawer ? openDrawers.has(selectedPart.drawer) : false}
          onToggleDrawer={toggleDrawer}
          onClose={() => setSelected(null)}
        />
      ) : (
        <aside className="panel hint">
          <strong>Klik</strong> na diel ukáže jeho rozmery a dôvod, prečo je taký.
          {is3d && (<><br /><strong>Dvojklik</strong> na zásuvku ju otvorí.</>)}
        </aside>
      ))}
    </div>
  );
}
