import type { FingerName, FingerState, HandLandmarkFrame, HandSummary, Point3 } from "../types/hand";
import { averagePoint, distance2D } from "./geometry";

const FINGER_MAP: Record<FingerName, { tip: number; pip: number; mcp: number }> = {
  thumb: { tip: 4, pip: 3, mcp: 2 },
  index: { tip: 8, pip: 6, mcp: 5 },
  middle: { tip: 12, pip: 10, mcp: 9 },
  ring: { tip: 16, pip: 14, mcp: 13 },
  pinky: { tip: 20, pip: 18, mcp: 17 }
};

function isFingerExtended(landmarks: Point3[], finger: FingerName, handedness: "Left" | "Right"): boolean {
  const joint = FINGER_MAP[finger];
  const tip = landmarks[joint.tip];
  const pip = landmarks[joint.pip];
  const mcp = landmarks[joint.mcp];

  if (finger === "thumb") {
    const direction = handedness === "Left" ? 1 : -1;
    return (tip.x - pip.x) * direction > 0.015 && Math.abs(tip.y - mcp.y) < 0.18;
  }

  return tip.y < pip.y && pip.y < mcp.y;
}

export function summarizeHand(frame: HandLandmarkFrame): HandSummary {
  const fingers = Object.keys(FINGER_MAP).reduce((acc, finger) => {
    const key = finger as FingerName;
    acc[key] = isFingerExtended(frame.landmarks, key, frame.handedness);
    return acc;
  }, {} as FingerState);

  const palmCenter = averagePoint([
    frame.landmarks[0],
    frame.landmarks[5],
    frame.landmarks[9],
    frame.landmarks[13],
    frame.landmarks[17]
  ]);

  return {
    raw: frame,
    fingers,
    palmCenter,
    palmWidth: distance2D(frame.landmarks[5], frame.landmarks[17]),
    palmHeight: distance2D(frame.landmarks[0], frame.landmarks[9])
  };
}
