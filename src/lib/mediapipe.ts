import { FilesetResolver, HandLandmarker, ImageSegmenter } from "@mediapipe/tasks-vision";

let handLandmarkerPromise: Promise<HandLandmarker> | null = null;
let imageSegmenterPromise: Promise<ImageSegmenter> | null = null;

export async function getHandLandmarker(): Promise<HandLandmarker> {
  if (!handLandmarkerPromise) {
    handLandmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );

      return HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
        },
        numHands: 2,
        runningMode: "VIDEO",
        minHandDetectionConfidence: 0.55,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
    })();
  }

  return handLandmarkerPromise;
}

export async function getSelfieSegmenter(): Promise<ImageSegmenter> {
  if (!imageSegmenterPromise) {
    imageSegmenterPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );

      return ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite"
        },
        runningMode: "VIDEO",
        outputCategoryMask: true,
        outputConfidenceMasks: false
      });
    })();
  }

  return imageSegmenterPromise;
}
