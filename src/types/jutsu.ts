import type { TrackingFrame } from "./hand";

export type GuidanceHint = {
  id: string;
  label: string;
  tone?: "warning" | "info" | "success";
};

export type RecognitionBreakdownItem = {
  id: string;
  label: string;
  value: number;
  target: number;
  passed: boolean;
};

export type RecognitionResult = {
  jutsuId: string;
  confidence: number;
  passed: boolean;
  stable: boolean;
  reason: string;
  hints: GuidanceHint[];
  breakdown: RecognitionBreakdownItem[];
};

export type RecognitionContext = {
  thresholds: Record<string, number>;
  now: number;
};

export type JutsuDefinition = {
  id: string;
  name: string;
  status: "playable" | "coming-soon";
  description: string;
  trainingTips: string[];
  handSignSummary: string;
  thresholds: Record<string, number>;
  evaluate: (frame: TrackingFrame | null, context: RecognitionContext) => RecognitionResult;
};
