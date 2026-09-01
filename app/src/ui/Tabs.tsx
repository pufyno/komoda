import { VIEW_LABEL, type ViewId } from "../views/Drawing";

export type Mode = "3d" | ViewId | "cutlist";

const TABS: { id: Mode; label: string }[] = [
  { id: "3d", label: "3D" },
  { id: "front", label: VIEW_LABEL.front },
  { id: "side", label: VIEW_LABEL.side },
  { id: "top", label: VIEW_LABEL.top },
  { id: "sectionV", label: VIEW_LABEL.sectionV },
  { id: "sectionH", label: VIEW_LABEL.sectionH },
  { id: "cutlist", label: "Cutlist" },
];

export default function Tabs({ mode, setMode, panelOpen, togglePanel }: {
  mode: Mode;
  setMode: (m: Mode) => void;
  panelOpen: boolean;
  togglePanel: () => void;
}) {
  return (
    <nav className="tabs">
      {/* na mobile je bočný panel spodná plachta, otvára sa odtiaľto */}
      <button
        className={panelOpen ? "menu on" : "menu"}
        onClick={togglePanel}
        aria-label="Nastavenia a vrstvy"
        aria-expanded={panelOpen}
      >
        ☰
      </button>
      {TABS.map((t) => (
        <button
          key={t.id}
          className={t.id === mode ? "active" : ""}
          onClick={() => setMode(t.id)}
          title={t.label}
        >
          {t.label}
        </button>
      ))}
      <button className="print" onClick={() => window.print()} title="Vytlačiť aktuálny pohľad">
        Tlač
      </button>
    </nav>
  );
}
