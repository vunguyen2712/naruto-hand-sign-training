import { useCallback, useEffect, useRef, useState } from "react";
import type { ImageSegmenter } from "@mediapipe/tasks-vision";
import { getSelfieSegmenter } from "../lib/mediapipe";

type CloneInstance = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  bornAt: number;
  wobbleSeed: number;
};

type SmokeParticle = {
  id: number;
  x: number;
  y: number;
  radius: number;
  driftX: number;
  driftY: number;
  bornAt: number;
  ttl: number;
};

const CLONE_LAYOUT = [
  { x: 0.18, y: 0.8, scale: 0.28 },
  { x: 0.82, y: 0.8, scale: 0.28 },
  { x: 0.08, y: 0.72, scale: 0.26 },
  { x: 0.92, y: 0.72, scale: 0.26 },
  { x: 0.26, y: 0.64, scale: 0.24 },
  { x: 0.74, y: 0.64, scale: 0.24 },
  { x: 0.16, y: 0.56, scale: 0.22 },
  { x: 0.84, y: 0.56, scale: 0.22 },
  { x: 0.34, y: 0.7, scale: 0.2 },
  { x: 0.66, y: 0.7, scale: 0.2 }
];

const SOURCE_FRAME = {
  x: 0.24,
  y: 0.06,
  width: 0.52,
  height: 0.9
};

const SEGMENTATION_INTERVAL_MS = 85;

function getForegroundLabelIndex(labels: string[]): number {
  const personIndex = labels.findIndex((label) => /person|human|selfie|foreground|body/i.test(label));
  if (personIndex >= 0) {
    return personIndex;
  }

  const backgroundIndex = labels.findIndex((label) => /background/i.test(label));
  if (backgroundIndex === 0 && labels.length > 1) {
    return 1;
  }

  return 0;
}

function createSmokeBurst(x: number, y: number, now: number): SmokeParticle[] {
  return Array.from({ length: 9 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 9;
    const spread = 0.012 + (index % 3) * 0.004;

    return {
      id: now + index,
      x,
      y,
      radius: 12 + (index % 4) * 4,
      driftX: Math.cos(angle) * spread,
      driftY: Math.sin(angle) * spread - 0.012,
      bornAt: now,
      ttl: 520 + (index % 3) * 60
    };
  });
}

function playClonePop(audioContext: AudioContext) {
  const now = audioContext.currentTime;
  const master = audioContext.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
  master.connect(audioContext.destination);

  const tone = audioContext.createOscillator();
  tone.type = "triangle";
  tone.frequency.setValueAtTime(520, now);
  tone.frequency.exponentialRampToValueAtTime(180, now + 0.18);
  tone.connect(master);
  tone.start(now);
  tone.stop(now + 0.2);

  const shimmer = audioContext.createOscillator();
  shimmer.type = "sine";
  shimmer.frequency.setValueAtTime(860, now);
  shimmer.frequency.exponentialRampToValueAtTime(420, now + 0.12);
  shimmer.connect(master);
  shimmer.start(now + 0.015);
  shimmer.stop(now + 0.16);

  const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.2, audioContext.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < channel.length; index += 1) {
    channel[index] = (Math.random() * 2 - 1) * (1 - (index / channel.length));
  }

  const noise = audioContext.createBufferSource();
  noise.buffer = buffer;
  const noiseFilter = audioContext.createBiquadFilter();
  noiseFilter.type = "highpass";
  noiseFilter.frequency.setValueAtTime(650, now);
  const noiseGain = audioContext.createGain();
  noiseGain.gain.setValueAtTime(0.0001, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.09, now + 0.01);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(audioContext.destination);
  noise.start(now);
  noise.stop(now + 0.15);
}

