/**
 * Input Validator Utility
 * التحقق من صحة البيانات المدخلة
 */

import type { ValidationResult } from '../types';

// ===== Types =====

interface ValidationRules {
  maxStringLength: number;
  maxTextLength: number;
  maxArrayLength: number;
  maxJsonSize: number;
  minNameLength: number;
  maxNameLength: number;
  minPrice: number;
  maxPrice: number;
  minQuantity: number;
  maxQuantity: number;
  maxImages: number;
  maxImageUrlLength: number;
  minPhoneLength: number;
  maxPhoneLength: number;
  slugPattern: RegExp;
  minSlugLength: number;
  maxSlugLength: number;
}

interface FieldValidationResult<T = string> {
  valid: boolean;
  error?: string;
  value?: T;
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
  image?: string;
}

interface ProductInput {
  name?: string;
  price?: number;
  description?: string;
  images?: string[];
  categoryId?: string | null;
  colors?: string[];
  sizes?: string[];
  discount?: number;
  inStock?: boolean;
}

interface OrderInput {
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerNotes?: string;
  items: OrderItem[];
  paymentMethodId: string;
  receiptImage?: string;
}

interface StoreInput {
  name?: string;
  description?: string;
  slug?: string;
  whatsapp?: string;
  logo?: string;
  currency?: string;
}

interface SanitizedProduct {
  name?: string;
  price?: number;
  description?: string;
  images?: string[];
  categoryId?: string;
  colors?: string[];
  sizes?: string[];
  discount?: number;
  inStock?: boolean;
}

interface SanitizedOrder {
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerNotes?: string;
  items?: OrderItem[];
  paymentMethodId?: string;
  receiptImage?: string;
}

interface SanitizedStore {
  name?: string;
  description?: string | null;
  slug?: string;
  whatsapp?: string | null;
  logo?: string | null;
  currency?: string;
}

// ===== Validation Rules =====

export const RULES: ValidationRules = {
  maxStringLength: 1000,
  maxTextLength: 5000,
  maxArrayLength: 100,
  maxJsonSize: 50000,
  minNameLength: 2,
  maxNameLength: 100,
  minPrice: 0,
  maxPrice: 10000000,
  minQuantity: 1,
  maxQuantity: 1000,
  maxImages: 20,
  maxImageUrlLength: 500,
  minPhoneLength: 8,
  maxPhoneLength: 20,
  slugPattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  minSlugLength: 3,
  maxSlugLength: 50,
};

// ===== Sanitization Functions =====

export function sanitizeString(str: unknown, maxLength = RULES.maxStringLength): string {
  if (typeof str !== 'string') return '';
  
  return str
    .trim()
    .slice(0, maxLength)
    // Strip control characters while retaining tab/newline formatting.
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function sanitizeText(str: unknown, maxLength = RULES.maxTextLength): string {
  if (typeof str !== 'string') return '';
  
  return str
    .trim()
    .slice(0, maxLength)
    // Strip control characters while retaining tab/newline formatting.
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
}

export function sanitizePhone(phone: unknown): string {
  if (typeof phone !== 'string') return '';
  return phone.replace(/[^\d+]/g, '').slice(0, RULES.maxPhoneLength);
}

export function sanitizeSlug(slug: unknown): string {
  if (typeof slug !== 'string') return '';
  
  return slug
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, RULES.maxSlugLength);
}

