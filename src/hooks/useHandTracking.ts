import { useEffect, useRef, useState } from "react";
import { summarizeHand } from "../lib/handSummary";
import { getHandLandmarker } from "../lib/mediapipe";
import type { TrackingFrame } from "../types/hand";

type HandTrackingState = {
  frame: TrackingFrame | null;
  loading: boolean;
  error: string | null;
};

export function useHandTracking(video: HTMLVideoElement | null, enabled: boolean) {
  const [state, setState] = useState<HandTrackingState>({
    frame: null,
    loading: false,
    error: null
  });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!video || !enabled) {
      return;
    }

    let cancelled = false;

    setState((current) => ({
      ...current,
      loading: true,
      error: null
    }));

    const run = async () => {
      try {
        const landmarker = await getHandLandmarker();

        const tick = () => {
          if (cancelled || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
            rafRef.current = window.requestAnimationFrame(tick);
            return;
          }

          const now = performance.now();
          const result = landmarker.detectForVideo(video, now);
          const hands = (result.landmarks ?? []).map((landmarks, index) =>
            summarizeHand({
              id: `${index}-${now}`,
              handedness: (result.handednesses[index]?.[0]?.categoryName as "Left" | "Right") ?? "Left",
              score: result.handednesses[index]?.[0]?.score ?? 0,
              landmarks: landmarks.map((point) => ({
                x: point.x,
                y: point.y,
                z: point.z
              }))
            })
          );

          setState({
            frame: {
              hands,
              timestamp: Date.now()
            },
            loading: false,
            error: null
          });

          rafRef.current = window.requestAnimationFrame(tick);
        };

        tick();
      } catch (error) {
        setState({
          frame: null,
          loading: false,
          error: error instanceof Error ? error.message : "Failed to start hand tracking."
        });
      }
    };

    run();

    return () => {
      cancelled = true;
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [enabled, video]);

  return state;
}
