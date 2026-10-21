/**
 * ضغط وتحويل الصور المحسّن - الإصدار 2.0
 * Type-safe implementation
 *
 * التحسينات:
 * 1. التحويل إلى WebP (توفير 30% من الحجم)
 * 2. Dynamic Import لمكتبة HEIC (تحميل عند الحاجة فقط)
 * 3. معالجة EXIF Orientation تلقائياً
 *
 * الصيغ المدعومة: HEIC, HEIF, WEBP, PNG, JPG, JPEG, GIF, BMP, TIFF, AVIF
 */

// Compression options interface
export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeMB?: number;
  outputFormat?: 'webp' | 'jpeg' | 'png' | 'original';
  preserveTransparency?: boolean;
}

// Internal processing options
interface ProcessOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  useWebP: boolean;
  preserveTransparency: boolean;
  orientation: number;
}

// Optimization info interface
export interface OptimizationInfo {
  webpSupported: boolean;
  outputFormat: string;
  expectedSavings: string;
  maxDimensions: string;
  quality: string;
}

// الإعدادات الافتراضية
const CONFIG = {
  MAX_WIDTH: 1920,
  MAX_HEIGHT: 1920,
  QUALITY: 0.85,
  MAX_SIZE_MB: 2,
  OUTPUT_FORMAT: 'webp' as const,
} as const;

// الصيغ المدعومة
const SUPPORTED_FORMATS = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/tiff',
  'image/heic',
  'image/heif',
  'image/avif',
] as const;

// صيغ تحتاج تحويل خاص
const HEIC_FORMATS = ['image/heic', 'image/heif'] as const;

// Extension to MIME type mapping
const EXTENSION_MAP: Record<string, string> = {
  heic: 'image/heic',
  heif: 'image/heif',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  tiff: 'image/tiff',
  tif: 'image/tiff',
  avif: 'image/avif',
};

// Cache للتحقق من دعم WebP
let webpSupported: boolean | null = null;

// HEIC converter module cache
let heic2anyModule: ((options: { blob: Blob; toType: string; quality: number }) => Promise<Blob | Blob[]>) | null = null;

/**
 * التحقق من دعم المتصفح لـ WebP
 */
const checkWebPSupport = async (): Promise<boolean> => {
  if (webpSupported !== null) return webpSupported;

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;

    const dataUrl = canvas.toDataURL('image/webp');
    webpSupported = dataUrl.startsWith('data:image/webp');

    resolve(webpSupported);
  });
};

/**
 * تحميل مكتبة HEIC بشكل كسول (Dynamic Import)
 */
const loadHeicConverter = async (): Promise<typeof heic2anyModule> => {
  if (heic2anyModule) return heic2anyModule;

  const module = await import('heic2any');
  heic2anyModule = module.default || module;

  return heic2anyModule;
};

/**
 * تحويل HEIC/HEIF إلى Blob
 */
const convertHeicToBlob = async (file: File): Promise<File> => {
  const heic2any = await loadHeicConverter();
  if (!heic2any) {
    throw new Error('فشل تحميل محول HEIC');
  }

  const blob = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.92,
  });

  const resultBlob = Array.isArray(blob) ? blob[0] : blob;
  if (!resultBlob) {
    throw new Error('فشل تحويل صورة HEIC');
  }

  const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
  const convertedFile = new File([resultBlob], newName, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });

  return convertedFile;
};

/**
 * قراءة EXIF Orientation من الصورة
 */
const getExifOrientation = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const result = e.target?.result;
      if (!(result instanceof ArrayBuffer)) {
        resolve(1);
        return;
      }

      const view = new DataView(result);

      // التحقق من JPEG marker
      if (view.getUint16(0, false) !== 0xffd8) {
        resolve(1);
        return;
      }

      let offset = 2;
      const length = view.byteLength;

      while (offset < length) {
        if (view.getUint16(offset, false) === 0xffe1) {
          const exifStart = offset + 4;

          if (view.getUint32(exifStart, false) !== 0x45786966) {
            resolve(1);
            return;
          }

          const tiffStart = exifStart + 6;
          const littleEndian = view.getUint16(tiffStart, false) === 0x4949;

          const ifdOffset = view.getUint32(tiffStart + 4, littleEndian);
          const numEntries = view.getUint16(tiffStart + ifdOffset, littleEndian);

          for (let i = 0; i < numEntries; i++) {
            const entryOffset = tiffStart + ifdOffset + 2 + i * 12;
            const tag = view.getUint16(entryOffset, littleEndian);

            if (tag === 0x0112) {
              resolve(view.getUint16(entryOffset + 8, littleEndian));
              return;
            }
          }

          resolve(1);
          return;
        }

        offset += 2 + view.getUint16(offset + 2, false);
      }

      resolve(1);
    };

    reader.onerror = () => resolve(1);
    reader.readAsArrayBuffer(file.slice(0, 65536));
  });
};

/**
 * تطبيق تحويل EXIF على Canvas
 */
