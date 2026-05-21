/**
 * Image size + auto-compression helper for free-tier enforcement.
 * Free users: max 5 MB after auto-compression. Premium: max 20 MB pass-through.
 */
import { toast } from 'sonner';

export const FREE_IMAGE_MAX_MB = 5;
export const PREMIUM_IMAGE_MAX_MB = 20;
export const FREE_VIDEO_MAX_MB = 5;
export const PREMIUM_VIDEO_MAX_MB = 50;

async function compressImage(file: File, maxMB: number): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  if (file.size <= maxMB * 1024 * 1024) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const maxDim = 1920;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      const tryQuality = (q: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file);
            if (blob.size <= maxMB * 1024 * 1024 || q <= 0.4) {
              resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
                type: 'image/jpeg',
              }));
            } else {
              tryQuality(q - 0.1);
            }
          },
          'image/jpeg',
          q
        );
      };
      tryQuality(0.85);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

/**
 * Process an image for upload based on premium status.
 * Returns the (possibly compressed) file, or null if it can't fit.
 */
export async function processImageForUpload(
  file: File,
  isPremium: boolean
): Promise<File | null> {
  const maxMB = isPremium ? PREMIUM_IMAGE_MAX_MB : FREE_IMAGE_MAX_MB;

  if (file.type.startsWith('image/') && !isPremium) {
    // Auto-compress free-tier images
    const compressed = await compressImage(file, maxMB);
    if (compressed.size > maxMB * 1024 * 1024) {
      toast.error(
        `Image is too large (${(compressed.size / 1024 / 1024).toFixed(
          1
        )} MB). Free limit is ${maxMB} MB — upgrade to Premium for ${PREMIUM_IMAGE_MAX_MB} MB.`
      );
      return null;
    }
    return compressed;
  }

  if (file.size > maxMB * 1024 * 1024) {
    toast.error(
      `File exceeds ${maxMB} MB limit${
        !isPremium ? ' — upgrade to Premium for larger uploads' : ''
      }.`
    );
    return null;
  }
  return file;
}

export function checkVideoSize(file: File, isPremium: boolean): boolean {
  const max = isPremium ? PREMIUM_VIDEO_MAX_MB : FREE_VIDEO_MAX_MB;
  if (file.size > max * 1024 * 1024) {
    toast.error(
      `Video exceeds ${max} MB${!isPremium ? ' (Premium allows larger)' : ''}.`
    );
    return false;
  }
  return true;
}
