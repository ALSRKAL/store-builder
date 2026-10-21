/**
 * Color Utilities
 * أداة تحويل الألوان من HEX إلى أسماء عربية
 */

// RGB interface
interface RGB {
  r: number;
  g: number;
  b: number;
}

// Color display interface
export interface ColorDisplay {
  hex: string;
  name: string;
}

// قاموس الألوان الأساسية
const COLOR_NAMES: Record<string, string> = {
  '#000000': 'أسود',
  '#ffffff': 'أبيض',
  '#ff0000': 'أحمر',
  '#00ff00': 'أخضر فاتح',
  '#0000ff': 'أزرق',
  '#ffff00': 'أصفر',
  '#ff00ff': 'فوشي',
  '#00ffff': 'سماوي',
  '#ffa500': 'برتقالي',
  '#800080': 'بنفسجي',
  '#ffc0cb': 'وردي',
  '#a52a2a': 'بني',
  '#808080': 'رمادي',
  '#c0c0c0': 'فضي',
  '#ffd700': 'ذهبي',
  '#000080': 'كحلي',
  '#008000': 'أخضر',
  '#f5f5dc': 'بيج',
  '#d2691e': 'شوكولاتة',
  '#dc143c': 'قرمزي',
  '#ff6347': 'طماطمي',
  '#4169e1': 'أزرق ملكي',
  '#2e8b57': 'أخضر بحري',
  '#daa520': 'ذهبي داكن',
  '#b22222': 'أحمر ناري',
  '#228b22': 'أخضر غابي',
  '#ff69b4': 'وردي ساخن',
  '#cd853f': 'بيرو',
  '#8b4513': 'بني سرج',
  '#f0e68c': 'كاكي',
};

/**
 * تحويل HEX إلى RGB
 */
function hexToRgb(hex: string): RGB | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1] ?? '0', 16),
        g: parseInt(result[2] ?? '0', 16),
        b: parseInt(result[3] ?? '0', 16),
      }
    : null;
}

/**
 * حساب المسافة بين لونين
 */
function colorDistance(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return Infinity;

  return Math.sqrt(
    Math.pow(rgb1.r - rgb2.r, 2) +
      Math.pow(rgb1.g - rgb2.g, 2) +
      Math.pow(rgb1.b - rgb2.b, 2)
  );
}

/**
 * الحصول على اسم اللون العربي من قيمة HEX
 * @param hex - قيمة اللون بصيغة HEX
 * @returns اسم اللون بالعربية
 */
export function getColorName(hex: string | null | undefined): string {
  if (!hex) return '';

  const normalizedHex = hex.toLowerCase();

  // البحث عن تطابق مباشر
  const directMatch = COLOR_NAMES[normalizedHex];
  if (directMatch) {
    return directMatch;
  }

  // البحث عن أقرب لون
  let closestColor: string | null = null;
  let minDistance = Infinity;

  for (const [colorHex, colorName] of Object.entries(COLOR_NAMES)) {
    const distance = colorDistance(normalizedHex, colorHex);
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = colorName;
    }
  }

  // إذا كانت المسافة كبيرة جداً، أرجع وصف اللون
  if (minDistance > 100) {
    return `لون مخصص (${hex})`;
  }

  return closestColor ?? hex;
}

/**
 * تنسيق اللون للعرض (اسم + مربع لوني)
 */
export function formatColorDisplay(hex: string): ColorDisplay {
  const name = getColorName(hex);
  return { hex, name };
}

export default { getColorName, formatColorDisplay };
