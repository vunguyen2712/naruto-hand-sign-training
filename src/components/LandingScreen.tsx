type Props = {
  onStart: () => void;
};

export function LandingScreen({ onStart }: Props) {
  return (
    <div className="landing-shell">
      <div className="landing-copy">
        <p className="eyebrow">Naruto Hand Sign Trainer</p>
        <h1>Turn your webcam into a real-time jutsu practice arena.</h1>
        <p>
          Learn the Shadow Clone hand sign with live hand tracking, explainable recognition,
          training hints, and a playful clone-summoning effect built from your own camera feed.
        </p>
        <button className="primary-button" onClick={onStart}>
          Start Training
        </button>
      </div>
      <div className="landing-card">
        <h2>What’s inside</h2>
        <ul>
          <li>Camera-powered hand landmark tracking with MediaPipe Hands.</li>
          <li>Practice and play modes for learning or showing off.</li>
          <li>Shadow Clone recognition with debug metrics and hold smoothing.</li>
          <li>Composable jutsu definitions ready for future techniques.</li>
        </ul>
      </div>
    </div>
  );
}
