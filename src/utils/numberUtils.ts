/**
 * Number Utilities
 * تحويل الأرقام العربية والفارسية إلى إنجليزية
 */

const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const persianNumerals = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const englishNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * تحويل الأرقام العربية/الفارسية إلى إنجليزية
 * @param str - النص المراد تحويله
 * @returns النص بعد التحويل
 */
export function toEnglishNumbers(str: string | null | undefined): string {
  if (!str) return '';

  let result = String(str);

  // تحويل الأرقام العربية
  for (let i = 0; i < 10; i++) {
    const arabicNum = arabicNumerals[i];
    const englishNum = englishNumerals[i];
    if (arabicNum && englishNum) {
      result = result.replace(new RegExp(arabicNum, 'g'), englishNum);
    }
  }

  // تحويل الأرقام الفارسية
  for (let i = 0; i < 10; i++) {
    const persianNum = persianNumerals[i];
    const englishNum = englishNumerals[i];
    if (persianNum && englishNum) {
      result = result.replace(new RegExp(persianNum, 'g'), englishNum);
    }
  }

  return result;
}

/**
 * تحويل الأرقام الإنجليزية إلى عربية (للعرض فقط)
 * @param str - النص أو الرقم المراد تحويله
 * @returns النص بالأرقام العربية
 */
export function toArabicNumbers(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';

  let result = String(str);

  for (let i = 0; i < 10; i++) {
    const englishNum = englishNumerals[i];
    const arabicNum = arabicNumerals[i];
    if (englishNum && arabicNum) {
      result = result.replace(new RegExp(englishNum, 'g'), arabicNum);
    }
  }

  return result;
}

/**
 * تحويل وتنظيف رقم للاستخدام في الحسابات
 * @param value - القيمة المدخلة
 * @returns الرقم بعد التحويل
 */
export function parseNumber(value: string | number | null | undefined): number {
  if (!value) return 0;
  const converted = toEnglishNumbers(String(value))
    // الفاصلة العربية العشرية «٫» كانت تُحذف فتصبح 12٫5 → 125.
    .replace(/٫/g, '.')
    // فواصل الآلاف العربية/الإنجليزية.
    .replace(/[٬,]/g, '');
  const cleaned = converted.replace(/[^\d.]/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * تحويل وتنظيف رقم صحيح
 * @param value - القيمة المدخلة
 * @returns الرقم الصحيح بعد التحويل
 */
export function parseInteger(value: string | number | null | undefined): number {
  if (!value) return 0;
  const converted = toEnglishNumbers(String(value));
  const cleaned = converted.replace(/[^\d]/g, '');
  return parseInt(cleaned, 10) || 0;
}

/**
 * معالج للـ input يحول الأرقام تلقائياً
 * @param e - حدث الإدخال
 * @param setter - دالة تحديث القيمة
 * @param allowDecimal - السماح بالأرقام العشرية
 */
export function handleNumberInput(
  e: React.ChangeEvent<HTMLInputElement>,
  setter: (value: string) => void,
  allowDecimal = true
): void {
  let value = toEnglishNumbers(e.target.value)
    .replace(/٫/g, '.')
    .replace(/[٬,]/g, '');

  // إزالة الأحرف غير المسموحة
  if (allowDecimal) {
    value = value.replace(/[^\d.]/g, '');
    // السماح بنقطة عشرية واحدة فقط
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
  } else {
    value = value.replace(/[^\d]/g, '');
  }

  setter(value);
}

export default {
  toEnglishNumbers,
  toArabicNumbers,
  parseNumber,
  parseInteger,
  handleNumberInput,
};
