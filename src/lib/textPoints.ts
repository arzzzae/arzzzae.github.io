/**
 * Sample text rendered to an offscreen 2D canvas into a set of 3D point
 * positions. Browser-only (relies on Canvas2D); guard calls behind a
 * `typeof document` check. Pure with respect to its inputs.
 */
export interface SampleTextOptions {
  text: string;
  /** Font size in canvas pixels. */
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  /** Sample step in pixels — smaller = more particles. */
  density?: number;
  /** World-space width the text should span. */
  worldWidth?: number;
}

export interface SampledText {
  /** Flat [x, y, z, ...] positions centered on the origin. */
  positions: Float32Array;
  count: number;
}

export function sampleText(options: SampleTextOptions): SampledText {
  const {
    text,
    fontSize = 200,
    fontFamily = 'system-ui, sans-serif',
    fontWeight = 700,
    density = 4,
    worldWidth = 10,
  } = options;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { positions: new Float32Array(0), count: 0 };

  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  const metrics = ctx.measureText(text);
  const padding = fontSize * 0.4;
  const width = Math.ceil(metrics.width + padding * 2);
  const height = Math.ceil(fontSize * 1.6);

  canvas.width = width;
  canvas.height = height;

  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);

  const { data } = ctx.getImageData(0, 0, width, height);
  const points: number[] = [];
  const scale = worldWidth / width;

  for (let y = 0; y < height; y += density) {
    for (let x = 0; x < width; x += density) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 128) {
        // center around origin, flip Y (canvas y is downward)
        const px = (x - width / 2) * scale;
        const py = -(y - height / 2) * scale;
        const pz = 0;
        points.push(px, py, pz);
      }
    }
  }

  return { positions: new Float32Array(points), count: points.length / 3 };
}