export function sanitizeUrl(url: unknown): string {
  if (typeof url !== 'string') return '';
  
  const trimmed = url.trim().slice(0, RULES.maxImageUrlLength);
  
  if (!trimmed.match(/^https?:\/\//i)) {
    return '';
  }
  
  try {
    new URL(trimmed);
    return trimmed;
  } catch {
    return '';
  }
}

export function sanitizeUrlArray(urls: unknown, maxItems = RULES.maxImages): string[] {
  if (!Array.isArray(urls)) return [];
  
  return urls
    .slice(0, maxItems)
    .map(sanitizeUrl)
    .filter((url): url is string => url.length > 0);
}

export function sanitizeStringArray(
  arr: unknown,
  maxItems = RULES.maxArrayLength,
  maxLength = RULES.maxStringLength
): string[] {
  if (!Array.isArray(arr)) return [];
  
  return arr
    .slice(0, maxItems)
    .map(item => sanitizeString(String(item), maxLength))
    .filter(item => item.length > 0);
}

// ===== Validation Functions =====

export function validateName(name: unknown, fieldName = 'الاسم'): FieldValidationResult {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: `${fieldName} مطلوب` };
  }
  
  const sanitized = sanitizeString(name, RULES.maxNameLength);
  
  if (sanitized.length < RULES.minNameLength) {
    return { valid: false, error: `${fieldName} يجب أن يكون ${RULES.minNameLength} أحرف على الأقل` };
  }
  
  return { valid: true, value: sanitized };
}

export function validatePrice(price: unknown, fieldName = 'السعر'): FieldValidationResult<number> {
  const num = Number(price);
  
  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} يجب أن يكون رقماً` };
  }
  
  if (num < RULES.minPrice) {
    return { valid: false, error: `${fieldName} لا يمكن أن يكون سالباً` };
  }
  
  if (num > RULES.maxPrice) {
    return { valid: false, error: `${fieldName} كبير جداً` };
  }
  
  return { valid: true, value: Math.round(num * 100) / 100 };
}

export function validateQuantity(quantity: unknown, fieldName = 'الكمية'): FieldValidationResult<number> {
  const num = parseInt(String(quantity), 10);
  
  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} يجب أن يكون رقماً صحيحاً` };
  }
  
  if (num < RULES.minQuantity) {
    return { valid: false, error: `${fieldName} يجب أن يكون ${RULES.minQuantity} على الأقل` };
  }
  
  if (num > RULES.maxQuantity) {
    return { valid: false, error: `${fieldName} كبير جداً (الحد الأقصى ${RULES.maxQuantity})` };
  }
  
  return { valid: true, value: num };
}

export function validatePhone(
  phone: unknown,
  fieldName = 'رقم الهاتف',
  required = true
): FieldValidationResult<string | null> {
  if (!phone && !required) {
    return { valid: true, value: null };
  }
  
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: `${fieldName} مطلوب` };
  }
  
  const sanitized = sanitizePhone(phone);
  
  if (sanitized.length < RULES.minPhoneLength) {
    return { valid: false, error: `${fieldName} غير صالح` };
  }
  
  return { valid: true, value: sanitized };
}

export function validateEmail(
  email: unknown,
  fieldName = 'البريد الإلكتروني',
  required = true
): FieldValidationResult<string | null> {
  if (!email && !required) {
    return { valid: true, value: null };
  }
  
  if (!email || typeof email !== 'string') {
    return { valid: false, error: `${fieldName} مطلوب` };
  }
  
  const sanitized = email.trim().toLowerCase().slice(0, 254);
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailPattern.test(sanitized)) {
    return { valid: false, error: `${fieldName} غير صالح` };
  }
  
  return { valid: true, value: sanitized };
}

export function validateSlug(slug: unknown, fieldName = 'الرابط'): FieldValidationResult {
  if (!slug || typeof slug !== 'string') {
    return { valid: false, error: `${fieldName} مطلوب` };
  }
  
  const sanitized = sanitizeSlug(slug);
  
  if (sanitized.length < RULES.minSlugLength) {
    return { valid: false, error: `${fieldName} يجب أن يكون ${RULES.minSlugLength} أحرف على الأقل` };
  }
  
  if (!RULES.slugPattern.test(sanitized)) {
    return { valid: false, error: `${fieldName} يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام وشرطات فقط` };
  }
  
  return { valid: true, value: sanitized };
}

