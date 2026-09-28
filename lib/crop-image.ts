export const CROP_SIZE = 512;
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 3;

export type CropParams = { sx: number; sy: number; sSize: number };

export function clampZoom(z: number): number {
  if (!Number.isFinite(z)) return MIN_ZOOM;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

/** Max pan (css px) so the image still fully covers the square view. */
export function maxPanOffset(
  imgW: number,
  imgH: number,
  viewSize: number,
  zoom: number,
): { x: number; y: number } {
  if (!(imgW > 0 && imgH > 0 && viewSize > 0)) return { x: 0, y: 0 };
  const z = clampZoom(zoom);
  const scale = Math.max(viewSize / imgW, viewSize / imgH) * z;
  return {
    x: Math.max(0, (imgW * scale - viewSize) / 2),
    y: Math.max(0, (imgH * scale - viewSize) / 2),
  };
}

export function clampOffset(
  imgW: number,
  imgH: number,
  viewSize: number,
  zoom: number,
  ox: number,
  oy: number,
): { x: number; y: number } {
  const m = maxPanOffset(imgW, imgH, viewSize, zoom);
  const cx = Number.isFinite(ox) ? ox : 0;
  const cy = Number.isFinite(oy) ? oy : 0;
  // Normalize -0 to 0
  const x = Math.min(m.x, Math.max(-m.x, cx));
  const y = Math.min(m.y, Math.max(-m.y, cy));
  return { x: x === 0 ? 0 : x, y: y === 0 ? 0 : y };
}

/**
 * Source square to cut from the original image for a 1:1 crop.
 * Model mirrors the modal preview: cover-fit at zoom 1, scaled by zoom,
 * panned by (offsetX, offsetY) css px. Always clamped inside the image.
 */
export function cropSquareParams(
  imgW: number,
  imgH: number,
  viewSize: number,
  zoom = 1,
  offsetX = 0,
  offsetY = 0,
): CropParams {
  if (!(imgW > 0 && imgH > 0 && viewSize > 0)) return { sx: 0, sy: 0, sSize: 0 };
  const z = clampZoom(zoom);
  const scale = Math.max(viewSize / imgW, viewSize / imgH) * z;
  const { x: ox, y: oy } = clampOffset(imgW, imgH, viewSize, z, offsetX, offsetY);
  const sSize = viewSize / scale;
  const rawSx = (imgW * scale - viewSize) / 2 / scale - ox / scale;
  const rawSy = (imgH * scale - viewSize) / 2 / scale - oy / scale;
  const side = Math.min(sSize, imgW, imgH);
  const sx = Math.min(imgW - side, Math.max(0, rawSx));
  const sy = Math.min(imgH - side, Math.max(0, rawSy));
  return { sx, sy, sSize: side };
}
