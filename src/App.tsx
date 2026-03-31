import { useEffect, useMemo, useRef, useState } from "react";
import { HandOverlay } from "./components/HandOverlay";
import { JutsuSelector } from "./components/JutsuSelector";
import { LandingScreen } from "./components/LandingScreen";
import { SettingsPanel } from "./components/SettingsPanel";
import { StatusPanel } from "./components/StatusPanel";
import { useCamera } from "./hooks/useCamera";
import { useCloneFx } from "./hooks/useCloneFx";
import { useHandTracking } from "./hooks/useHandTracking";
import { getJutsuById, jutsuRegistry } from "./lib/jutsuRegistry";
import { RecognitionEngine } from "./lib/recognitionEngine";

const recognitionEngine = new RecognitionEngine();

export default function App() {
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState<"practice" | "play">("practice");
  const [selectedId, setSelectedId] = useState("shadow-clone");
  const [debug, setDebug] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);
  const [lastTriggeredAt, setLastTriggeredAt] = useState<number | null>(null);
  const [thresholds, setThresholds] = useState<Record<string, number>>({
    minConfidence: 0.76,
    holdMs: 650,
    maxPalmDistance: 0.28,
    maxFingerCrossDistance: 0.06,
    maxVerticalOffset: 0.08,
    minPoseScore: 0.78
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const effectCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const camera = useCamera();
  const tracking = useHandTracking(videoRef.current, camera.state === "ready");
  const fx = useCloneFx(effectCanvasRef.current, videoRef.current);

  const selectedJutsu = useMemo(() => getJutsuById(selectedId), [selectedId]);
  const recognition = useMemo(
    () => recognitionEngine.evaluate(selectedJutsu, tracking.frame, thresholds, Date.now()),
    [selectedJutsu, thresholds, tracking.frame]
  );

  useEffect(() => {
    if (recognition.stable && selectedJutsu.id === "shadow-clone") {
      fx.trigger();
      recognitionEngine.triggerCooldown(4200);
      setLastTriggeredAt(Date.now());
    }
  }, [fx, recognition.stable, selectedJutsu.id]);

  const requestCamera = async () => {
    await fx.primeAudio();
    await camera.requestCamera(videoRef.current);
  };

  if (!started) {
    return <LandingScreen onStart={() => setStarted(true)} />;
  }

  return (
    <main className="app-shell">
      <section className="hero-header">
        <div>
          <p className="eyebrow">Local Training Arena</p>
          <h1>Naruto Hand Sign Trainer</h1>
          <p className="muted">
            Practice camera-powered hand seals with live landmark feedback and anime-style FX.
          </p>
        </div>
        <div className="mode-toggle">
          <button className={mode === "practice" ? "active" : ""} onClick={() => setMode("practice")}>
            Practice
          </button>
          <button className={mode === "play" ? "active" : ""} onClick={() => setMode("play")}>
            Play
          </button>
        </div>
      </section>

      <section className="stage-layout">
        <div className="stage-column">
          <div className="stage-panel">
            <div className="stage-toolbar">
              <button className="primary-button" onClick={requestCamera}>
                {camera.state === "ready" ? "Refresh Camera" : "Enable Camera"}
              </button>
              <button className="secondary-button" onClick={() => fx.clear()}>
                Reset Effect
              </button>
              {lastTriggeredAt ? (
                <span className="toolbar-note">
                  Last summon: {new Date(lastTriggeredAt).toLocaleTimeString()}
                </span>
              ) : null}
            </div>

            <div className="camera-stage">
              <video ref={videoRef} className="camera-feed" playsInline muted />
              <canvas ref={effectCanvasRef} className="fx-layer" />
              <HandOverlay
                frame={tracking.frame}
                width={1280}
                height={720}
                mode={mode}
                showOverlay={showOverlay && mode === "practice"}
              />
              {camera.state !== "ready" ? (
                <div className="camera-overlay-card">
                  <h2>Camera Permission Needed</h2>
                  <p>
                    Allow webcam access to start hand tracking and trigger the Shadow Clone effect.
                  </p>
                  <p className="muted">{camera.error ?? "Your camera feed never leaves the browser."}</p>
                </div>
              ) : null}
            </div>
          </div>

          <StatusPanel jutsu={selectedJutsu} result={recognition} mode={mode} debug={debug && mode === "practice"} />
        </div>

        <aside className="sidebar">
          <JutsuSelector jutsuList={jutsuRegistry} selectedId={selectedId} onSelect={setSelectedId} />

          <section className="panel tips-panel">
            <p className="eyebrow">Training Tips</p>
            <h2>How to Form It</h2>
            <ul className="hint-list">
              {selectedJutsu.trainingTips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </section>

          <SettingsPanel
            thresholds={thresholds}
            onThresholdChange={(key, value) => setThresholds((current) => ({ ...current, [key]: value }))}
            debug={debug}
            setDebug={setDebug}
            showOverlay={showOverlay}
            setShowOverlay={setShowOverlay}
          />

          <section className="panel debug-panel">
            <p className="eyebrow">Debug</p>
            <h2>Tracking Health</h2>
            <div className="debug-breakdown">
              <div className="metric">
                <span>Camera state</span>
                <strong>{camera.state}</strong>
              </div>
              <div className="metric">
                <span>Tracker status</span>
                <strong>{tracking.loading ? "loading" : tracking.error ? "error" : "running"}</strong>
              </div>
              <div className="metric">
                <span>Hands in frame</span>
                <strong>{tracking.frame?.hands.length ?? 0}</strong>
              </div>
              <div className="metric">
                <span>Effect active</span>
                <strong>{fx.active ? "yes" : "no"}</strong>
              </div>
            </div>
            {tracking.error ? <p className="error-text">{tracking.error}</p> : null}
          </section>
        </aside>
      </section>
    </main>
  );
}
