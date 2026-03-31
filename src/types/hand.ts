export type Point3 = {
  x: number;
  y: number;
  z: number;
};

export type Handedness = "Left" | "Right";

export type FingerName = "thumb" | "index" | "middle" | "ring" | "pinky";

export type FingerState = Record<FingerName, boolean>;

export type HandLandmarkFrame = {
  id: string;
  handedness: Handedness;
  score: number;
  landmarks: Point3[];
};

export type HandSummary = {
  raw: HandLandmarkFrame;
  fingers: FingerState;
  palmCenter: Point3;
  palmWidth: number;
  palmHeight: number;
};

export type TrackingFrame = {
  hands: HandSummary[];
  timestamp: number;
};
