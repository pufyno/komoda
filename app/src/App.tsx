import { Suspense, lazy, useCallback, useMemo, useState } from "react";
import Drawing, { SECTION_DEFAULT, isSection, type SectionId } from "./views/Drawing";
import Cutlist from "./views/Cutlist";
import Sidebar from "./ui/Sidebar";
import DetailPanel from "./ui/DetailPanel";
import Tabs, { type Mode } from "./ui/Tabs";
import { doc, spec, GROUP_ORDER, HARDWARE_GROUPS, type Palette } from "./data";

// three.js je ~1 MB — načíta sa až keď treba 3D, nie pri kreslení a cutliste.
const Komoda = lazy(() => import("./scene/Komoda"));

export default function App() {
  const [mode, setMode] = useState<Mode>("3d");
  const [visible, setVisible] = useState(() => new Set(GROUP_ORDER));
  const [selected, setSelected] = useState<string | null>(null);
  const [showEnvelope, setShowEnvelope] = useState(false);
  const [openDrawers, setOpenDrawers] = useState(() => new Set<string>());
  const [explode, setExplode] = useState(0);
  const [palette, setPalette] = useState<Palette>("scheme");
  const [grain, setGrain] = useState(false);
  const [bannerOpen, setBannerOpen] = useState(true);
  const [sectionAt, setSectionAt] = useState(SECTION_DEFAULT);
  const [xray, setXray] = useState(false);

  // Kovanie je zamurované medzi bokom a boxom — bez izolácie alebo röntgenu
  // ho z modelu vidieť nie je.
  const isolateHardware = useCallback(() => {
    setVisible((prev) => {
      const only = HARDWARE_GROUPS.every((g) => prev.has(g)) && prev.size === HARDWARE_GROUPS.length;
      return new Set(only ? GROUP_ORDER : HARDWARE_GROUPS);
    });
  }, []);

  const moveSection = useCallback((id: SectionId, v: number) => {
    setSectionAt((prev) => ({ ...prev, [id]: v }));
  }, []);

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

  const blocking = spec.openQuestions.filter((q) => q.blocking);
  const is3d = mode === "3d";
  const isCutlist = mode === "cutlist";

  return (
    <div className={`app mode-${mode}`}>
      {is3d && (
        <Suspense fallback={<div className="loading">Načítavam 3D…</div>}>
          <Komoda
            visible={visible}
            selected={selected}
            onSelect={setSelected}
            showEnvelope={showEnvelope}
            openDrawers={openDrawers}
            toggleDrawer={toggleDrawer}
            explode={explode}
            palette={palette}
            grain={grain}
            xray={xray}
          />
        </Suspense>
      )}
      {!is3d && !isCutlist && (
        <Drawing
          view={mode}
          visible={visible}
          selected={selected}
          onSelect={setSelected}
          palette={palette}
          grain={grain}
          sectionAt={sectionAt}
        />
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
          palette={palette}
          setPalette={setPalette}
          grain={grain}
          setGrain={setGrain}
          is3d={is3d}
          xray={xray}
          setXray={setXray}
          isolateHardware={isolateHardware}
          section={!is3d && !isCutlist && isSection(mode) ? mode : null}
          sectionAt={sectionAt}
          moveSection={moveSection}
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
          {!is3d && isSection(mode) && (<><br />Šrafované diely sú prerezané rovinou, tenké sú za ňou.</>)}
          <br />Rozmery sa vypíšu priamo k dielu.
        </aside>
      ))}

      {bannerOpen && blocking.length > 0 && (
        <div className="banner">
          <span className="dot" />
          <div>
            <strong>Blokuje výrobu:</strong> {blocking[0].q}
            {blocking[0].impact && <em> {blocking[0].impact}</em>}
          </div>
          <button onClick={() => setBannerOpen(false)} aria-label="Skryť">×</button>
        </div>
      )}
    </div>
  );
}
