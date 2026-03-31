import type { HandSummary, TrackingFrame } from "../types/hand";
import type {
  GuidanceHint,
  RecognitionBreakdownItem,
  RecognitionContext,
  RecognitionResult
} from "../types/jutsu";
import { clamp, distance2D, normalizeScore, segmentDistance } from "./geometry";

type ShadowCloneThresholdKey =
  | "minConfidence"
  | "holdMs"
  | "maxPalmDistance"
  | "maxFingerCrossDistance"
  | "maxVerticalOffset"
  | "minPoseScore";

export const defaultShadowCloneThresholds: Record<ShadowCloneThresholdKey, number> = {
  minConfidence: 0.76,
  holdMs: 650,
  maxPalmDistance: 0.28,
  maxFingerCrossDistance: 0.06,
  maxVerticalOffset: 0.08,
  minPoseScore: 0.78
};

export type ShadowCloneMetrics = {
  bothHandsVisible: boolean;
  allCoreFingersReady: boolean;
  palmDistance: number;
  fingerCrossDistance: number;
  verticalOffset: number;
  poseScore: number;
  hints: GuidanceHint[];
  breakdown: RecognitionBreakdownItem[];
};

function getHands(frame: TrackingFrame | null): { left?: HandSummary; right?: HandSummary } {
  const hands = frame?.hands ?? [];
  return {
    left: hands.find((hand) => hand.raw.handedness === "Left"),
    right: hands.find((hand) => hand.raw.handedness === "Right")
  };
}

function evaluatePose(left: HandSummary, right: HandSummary, thresholds: Record<string, number>): ShadowCloneMetrics {
  const leftIndex = left.raw.landmarks[8];
  const leftMiddle = left.raw.landmarks[12];
  const rightIndex = right.raw.landmarks[8];
  const rightMiddle = right.raw.landmarks[12];
  const leftMcp = left.raw.landmarks[5];
  const rightMcp = right.raw.landmarks[5];
  const palmDistance = distance2D(left.palmCenter, right.palmCenter);
  const verticalOffset = Math.abs(left.palmCenter.y - right.palmCenter.y);
  const fingerCrossDistance = Math.min(
    segmentDistance(leftMcp, leftIndex, rightMcp, rightMiddle),
    segmentDistance(leftMcp, leftMiddle, rightMcp, rightIndex)
  );

  const coreFingersReady =
    left.fingers.index &&
    left.fingers.middle &&
    right.fingers.index &&
    right.fingers.middle &&
    !left.fingers.ring &&
    !left.fingers.pinky &&
    !right.fingers.ring &&
    !right.fingers.pinky;

  const palmScore = normalizeScore(
    palmDistance,
    0.06,
    thresholds.maxPalmDistance,
    0.03,
    0.42
  );
  const crossScore = normalizeScore(
    fingerCrossDistance,
    0,
    thresholds.maxFingerCrossDistance,
    0,
    0.16
  );
  const offsetScore = normalizeScore(
    verticalOffset,
    0,
    thresholds.maxVerticalOffset,
    0,
    0.2
  );
  const fingerScore = coreFingersReady ? 1 : 0.3;
  const poseScore = clamp((palmScore * 0.24) + (crossScore * 0.42) + (offsetScore * 0.18) + (fingerScore * 0.16), 0, 1);

  const hints: GuidanceHint[] = [];

  if (!coreFingersReady) {
    hints.push({ id: "fingers", label: "Extend index and middle fingers on both hands, curl ring and pinky fingers.", tone: "warning" });
  }
  if (palmDistance > thresholds.maxPalmDistance) {
    hints.push({ id: "palm-distance", label: "Bring both hands closer together in front of your chest.", tone: "warning" });
  }
  if (verticalOffset > thresholds.maxVerticalOffset) {
    hints.push({ id: "vertical-align", label: "Level both hands so the palms sit at nearly the same height.", tone: "info" });
  }
  if (fingerCrossDistance > thresholds.maxFingerCrossDistance) {
    hints.push({ id: "cross-fingers", label: "Cross the raised fingers more tightly into an X shape.", tone: "warning" });
  }

  return {
    bothHandsVisible: true,
    allCoreFingersReady: coreFingersReady,
    palmDistance,
    fingerCrossDistance,
    verticalOffset,
    poseScore,
    hints,
    breakdown: [
      {
        id: "palm-distance",
        label: "Palm spacing",
        value: palmDistance,
        target: thresholds.maxPalmDistance,
        passed: palmDistance <= thresholds.maxPalmDistance
      },
      {
        id: "finger-cross",
        label: "Finger cross tightness",
        value: fingerCrossDistance,
        target: thresholds.maxFingerCrossDistance,
        passed: fingerCrossDistance <= thresholds.maxFingerCrossDistance
      },
      {
        id: "vertical-offset",
        label: "Vertical alignment",
        value: verticalOffset,
        target: thresholds.maxVerticalOffset,
        passed: verticalOffset <= thresholds.maxVerticalOffset
      },
      {
        id: "finger-shape",
        label: "Core finger shape",
        value: coreFingersReady ? 1 : 0,
        target: 1,
        passed: coreFingersReady
      }
    ]
  };
}

export function evaluateShadowCloneFrame(
  frame: TrackingFrame | null,
  context: RecognitionContext
): RecognitionResult {
  const thresholds = { ...defaultShadowCloneThresholds, ...context.thresholds };
  const { left, right } = getHands(frame);

  if (!left || !right) {
    return {
      jutsuId: "shadow-clone",
      confidence: 0,
      passed: false,
      stable: false,
      reason: "Show both hands to form the Clone seal.",
      hints: [{ id: "two-hands", label: "Move both hands into frame.", tone: "warning" }],
      breakdown: []
    };
  }

  const metrics = evaluatePose(left, right, thresholds);
  const passed = metrics.poseScore >= thresholds.minPoseScore;

  return {
    jutsuId: "shadow-clone",
    confidence: Number(metrics.poseScore.toFixed(3)),
    passed,
    stable: false,
    reason: passed ? "Clone seal detected." : "Adjust your hands to match the Clone seal.",
    hints: metrics.hints,
    breakdown: metrics.breakdown
  };
}
