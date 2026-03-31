import type { TrackingFrame } from "../types/hand";

const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17]
];

type Props = {
  frame: TrackingFrame | null;
  width: number;
  height: number;
  mode: "practice" | "play";
  showOverlay: boolean;
};

export function HandOverlay({ frame, width, height, mode, showOverlay }: Props) {
  if (!showOverlay || !frame) {
    return null;
  }

  return (
    <svg className="hand-overlay" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {frame.hands.map((hand) => (
        <g key={hand.raw.id}>
          {CONNECTIONS.map(([a, b]) => (
            <line
              key={`${hand.raw.id}-${a}-${b}`}
              x1={hand.raw.landmarks[a].x * width}
              y1={hand.raw.landmarks[a].y * height}
              x2={hand.raw.landmarks[b].x * width}
              y2={hand.raw.landmarks[b].y * height}
              stroke={mode === "practice" ? "rgba(126, 236, 255, 0.95)" : "rgba(255,255,255,0.65)"}
              strokeWidth="3"
              strokeLinecap="round"
            />
          ))}
          {hand.raw.landmarks.map((point, index) => (
            <circle
              key={`${hand.raw.id}-point-${index}`}
              cx={point.x * width}
              cy={point.y * height}
              r={index % 4 === 0 ? 5.5 : 4}
              fill={mode === "practice" ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.75)"}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}
