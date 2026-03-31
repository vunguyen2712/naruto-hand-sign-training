import { useCallback, useMemo, useState } from "react";

export type CameraState = "idle" | "requesting" | "ready" | "denied" | "error";

export function useCamera() {
  const [state, setState] = useState<CameraState>("idle");
  const [error, setError] = useState<string | null>(null);

  const requestCamera = useCallback(async (video: HTMLVideoElement | null) => {
    if (!video) {
      return;
    }

    setState("requesting");
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        }
      });

      video.srcObject = stream;
      await video.play();
      setState("ready");
    } catch (cameraError) {
      const message = cameraError instanceof Error ? cameraError.message : "Could not access the camera.";
      setError(message);
      setState(message.toLowerCase().includes("denied") ? "denied" : "error");
    }
  }, []);

  const stopCamera = useCallback((video: HTMLVideoElement | null) => {
    const stream = video?.srcObject;

    if (stream instanceof MediaStream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    if (video) {
      video.srcObject = null;
    }

    setState("idle");
  }, []);

  return useMemo(
    () => ({
      state,
      error,
      requestCamera,
      stopCamera
    }),
    [error, requestCamera, state, stopCamera]
  );
}
