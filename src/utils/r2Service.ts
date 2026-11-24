/**
 * R2 Service - Cloudflare R2 Storage
 * Type-safe implementation
 */

import { R2_CONFIG } from '../config/r2';
import { compressImage, type CompressionOptions } from './imageCompressor';
import { auth } from '../config/firebase';

// Upload result interface
export interface UploadResult {
  url: string;
  fileKey: string;
}

// Upload options interface
export interface UploadOptions extends CompressionOptions {
  folder?: string;
  concurrency?: number;
}

// Batch upload result
export interface BatchUploadResult {
  urls: string[];
  failed: number;
}

// Delete result
export interface DeleteResult {
  success: number;
  failed: number;
  errors?: string[];
}

// Progress callback
export interface UploadProgress {
  completed: number;
  total: number;
  failed: number;
}

/**
 * توليد اسم ملف فريد لمنع التكرار
 */
const generateUniqueFileName = (originalName: string): string => {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop() ?? 'jpg';
  const baseName = originalName.replace(/\.[^/.]+$/, '').substring(0, 20);
  return `${baseName}_${timestamp}_${randomStr}.${extension}`;
};

/**
 * استخراج file key من رابط R2
 */
export const extractFileKey = (url: string | null | undefined): string | null => {
  if (!url || typeof url !== 'string') return null;

  try {
    const r2PublicUrl = import.meta.env['VITE_R2_PUBLIC_URL'] as string | undefined;
    if (!r2PublicUrl) {
      return null;
    }

    if (!url.startsWith(r2PublicUrl)) {
      return null;
    }

    const fileKey = url.replace(r2PublicUrl + '/', '');
    return fileKey || null;
  } catch {
    return null;
  }
};

/**
 * الحصول على Firebase Auth Token
 */
const getAuthToken = async (): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return await user.getIdToken();
};

/**
 * رفع صورة إلى Cloudflare R2
 */
export const uploadImage = async (
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult | null> => {
  try {
    // ضغط الصورة وتحويلها إلى WebP
    const compressedFile = await compressImage(file, {
      maxWidth: options.maxWidth ?? 1200,
      maxHeight: options.maxHeight ?? 1200,
      quality: options.quality ?? 0.85,
      maxSizeMB: options.maxSizeMB ?? 1,
      outputFormat: options.outputFormat ?? 'webp',
      preserveTransparency: true,
    });

    const authToken = await getAuthToken();

    // طلب رابط الرفع من Cloudflare Workers
    const response = await fetch(R2_CONFIG.uploadEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        fileName: generateUniqueFileName(compressedFile.name),
        contentType: compressedFile.type || 'image/webp',
        folder: options.folder ?? 'uploads',
      }),
    });

    if (!response.ok) {
      let errorMessage = 'فشل الحصول على رابط الرفع';
      try {
        const errorData = (await response.json()) as { error?: string };
        errorMessage = errorData.error ?? errorMessage;
      } catch {
        errorMessage = `خطأ ${response.status}: ${response.statusText}`;
      }

      if (response.status === 404) {
        errorMessage = 'خدمة رفع الصور غير متاحة';
      }

      throw new Error(errorMessage);
    }

    const responseText = await response.text();
    if (!responseText) {
      throw new Error('استجابة فارغة من الخادم');
    }

    let uploadData: { uploadUrl: string; publicUrl: string; fileKey: string };
    try {
      uploadData = JSON.parse(responseText) as typeof uploadData;
    } catch {
      throw new Error('استجابة غير صالحة من الخادم');
    }

    const { uploadUrl, publicUrl, fileKey } = uploadData;

    // رفع الملف مباشرة إلى R2
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': compressedFile.type || 'image/webp',
        Authorization: `Bearer ${authToken}`,
      },
      body: compressedFile,
    });

    if (!uploadResponse.ok) {
      throw new Error('فشل رفع الصورة إلى R2');
    }

    return {
      url: publicUrl,
      fileKey,
    };
  } catch {
    return null;
  }
};

