type Props = {
  thresholds: Record<string, number>;
  onThresholdChange: (key: string, value: number) => void;
  debug: boolean;
  setDebug: (value: boolean) => void;
  showOverlay: boolean;
  setShowOverlay: (value: boolean) => void;
};

const CONTROLS = [
  { key: "minPoseScore", label: "Success threshold", min: 0.55, max: 0.95, step: 0.01 },
  { key: "holdMs", label: "Hold duration (ms)", min: 200, max: 1500, step: 10 },
  { key: "maxPalmDistance", label: "Max palm distance", min: 0.12, max: 0.4, step: 0.01 },
  { key: "maxFingerCrossDistance", label: "Max finger cross distance", min: 0.02, max: 0.12, step: 0.005 }
];

export function SettingsPanel({
  thresholds,
  onThresholdChange,
  debug,
  setDebug,
  showOverlay,
  setShowOverlay
}: Props) {
  return (
    <section className="panel settings-panel">
      <p className="eyebrow">Settings</p>
      <h2>Threshold Tuning</h2>
      <div className="toggle-row">
        <label>
          <input type="checkbox" checked={debug} onChange={(event) => setDebug(event.target.checked)} />
          Debug mode
        </label>
        <label>
          <input type="checkbox" checked={showOverlay} onChange={(event) => setShowOverlay(event.target.checked)} />
          Landmark overlay
        </label>
      </div>
      <div className="slider-grid">
        {CONTROLS.map((control) => (
          <label key={control.key}>
            <span>{control.label}</span>
            <strong>{thresholds[control.key]}</strong>
            <input
              type="range"
              min={control.min}
              max={control.max}
              step={control.step}
              value={thresholds[control.key]}
              onChange={(event) => onThresholdChange(control.key, Number(event.target.value))}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
