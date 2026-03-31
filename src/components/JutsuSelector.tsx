import type { JutsuDefinition } from "../types/jutsu";

type Props = {
  jutsuList: JutsuDefinition[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export function JutsuSelector({ jutsuList, selectedId, onSelect }: Props) {
  return (
    <section className="panel jutsu-selector">
      <p className="eyebrow">Jutsu Library</p>
      <h2>Choose Your Technique</h2>
      <div className="jutsu-grid">
        {jutsuList.map((jutsu) => (
          <button
            key={jutsu.id}
            className={`jutsu-card ${selectedId === jutsu.id ? "selected" : ""}`}
            onClick={() => onSelect(jutsu.id)}
            disabled={jutsu.status !== "playable"}
          >
            <span className="jutsu-card__title">{jutsu.name}</span>
            <span className="jutsu-card__status">{jutsu.status === "playable" ? "Playable" : "Coming Soon"}</span>
            <span className="jutsu-card__body">{jutsu.handSignSummary}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
