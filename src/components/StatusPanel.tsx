import type { JutsuDefinition, RecognitionResult } from "../types/jutsu";

type Props = {
  jutsu: JutsuDefinition;
  result: RecognitionResult | null;
  mode: "practice" | "play";
  debug: boolean;
};

export function StatusPanel({ jutsu, result, mode, debug }: Props) {
  const confidence = Math.round((result?.confidence ?? 0) * 100);

  return (
    <section className="panel status-panel">
      <p className="eyebrow">{mode === "practice" ? "Practice Mode" : "Play Mode"}</p>
      <h2>{jutsu.name}</h2>
      <p className="muted">{jutsu.description}</p>
      <div className="status-chip-row">
        <span className={`status-chip ${result?.stable ? "success" : result?.passed ? "active" : ""}`}>
          {result?.stable ? "Jutsu Ready" : result?.passed ? "Hold Steady" : "Searching"}
        </span>
        <span className="status-chip">{confidence}% confidence</span>
      </div>
      <p className="status-reason">{result?.reason ?? "Camera and hand tracking warming up."}</p>
      {mode === "practice" && result?.hints.length ? (
        <ul className="hint-list">
          {result.hints.slice(0, 3).map((hint) => (
            <li key={hint.id}>{hint.label}</li>
          ))}
        </ul>
      ) : null}
      {debug && result?.breakdown.length ? (
        <div className="debug-breakdown">
          {result.breakdown.map((item) => (
            <div key={item.id} className={`metric ${item.passed ? "pass" : ""}`}>
              <span>{item.label}</span>
              <strong>{typeof item.value === "number" ? item.value.toFixed(3) : item.value}</strong>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