export function validateUrl(
  url: unknown,
  fieldName = 'الرابط',
  required = false
): FieldValidationResult<string | null> {
  if (!url && !required) {
    return { valid: true, value: null };
  }
  
  if (!url || typeof url !== 'string') {
    return { valid: false, error: `${fieldName} مطلوب` };
  }
  
  const sanitized = sanitizeUrl(url);
  
  if (!sanitized) {
    return { valid: false, error: `${fieldName} غير صالح` };
  }
  
  return { valid: true, value: sanitized };
}

export function validateImages(
  images: unknown,
  fieldName = 'الصور',
  required = false
): FieldValidationResult<string[]> {
  if (!images && !required) {
    return { valid: true, value: [] };
  }
  
  if (!Array.isArray(images)) {
    return { valid: false, error: `${fieldName} يجب أن تكون مصفوفة` };
  }
  
  const sanitized = sanitizeUrlArray(images);
  
  if (required && sanitized.length === 0) {
    return { valid: false, error: `${fieldName} مطلوبة (صورة واحدة على الأقل)` };
  }
  
  return { valid: true, value: sanitized };
}

export function validateStatus(
  status: unknown,
  allowedStatuses: string[],
  fieldName = 'الحالة'
): FieldValidationResult {
  if (!status || typeof status !== 'string') {
    return { valid: false, error: `${fieldName} مطلوبة` };
  }
  
  const sanitized = status.trim().toLowerCase();
  
  if (!allowedStatuses.includes(sanitized)) {
    return { valid: false, error: `${fieldName} غير صالحة. القيم المسموحة: ${allowedStatuses.join(', ')}` };
  }
  
  return { valid: true, value: sanitized };
}

export function validateUUID(id: unknown, fieldName = 'المعرف'): FieldValidationResult {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: `${fieldName} مطلوب` };
  }
  
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!uuidPattern.test(id)) {
    return { valid: false, error: `${fieldName} غير صالح` };
  }
  
  return { valid: true, value: id.toLowerCase() };
}

// ===== Schema Validators =====

export function validateProductInput(
  data: ProductInput,
  isUpdate = false
): ValidationResult<SanitizedProduct> {
  const errors: string[] = [];
  const sanitized: SanitizedProduct = {};
  
  if (data.name !== undefined || !isUpdate) {
    const nameResult = validateName(data.name, 'اسم المنتج');
    if (!nameResult.valid) errors.push(nameResult.error!);
    else sanitized.name = nameResult.value;
  }
  
  if (data.price !== undefined) {
    const priceResult = validatePrice(data.price);
    if (!priceResult.valid) errors.push(priceResult.error!);
    else sanitized.price = priceResult.value;
  } else if (!isUpdate) {
    sanitized.price = 0;
  }
  
  if (data.description !== undefined) {
    sanitized.description = sanitizeText(data.description);
  }
  
  if (data.images !== undefined) {
    const imagesResult = validateImages(data.images);
    if (!imagesResult.valid) errors.push(imagesResult.error!);
    else sanitized.images = imagesResult.value;
  }
  
  if (data.categoryId !== undefined && data.categoryId !== null) {
    sanitized.categoryId = sanitizeString(data.categoryId, 100);
  }
  
  if (data.colors !== undefined) {
    sanitized.colors = sanitizeStringArray(data.colors, 50, 50);
  }
  
  if (data.sizes !== undefined) {
    sanitized.sizes = sanitizeStringArray(data.sizes, 50, 20);
  }
  
  if (data.discount !== undefined) {
    const discountResult = validatePrice(data.discount, 'الخصم');
    if (!discountResult.valid) errors.push(discountResult.error!);
    else sanitized.discount = discountResult.value;
  }
  
  if (data.inStock !== undefined) {
    sanitized.inStock = Boolean(data.inStock);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    data: sanitized,
  };
}

