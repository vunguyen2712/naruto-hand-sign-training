import type { JutsuDefinition } from "../types/jutsu";
import { defaultShadowCloneThresholds, evaluateShadowCloneFrame } from "./shadowCloneRecognizer";

export const jutsuRegistry: JutsuDefinition[] = [
  {
    id: "shadow-clone",
    name: "Shadow Clone Jutsu",
    status: "playable",
    description: "Perform the Clone seal, hold it steady, and spawn a squad of clones from your own webcam feed.",
    trainingTips: [
      "Raise both hands in front of your chest.",
      "Extend the index and middle fingers on both hands.",
      "Cross those raised fingers into a tight X and keep the palms nearly level."
    ],
    handSignSummary: "Clone seal with both hands: index and middle fingers extended and crossed together.",
    thresholds: defaultShadowCloneThresholds,
    evaluate: evaluateShadowCloneFrame
  },
  {
    id: "fireball",
    name: "Fireball Jutsu",
    status: "coming-soon",
    description: "Placeholder for a future chain of seals and a flame effect.",
    trainingTips: ["Coming soon."],
    handSignSummary: "Planned multi-seal sequence.",
    thresholds: {},
    evaluate: () => ({
      jutsuId: "fireball",
      confidence: 0,
      passed: false,
      stable: false,
      reason: "Not implemented yet.",
      hints: [],
      breakdown: []
    })
  },
  {
    id: "chidori",
    name: "Chidori",
    status: "coming-soon",
    description: "Placeholder for a future effect with charge-up lightning.",
    trainingTips: ["Coming soon."],
    handSignSummary: "Planned high-intensity hand sign and effect.",
    thresholds: {},
    evaluate: () => ({
      jutsuId: "chidori",
      confidence: 0,
      passed: false,
      stable: false,
      reason: "Not implemented yet.",
      hints: [],
      breakdown: []
    })
  }
];

export function getJutsuById(id: string): JutsuDefinition {
  return jutsuRegistry.find((jutsu) => jutsu.id === id) ?? jutsuRegistry[0];
}