const applyExifOrientation = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  orientation: number
): void => {
  const { width, height } = canvas;

  switch (orientation) {
    case 2:
      ctx.transform(-1, 0, 0, 1, width, 0);
      break;
    case 3:
      ctx.transform(-1, 0, 0, -1, width, height);
      break;
    case 4:
      ctx.transform(1, 0, 0, -1, 0, height);
      break;
    case 5:
      canvas.width = height;
      canvas.height = width;
      ctx.transform(0, 1, 1, 0, 0, 0);
      break;
    case 6:
      canvas.width = height;
      canvas.height = width;
      ctx.transform(0, 1, -1, 0, height, 0);
      break;
    case 7:
      canvas.width = height;
      canvas.height = width;
      ctx.transform(0, -1, -1, 0, height, width);
      break;
    case 8:
      canvas.width = height;
      canvas.height = width;
      ctx.transform(0, -1, 1, 0, 0, width);
      break;
    default:
      break;
  }
};

/**
 * التحقق من نوع الملف
 */
const getFileType = (file: File): string => {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (file.type && file.type !== 'application/octet-stream') {
    return file.type.toLowerCase();
  }

  return EXTENSION_MAP[extension] ?? 'image/jpeg';
};

/**
 * التحقق إذا كان الملف صورة مدعومة
 */
export const isValidImageFile = (file: File): boolean => {
  const type = getFileType(file);
  return (SUPPORTED_FORMATS as readonly string[]).includes(type) || type.startsWith('image/');
};


/**
 * ضغط وتحويل الصورة - الدالة الرئيسية
 */
export const compressImage = async (
  file: File,
  options: CompressionOptions = {}
): Promise<File> => {
  const {
    maxWidth = CONFIG.MAX_WIDTH,
    maxHeight = CONFIG.MAX_HEIGHT,
    quality = CONFIG.QUALITY,
    outputFormat = CONFIG.OUTPUT_FORMAT,
    preserveTransparency = true,
  } = options;

  const fileType = getFileType(file);
  let processFile = file;

  // تحويل HEIC/HEIF أولاً
  if ((HEIC_FORMATS as readonly string[]).includes(fileType)) {
    processFile = await convertHeicToBlob(file);
  }

  // التحقق من دعم WebP
  const useWebP = outputFormat === 'webp' && (await checkWebPSupport());

  // قراءة EXIF Orientation
  const orientation = await getExifOrientation(processFile);

  return processImage(processFile, {
    maxWidth,
    maxHeight,
    quality,
    useWebP,
    preserveTransparency,
    orientation,
  });
};

/**
 * معالجة الصورة (ضغط وتغيير الحجم)
 */
const processImage = (file: File, options: ProcessOptions): Promise<File> => {
  const { maxWidth, maxHeight, quality, useWebP, preserveTransparency, orientation } = options;

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // حساب الأبعاد الجديدة
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // تطبيق EXIF Orientation
        applyExifOrientation(ctx, canvas, orientation);

        // تحديد صيغة الإخراج
        const fileType = getFileType(file);
        const isPng = fileType === 'image/png';
        const hasTransparency = isPng && preserveTransparency;

        let outputType: string;
        let outputQuality: number | undefined;
        let fileExtension: string;

        if (hasTransparency) {
          outputType = useWebP ? 'image/webp' : 'image/png';
          outputQuality = useWebP ? quality : undefined;
          fileExtension = useWebP ? '.webp' : '.png';
        } else {
          outputType = useWebP ? 'image/webp' : 'image/jpeg';
          outputQuality = quality;
          fileExtension = useWebP ? '.webp' : '.jpg';

          if (!useWebP && isPng) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
        }

        // رسم الصورة
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const newName = file.name.replace(/\.[^.]+$/, fileExtension);

              const compressedFile = new File([blob], newName, {
                type: outputType,
                lastModified: Date.now(),
              });

              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          outputType,
          outputQuality
        );
      };

      img.onerror = () => {
        resolve(file);
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      resolve(file);
    };

    reader.readAsDataURL(file);
  });
};

/**
 * ضغط مجموعة من الصور
 */
export const compressImages = async (
  files: File[],
  options: CompressionOptions = {}
): Promise<File[]> => {
  const compressedFiles: File[] = [];

  for (const file of files) {
    try {
      const compressed = await compressImage(file, options);
      compressedFiles.push(compressed);
    } catch {
      compressedFiles.push(file);
    }
  }

  return compressedFiles;
};

/**
 * الحصول على قائمة الصيغ المدعومة للعرض
 */
export const getSupportedFormats = (): string => {
  return '.jpg,.jpeg,.png,.gif,.webp,.heic,.heif,.bmp,.tiff,.tif,.avif';
};

/**
 * الحصول على معلومات التحسين
 */
export const getOptimizationInfo = async (): Promise<OptimizationInfo> => {
  const webp = await checkWebPSupport();
  return {
    webpSupported: webp,
    outputFormat: webp ? 'WebP' : 'JPEG',
    expectedSavings: webp ? '25-35%' : '10-20%',
    maxDimensions: `${CONFIG.MAX_WIDTH}x${CONFIG.MAX_HEIGHT}`,
    quality: `${CONFIG.QUALITY * 100}%`,
  };
};

export default compressImage;