export function validateOrderInput(data: OrderInput): ValidationResult<SanitizedOrder> {
  const errors: string[] = [];
  const sanitized: SanitizedOrder = {};
  
  const nameResult = validateName(data.customerName, 'اسم العميل');
  if (!nameResult.valid) errors.push(nameResult.error!);
  else sanitized.customerName = nameResult.value;
  
  const phoneResult = validatePhone(data.customerPhone);
  if (!phoneResult.valid) errors.push(phoneResult.error!);
  else sanitized.customerPhone = phoneResult.value!;
  
  if (data.customerAddress) {
    sanitized.customerAddress = sanitizeText(data.customerAddress, 500);
  }
  
  if (data.customerNotes) {
    sanitized.customerNotes = sanitizeText(data.customerNotes, 1000);
  }
  
  if (!Array.isArray(data.items) || data.items.length === 0) {
    errors.push('يجب إضافة منتج واحد على الأقل');
  } else {
    sanitized.items = data.items.slice(0, 50).map((item) => {
      const sanitizedItem: OrderItem = {
        id: sanitizeString(item.id, 100),
        name: sanitizeString(item.name, 200),
        price: Math.max(0, Number(item.price) || 0),
        quantity: Math.min(Math.max(1, parseInt(String(item.quantity), 10) || 1), 100),
      };
      
      if (item.selectedColor) {
        sanitizedItem.selectedColor = sanitizeString(item.selectedColor, 50);
      }
      if (item.selectedSize) {
        sanitizedItem.selectedSize = sanitizeString(item.selectedSize, 20);
      }
      if (item.image) {
        sanitizedItem.image = sanitizeUrl(item.image);
      }
      
      return sanitizedItem;
    });
  }
  
  if (!data.paymentMethodId) {
    errors.push('يجب اختيار طريقة الدفع');
  } else {
    sanitized.paymentMethodId = sanitizeString(data.paymentMethodId, 100);
  }
  
  if (data.receiptImage) {
    // receiptImage can be either a URL or base64 data URL
    if (typeof data.receiptImage === 'string') {
      if (data.receiptImage.startsWith('data:image/')) {
        // Base64 data URL - accept as is (will be stored directly or uploaded to R2)
        sanitized.receiptImage = data.receiptImage;
      } else {
        // Regular URL - validate it
        const receiptResult = validateUrl(data.receiptImage, 'صورة الإيصال');
        if (receiptResult.valid && receiptResult.value) {
          sanitized.receiptImage = receiptResult.value;
        }
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    data: sanitized,
  };
}

export function validateStoreInput(
  data: StoreInput,
  isUpdate = false
): ValidationResult<SanitizedStore> {
  const errors: string[] = [];
  const sanitized: SanitizedStore = {};
  
  if (data.name !== undefined || !isUpdate) {
    const nameResult = validateName(data.name, 'اسم المتجر');
    if (!nameResult.valid) errors.push(nameResult.error!);
    else sanitized.name = nameResult.value;
  }
  
  if (data.slug !== undefined || !isUpdate) {
    const slugResult = validateSlug(data.slug);
    if (!slugResult.valid) errors.push(slugResult.error!);
    else sanitized.slug = slugResult.value;
  }
  
  if (data.description !== undefined) {
    const rawDescription = typeof data.description === 'string' ? data.description.trim() : '';
    if (rawDescription.length > 300) errors.push('وصف المتجر طويل جداً (300 حرف كحد أقصى)');
    else sanitized.description = sanitizeString(rawDescription, 300);
  }

  if (data.whatsapp !== undefined) {
    const phoneResult = validatePhone(data.whatsapp, 'رقم الواتساب', false);
    if (!phoneResult.valid) errors.push(phoneResult.error!);
    else sanitized.whatsapp = phoneResult.value;
  }
  
  if (data.logo !== undefined) {
    const logoResult = validateUrl(data.logo, 'شعار المتجر', false);
    if (logoResult.valid) {
      sanitized.logo = logoResult.value;
    }
  }
  
  if (data.currency !== undefined) {
    sanitized.currency = sanitizeString(data.currency, 10).toUpperCase();
  }
  
  return {
    valid: errors.length === 0,
    errors,
    data: sanitized,
  };
}
