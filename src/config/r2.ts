/**
 * Cloudflare R2 Configuration
 * الصور تُرفع عبر Cloudflare Workers API
 */

interface R2Endpoints {
  upload: string;
  delete: string;
}

interface R2ConfigType {
  uploadEndpoint: string;
  deleteEndpoint: string;
}

function getEndpoints(): R2Endpoints {
  // استخدام Cloudflare Workers API دائماً
  const apiBase = import.meta.env.VITE_API_URL ?? '';

  return {
    upload: `${apiBase}/api/images/upload-url`,
    delete: `${apiBase}/api/images/delete`,
  };
}

const endpoints = getEndpoints();

export const R2_CONFIG: R2ConfigType = {
  uploadEndpoint: endpoints.upload,
  deleteEndpoint: endpoints.delete,
};

export default R2_CONFIG;