export function useCloneFx(
  canvas: HTMLCanvasElement | null,
  video: HTMLVideoElement | null
) {
  const clonesRef = useRef<CloneInstance[]>([]);
  const smokeRef = useRef<SmokeParticle[]>([]);
  const rafRef = useRef<number | null>(null);
  const spawnTimerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const segmenterRef = useRef<ImageSegmenter | null>(null);
  const segmenterLoadAttemptedRef = useRef(false);
  const segmentedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const segmentedCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const lastSegmentationAtRef = useRef(0);
  const [active, setActive] = useState(false);

  const ensureSegmentationCanvases = useCallback((videoWidth: number, videoHeight: number) => {
    const sourceWidth = Math.max(1, Math.round(videoWidth * SOURCE_FRAME.width));
    const sourceHeight = Math.max(1, Math.round(videoHeight * SOURCE_FRAME.height));

    if (!segmentedCanvasRef.current) {
      segmentedCanvasRef.current = document.createElement("canvas");
      segmentedCtxRef.current = segmentedCanvasRef.current.getContext("2d");
    }

    if (!maskCanvasRef.current) {
      maskCanvasRef.current = document.createElement("canvas");
      maskCtxRef.current = maskCanvasRef.current.getContext("2d");
    }

    if (
      segmentedCanvasRef.current &&
      (segmentedCanvasRef.current.width !== sourceWidth || segmentedCanvasRef.current.height !== sourceHeight)
    ) {
      segmentedCanvasRef.current.width = sourceWidth;
      segmentedCanvasRef.current.height = sourceHeight;
    }
  }, []);

  const ensureSegmenter = useCallback(async () => {
    if (segmenterRef.current || segmenterLoadAttemptedRef.current) {
      return;
    }

    segmenterLoadAttemptedRef.current = true;

    try {
      segmenterRef.current = await getSelfieSegmenter();
    } catch {
      segmenterRef.current = null;
    }
  }, []);

  const updateLiveCutout = useCallback((videoElement: HTMLVideoElement) => {
    const segmenter = segmenterRef.current;
    const segmentedCanvas = segmentedCanvasRef.current;
    const segmentedCtx = segmentedCtxRef.current;

    if (!segmenter || !segmentedCanvas || !segmentedCtx) {
      return;
    }

    const now = performance.now();
    if (now - lastSegmentationAtRef.current < SEGMENTATION_INTERVAL_MS) {
      return;
    }
    lastSegmentationAtRef.current = now;

    const fullWidth = videoElement.videoWidth || 1280;
    const fullHeight = videoElement.videoHeight || 720;
    const sourceX = Math.round(fullWidth * SOURCE_FRAME.x);
    const sourceY = Math.round(fullHeight * SOURCE_FRAME.y);
    const sourceWidth = Math.round(fullWidth * SOURCE_FRAME.width);
    const sourceHeight = Math.round(fullHeight * SOURCE_FRAME.height);

    const result = segmenter.segmentForVideo(videoElement, now);
    const categoryMask = result.categoryMask;

    if (!categoryMask || !maskCanvasRef.current || !maskCtxRef.current) {
      return;
    }

    const foregroundLabelIndex = getForegroundLabelIndex(segmenter.getLabels());
    const maskArray = categoryMask.getAsUint8Array();
    const maskWidth = categoryMask.width;
    const maskHeight = categoryMask.height;
    maskCanvasRef.current.width = maskWidth;
    maskCanvasRef.current.height = maskHeight;

    const maskImage = maskCtxRef.current.createImageData(maskWidth, maskHeight);
    for (let index = 0; index < maskArray.length; index += 1) {
      const value = maskArray[index];
      const alpha = value === foregroundLabelIndex ? 255 : 0;
      const offset = index * 4;
      maskImage.data[offset] = 255;
      maskImage.data[offset + 1] = 255;
      maskImage.data[offset + 2] = 255;
      maskImage.data[offset + 3] = alpha;
    }
    maskCtxRef.current.putImageData(maskImage, 0, 0);

    segmentedCtx.clearRect(0, 0, segmentedCanvas.width, segmentedCanvas.height);
    segmentedCtx.drawImage(
      videoElement,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      segmentedCanvas.width,
      segmentedCanvas.height
    );

    segmentedCtx.globalCompositeOperation = "destination-in";
    segmentedCtx.imageSmoothingEnabled = true;
    segmentedCtx.drawImage(
      maskCanvasRef.current,
      sourceX * (maskWidth / fullWidth),
      sourceY * (maskHeight / fullHeight),
      sourceWidth * (maskWidth / fullWidth),
      sourceHeight * (maskHeight / fullHeight),
      0,
      0,
      segmentedCanvas.width,
      segmentedCanvas.height
    );
    segmentedCtx.globalCompositeOperation = "source-over";
  }, []);

  const primeAudio = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }

    if (!audioContextRef.current) {
      const ContextCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!ContextCtor) {
        return;
      }
      audioContextRef.current = new ContextCtor();
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }
  }, []);

  const emitSummonBeat = useCallback((x: number, y: number) => {
    const now = performance.now();
    smokeRef.current.push(...createSmokeBurst(x, y, now));

    if (audioContextRef.current) {
      playClonePop(audioContextRef.current);
    }
  }, []);

  const clear = useCallback(() => {
    clonesRef.current = [];
    smokeRef.current = [];
    if (spawnTimerRef.current !== null) {
      window.clearTimeout(spawnTimerRef.current);
      spawnTimerRef.current = null;
    }
    lastSegmentationAtRef.current = 0;
    setActive(false);
  }, []);

  const trigger = useCallback(async () => {
    if (!canvas || !video) {
      return;
    }

    await primeAudio();
    await ensureSegmenter();
    clear();
    setActive(true);

    const spawnAt = (index: number) => {
      if (index >= CLONE_LAYOUT.length) {
        return;
      }

      const layout = CLONE_LAYOUT[index];
      emitSummonBeat(layout.x, layout.y);

      spawnTimerRef.current = window.setTimeout(() => {
        clonesRef.current.push({
          id: performance.now() + index,
          x: layout.x,
          y: layout.y,
          width: layout.scale,
          height: layout.scale * 1.55,
          opacity: 0,
          bornAt: performance.now(),
          wobbleSeed: Math.random() * Math.PI * 2
        });
        spawnAt(index + 1);
      }, 180);
    };

    spawnAt(0);
  }, [canvas, clear, emitSummonBeat, ensureSegmenter, primeAudio, video]);

  useEffect(() => {
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const render = () => {
      const width = canvas.clientWidth || canvas.width;
      const height = canvas.clientHeight || canvas.height;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (active && video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        const now = performance.now();
        const sourceVideoWidth = video.videoWidth || 1280;
        const sourceVideoHeight = video.videoHeight || 720;
        const sourceWidth = sourceVideoWidth * SOURCE_FRAME.width;
        const sourceHeight = sourceVideoHeight * SOURCE_FRAME.height;
        const sourceX = sourceVideoWidth * SOURCE_FRAME.x;
        const sourceY = sourceVideoHeight * SOURCE_FRAME.y;

        ensureSegmentationCanvases(sourceVideoWidth, sourceVideoHeight);
        updateLiveCutout(video);

        smokeRef.current = smokeRef.current.filter((particle) => now - particle.bornAt < particle.ttl);
        clonesRef.current = clonesRef.current.map((clone) => ({
          ...clone,
          opacity: Math.min(1, (now - clone.bornAt) / 260)
        }));

        clonesRef.current.forEach((clone) => {
          const drawWidth = canvas.width * clone.width;
          const drawHeight = canvas.height * clone.height;
          const wobble = Math.sin((now / 420) + clone.wobbleSeed) * 4;
          const x = clone.x * canvas.width - (drawWidth / 2) + wobble;
          const y = clone.y * canvas.height - drawHeight;
          const segmentedCanvas = segmentedCanvasRef.current;

          ctx.save();
          ctx.globalAlpha = clone.opacity;
          ctx.shadowBlur = 20;
          ctx.shadowColor = "rgba(185, 223, 255, 0.85)";
          ctx.translate(x + drawWidth, y);
          ctx.scale(-1, 1);
          if (segmentedCanvas) {
            ctx.drawImage(
              segmentedCanvas,
              0,
              0,
              segmentedCanvas.width,
              segmentedCanvas.height,
              0,
              0,
              drawWidth,
              drawHeight
            );
          } else {
            ctx.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, drawWidth, drawHeight);
          }
          ctx.restore();
        });

        smokeRef.current.forEach((particle) => {
          const age = (now - particle.bornAt) / particle.ttl;
          const x = (particle.x + (particle.driftX * age * 16)) * canvas.width;
          const y = (particle.y + (particle.driftY * age * 16)) * canvas.height;
          const radius = particle.radius + (age * 26);

          ctx.save();
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
          gradient.addColorStop(0, `rgba(255,255,255,${0.82 - age * 0.45})`);
          gradient.addColorStop(0.45, `rgba(246,246,255,${0.4 - age * 0.22})`);
          gradient.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      }

      rafRef.current = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [active, canvas, ensureSegmentationCanvases, updateLiveCutout, video]);

  return { trigger, clear, active, primeAudio };
}
