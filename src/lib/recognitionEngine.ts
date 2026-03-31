import type { TrackingFrame } from "../types/hand";
import type { JutsuDefinition, RecognitionResult } from "../types/jutsu";

export class RecognitionEngine {
  private holdStart: number | null = null;

  private cooldownUntil = 0;

  public evaluate(
    jutsu: JutsuDefinition,
    frame: TrackingFrame | null,
    thresholds: Record<string, number>,
    now: number
  ): RecognitionResult {
    const base = jutsu.evaluate(frame, { thresholds, now });
    const holdMs = thresholds.holdMs ?? jutsu.thresholds.holdMs ?? 650;

    if (now < this.cooldownUntil) {
      return {
        ...base,
        passed: false,
        stable: false,
        reason: "Cooling down before the next summon."
      };
    }

    if (!base.passed) {
      this.holdStart = null;
      return {
        ...base,
        stable: false
      };
    }

    if (this.holdStart === null) {
      this.holdStart = now;
    }

    const stable = now - this.holdStart >= holdMs;
    return {
      ...base,
      stable,
      reason: stable ? "Shadow Clone Jutsu ready." : `Hold steady for ${Math.max(0, holdMs - (now - this.holdStart))} ms.`
    };
  }

  public triggerCooldown(durationMs: number): void {
    this.cooldownUntil = Date.now() + durationMs;
    this.holdStart = null;
  }
}
