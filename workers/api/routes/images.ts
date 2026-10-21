/**
 * Images Routes - R2 Storage with Optimizations
 * رفع صور محسن مع streaming و caching
 */

import type { Env, AuthenticatedRequest } from '../types';
import { jsonResponse, errorResponse } from '../utils/helpers';

interface EnvWithR2 extends Env {
  R2_BUCKET: R2Bucket;
  R2_PUBLIC_URL: string;
}

// حدود الرفع
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

export async function handleImages(request: AuthenticatedRequest, env: Env, path: string): Promise<Response> {
  const method = request.method;

  if (method === 'POST' && path === '/api/images/upload-url') {
    return getUploadUrl(request, env as EnvWithR2);
  }

  if (method === 'POST' && path === '/api/images/upload-direct') {
    return handleDirectUpload(request, env as EnvWithR2);
  }

  if (method === 'POST' && path === '/api/images/delete') {
    return deleteImages(request, env as EnvWithR2);
  }

  return errorResponse('Not Found', 404);
}

async function getUploadUrl(request: Request, env: EnvWithR2): Promise<Response> {
  try {
    const { fileName, contentType, folder } = await request.json() as { 
      fileName: string; 
      contentType?: string; 
      folder?: string 
    };

    if (!fileName) {
      return errorResponse('fileName is required', 400);
    }

    // إنشاء اسم فريد للملف
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const ext = fileName.split('.').pop() || 'webp';
    const uniqueName = `${timestamp}-${randomId}.${ext}`;
    
    const fileKey = folder ? `${folder}/${uniqueName}` : uniqueName;
    const workerUploadUrl = `${new URL(request.url).origin}/api/images/upload/${encodeURIComponent(fileKey)}`;
    const publicUrl = `${env.R2_PUBLIC_URL}/${fileKey}`;

    return jsonResponse({
      uploadUrl: workerUploadUrl,
      publicUrl,
      fileKey,
      method: 'PUT',
      headers: { 'Content-Type': contentType || 'image/webp' }
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return errorResponse('Error generating upload URL', 500);
  }
}

/**
 * رفع مباشر للصور مع streaming
 * أسرع من الطريقة التقليدية
 */
async function handleDirectUpload(request: Request, env: EnvWithR2): Promise<Response> {
  try {
    const contentType = request.headers.get('Content-Type') || '';
    
    // التحقق من نوع الملف
    if (!ALLOWED_TYPES.some(t => contentType.includes(t))) {
      return errorResponse('نوع الملف غير مدعوم', 400);
    }

    // التحقق من حجم الملف
    const contentLength = parseInt(request.headers.get('Content-Length') || '0');
    if (contentLength > MAX_FILE_SIZE) {
      return errorResponse('حجم الملف كبير جداً (الحد الأقصى 10MB)', 400);
    }

    // إنشاء اسم فريد
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const ext = contentType.includes('webp') ? 'webp' : 
                contentType.includes('png') ? 'png' : 
                contentType.includes('gif') ? 'gif' : 'jpg';
    const fileKey = `uploads/${timestamp}-${randomId}.${ext}`;

    // رفع مباشر باستخدام streaming (أسرع)
    await env.R2_BUCKET.put(fileKey, request.body, {
      httpMetadata: {
        contentType,
        cacheControl: 'public, max-age=31536000', // كاش سنة كاملة
      },
    });

    const publicUrl = `${env.R2_PUBLIC_URL}/${fileKey}`;

    return jsonResponse({
      success: true,
      url: publicUrl,
      fileKey,
    }, 201);
  } catch (error) {
    console.error('Direct upload error:', error);
    return errorResponse('فشل رفع الصورة', 500);
  }
}

async function deleteImages(request: Request, env: EnvWithR2): Promise<Response> {
  try {
    const { fileKeys } = await request.json() as { fileKeys: string[] };

    if (!fileKeys || !Array.isArray(fileKeys) || fileKeys.length === 0) {
      return errorResponse('fileKeys array is required', 400);
    }

    // حذف متوازي لأداء أفضل
    const results = await Promise.allSettled(
      fileKeys.map(key => env.R2_BUCKET.delete(key))
    );

    const success = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return jsonResponse({ success, failed });
  } catch (error) {
    console.error('Error deleting images:', error);
    return errorResponse('Error deleting images', 500);
  }
}

export async function handleImageUpload(request: AuthenticatedRequest, env: Env, fileKey: string): Promise<Response> {
  try {
    const envWithR2 = env as EnvWithR2;
    const contentType = request.headers.get('Content-Type') || 'image/webp';

    // رفع مباشر باستخدام streaming
    await envWithR2.R2_BUCKET.put(fileKey, request.body, {
      httpMetadata: {
        contentType,
        cacheControl: 'public, max-age=31536000',
      },
    });

    const publicUrl = `${envWithR2.R2_PUBLIC_URL}/${fileKey}`;

    return jsonResponse({ success: true, url: publicUrl, fileKey });
  } catch (error) {
    console.error('Error uploading image:', error);
    return errorResponse('Error uploading image', 500);
  }
}
