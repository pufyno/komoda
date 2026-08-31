import { VIEW_LABEL, type ViewId } from "../views/Drawing";

export type Mode = "3d" | ViewId | "cutlist";

const TABS: { id: Mode; label: string }[] = [
  { id: "3d", label: "3D" },
  { id: "front", label: VIEW_LABEL.front },
  { id: "side", label: VIEW_LABEL.side },
  { id: "top", label: VIEW_LABEL.top },
  { id: "cutlist", label: "Cutlist" },
];

export default function Tabs({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  return (
    <nav className="tabs">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={t.id === mode ? "active" : ""}
          onClick={() => setMode(t.id)}
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
