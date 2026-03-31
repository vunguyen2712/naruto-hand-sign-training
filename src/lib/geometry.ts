import type { Point3 } from "../types/hand";

export function distance2D(a: Point3, b: Point3): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function midpoint(a: Point3, b: Point3): Point3 {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2
  };
}

export function averagePoint(points: Point3[]): Point3 {
  const total = points.reduce(
    (acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y,
      z: acc.z + point.z
    }),
    { x: 0, y: 0, z: 0 }
  );

  return {
    x: total.x / points.length,
    y: total.y / points.length,
    z: total.z / points.length
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeScore(
  value: number,
  goodMin: number,
  goodMax: number,
  hardMin: number,
  hardMax: number
): number {
  if (value >= goodMin && value <= goodMax) {
    return 1;
  }

  if (value < goodMin) {
    return clamp((value - hardMin) / Math.max(goodMin - hardMin, 0.0001), 0, 1);
  }

  return clamp((hardMax - value) / Math.max(hardMax - goodMax, 0.0001), 0, 1);
}

export function segmentDistance(a1: Point3, a2: Point3, b1: Point3, b2: Point3): number {
  const samples = 12;
  let best = Number.POSITIVE_INFINITY;

  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    const ap = lerpPoint(a1, a2, t);

    for (let j = 0; j <= samples; j += 1) {
      const u = j / samples;
      const bp = lerpPoint(b1, b2, u);
      best = Math.min(best, distance2D(ap, bp));
    }
  }

  return best;
}

export function lerpPoint(a: Point3, b: Point3, t: number): Point3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t
  };
}
