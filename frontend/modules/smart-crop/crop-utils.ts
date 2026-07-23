/**
 * Smart Crop Utilities — `frontend/modules/smart-crop/crop-utils.ts`
 *
 * Uses `smartcrop.js` to analyze images (skin tones, facial features, high-contrast edges,
 * rule of thirds) and intelligently crop them into 1:1 square (1080x1080) focusing on the main subject/face.
 */

// @ts-ignore
import smartcrop from 'smartcrop';

export async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';

    if (src.startsWith('blob:') || src.startsWith('data:')) {
      img.src = src;
    } else {
      img.src = `/api/proxy?url=${encodeURIComponent(src)}`;
    }

    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error(`Failed to load image: ${src} — ${err}`));
  });
}

export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Detect best 1:1 square crop box using smartcrop.js (skin tones, faces, edges, rule of thirds).
 */
export async function detectSmartCrop(
  img: HTMLImageElement,
  targetWidth = 1080,
  targetHeight = 1080
): Promise<CropRegion> {
  try {
    const result = await smartcrop.crop(img, {
      width: targetWidth,
      height: targetHeight,
      ruleOfThirds: true,
      minScale: 0.8,
    });
    if (result && result.topCrop) {
      return result.topCrop;
    }
  } catch (e) {
    console.warn('[SmartCrop] smartcrop.js detection error, using center fallback:', e);
  }

  // Fallback to center square crop if detection fails
  const size = Math.min(img.naturalWidth, img.naturalHeight);
  return {
    x: Math.floor((img.naturalWidth - size) / 2),
    y: Math.floor((img.naturalHeight - size) / 2),
    width: size,
    height: size,
  };
}

/**
 * Renders the detected smart crop region onto a 1080x1080 canvas.
 */
export async function applySquareCrop(
  img: HTMLImageElement,
  cropRegion: CropRegion,
  targetWidth = 1080,
  targetHeight = 1080,
  quality = 0.92
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    img,
    cropRegion.x,
    cropRegion.y,
    cropRegion.width,
    cropRegion.height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob returned null'));
      },
      'image/jpeg',
      quality
    );
  });
}

/**
 * Main Smart Crop pipeline:
 * - If image is already 1:1 square (ratio between 0.98 and 1.02), preserves original.
 * - Otherwise, runs smartcrop.js to find subject/face focal point and crops to 1:1 1080x1080.
 */
export async function smartCropToBlob(
  src: string
): Promise<{ blob: Blob | null; isAlreadyValid: boolean }> {
  const img = await loadImage(src);

  if (!img.naturalWidth || !img.naturalHeight) {
    return { blob: null, isAlreadyValid: true };
  }

  const ratio = img.naturalWidth / img.naturalHeight;
  // If already 1:1 square ratio, no crop needed
  if (ratio >= 0.98 && ratio <= 1.02) {
    return { blob: null, isAlreadyValid: true };
  }

  const cropRegion = await detectSmartCrop(img, 1080, 1080);
  const blob = await applySquareCrop(img, cropRegion, 1080, 1080);

  return { blob, isAlreadyValid: false };
}