/**
 * حذف صورة من R2
 */
export const deleteImage = async (url: string): Promise<boolean> => {
  const fileKey = extractFileKey(url);
  if (!fileKey) {
    return false;
  }

  try {
    const authToken = await getAuthToken();

    const response = await fetch(R2_CONFIG.deleteEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ fileKeys: [fileKey] }),
    });

    if (response.ok) {
      const result = (await response.json()) as { success?: number };
      return (result.success ?? 0) > 0;
    }

    return false;
  } catch {
    return false;
  }
};

/**
 * حذف مجموعة صور من R2
 */
export const deleteImages = async (urls: string[]): Promise<DeleteResult> => {
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return { success: 0, failed: 0 };
  }

  const validFileKeys = urls
    .filter((url) => typeof url === 'string' && url.trim() !== '')
    .map((url) => extractFileKey(url))
    .filter((key): key is string => key !== null);

  if (validFileKeys.length === 0) {
    return { success: 0, failed: urls.length };
  }

  try {
    const authToken = await getAuthToken();

    const response = await fetch(R2_CONFIG.deleteEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ fileKeys: validFileKeys }),
    });

    if (response.ok) {
      const result = (await response.json()) as DeleteResult;
      return {
        success: result.success ?? 0,
        failed: result.failed ?? 0,
        errors: result.errors ?? [],
      };
    }

    const errorText = await response.text();
    return { success: 0, failed: validFileKeys.length, errors: [errorText] };
  } catch (error) {
    return {
      success: 0,
      failed: validFileKeys.length,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
};

/**
 * مقارنة قائمتين من الصور وإرجاع الصور المحذوفة
 */
export const getDeletedImages = (
  oldImages: string[] = [],
  newImages: (string | File)[] = []
): string[] => {
  if (!Array.isArray(oldImages)) {
    return [];
  }

  if (!Array.isArray(newImages)) {
    return oldImages.filter((img) => typeof img === 'string');
  }

  const newUrls = newImages
    .filter((img): img is string => typeof img === 'string' && img.trim() !== '')
    .map((url) => url.trim());

  const deletedImages = oldImages.filter((oldImg) => {
    if (typeof oldImg !== 'string' || oldImg.trim() === '') return false;
    return !newUrls.includes(oldImg.trim());
  });

  return deletedImages;
};

/**
 * رفع مجموعة صور بشكل متوازي
 */
export const uploadImages = async (
  items: (File | string)[],
  options: UploadOptions = {},
  onProgress: ((progress: UploadProgress) => void) | null = null
): Promise<BatchUploadResult> => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { urls: [], failed: 0 };
  }

  const existingUrls = items.filter((item): item is string => typeof item === 'string');
  const newFiles = items.filter((item): item is File => item instanceof File);

  if (newFiles.length === 0) {
    return { urls: existingUrls, failed: 0 };
  }

  const concurrency = options.concurrency ?? 3;
  const results: (string | null)[] = [];
  let completed = 0;
  let failed = 0;
  const totalToUpload = newFiles.length;

  for (let i = 0; i < newFiles.length; i += concurrency) {
    const batch = newFiles.slice(i, i + concurrency);

    const batchResults = await Promise.all(
      batch.map(async (file) => {
        try {
          const result = await uploadImage(file, options);
          completed++;
          // uploadImage يعيد null عند أي فشل بدل أن يرمي؛ نعدّه فشلاً صريحاً
          // حتى لا يُحفظ منتج ناقص الصور بصمت.
          if (!result?.url) {
            failed++;
            onProgress?.({ completed, total: totalToUpload, failed });
            return null;
          }
          onProgress?.({ completed, total: totalToUpload, failed });
          return result.url;
        } catch {
          failed++;
          completed++;
          onProgress?.({ completed, total: totalToUpload, failed });
          return null;
        }
      })
    );

    results.push(...batchResults);
  }

  const newUrls = results.filter((url): url is string => url !== null);
  const allUrls = [...existingUrls, ...newUrls];

  return { urls: allUrls, failed };
};
