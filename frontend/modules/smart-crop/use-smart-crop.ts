/**
 * useSmartCrop — `frontend/modules/smart-crop/use-smart-crop.ts`
 *
 * Checks image aspect ratios. If an image is already within Instagram's valid
 * aspect ratio range [0.8, 1.91] (such as 16:9 banners, 4:3 photos, 1:1 square, 4:5 portrait),
 * it leaves the image 100% untouched to prevent cutting off text or graphics.
 *
 * Only for extreme aspect ratios (out of [0.8, 1.91]), it generates a padded canvas
 * and uploads the resulting Blob to Supabase Storage.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { smartCropToBlob } from './crop-utils';

export interface SmartCropState {
  croppedUrls: string[];
  isCropping: boolean;
  cropProgress: number;
  errors: Record<string, string>;
}

export function useSmartCrop(imageUrls: string[]): SmartCropState {
  const [croppedUrls, setCroppedUrls] = useState<string[]>([]);
  const [isCropping, setIsCropping] = useState(false);
  const [cropProgress, setCropProgress] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const prevKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const key = (imageUrls || []).join('|');
    if (key === prevKeyRef.current) return;
    prevKeyRef.current = key;

    if (!imageUrls || imageUrls.length === 0) {
      setCroppedUrls((prev) => (prev.length === 0 ? prev : []));
      setIsCropping(false);
      setCropProgress(0);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setIsCropping(true);
      setCropProgress(0);
      setErrors({});
      const results: string[] = new Array(imageUrls.length).fill('');
      const newErrors: Record<string, string> = {};

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      for (let i = 0; i < imageUrls.length; i++) {
        if (cancelled) break;
        const src = imageUrls[i];

        try {
          const { blob, isAlreadyValid } = await smartCropToBlob(src);

          if (isAlreadyValid || !blob) {
            // Original aspect ratio is 1:1 square — keep 100% original URL
            results[i] = src;
          } else {
            let publicUrl = src;
            const ext = (blob.type || 'image/jpeg').split('/')[1] || 'jpg';
            const folder = user?.id || 'public';
            const path = `${folder}/smart_crop_${Date.now()}_${Math.random().toString(36).substring(7)}_${i}.${ext}`;

            const { error: uploadError } = await supabase.storage
              .from('avatars')
              .upload(path, blob, { upsert: true, contentType: blob.type || 'image/jpeg' });

            if (!uploadError) {
              publicUrl = supabase.storage
                .from('avatars')
                .getPublicUrl(path).data.publicUrl;
            } else {
              console.warn('[SmartCrop] Supabase storage upload error:', uploadError);
              publicUrl = URL.createObjectURL(blob);
            }

            results[i] = publicUrl;
          }
        } catch (err: any) {
          console.warn(`[SmartCrop] Processing skipped for ${src}:`, err?.message);
          results[i] = src; // Keep original URL on error
        }

        if (!cancelled) {
          setCropProgress(Math.round(((i + 1) / imageUrls.length) * 100));
        }
      }

      if (!cancelled) {
        setCroppedUrls(results);
        setErrors(newErrors);
        setIsCropping(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [imageUrls]);

  return { croppedUrls, isCropping, cropProgress, errors };
}
