/**
 * Currencies Data
 * قائمة العملات حسب الدول العربية
 */

// Currency interface
export interface Currency {
  code: string;
  name: string;
  symbol: string;
  country: string;
  flag: string;
  rateToUSD: number;
}

// أسعار الصرف مقابل الدولار الأمريكي (تقريبية - ديسمبر 2024)
export const CURRENCIES: Currency[] = [
  { code: 'YER', name: 'ريال يمني', symbol: 'ر.ي', country: 'اليمن', flag: '🇾🇪', rateToUSD: 250 },
  { code: 'SAR', name: 'ريال سعودي', symbol: 'ر.س', country: 'السعودية', flag: '🇸🇦', rateToUSD: 3.75 },
  { code: 'AED', name: 'درهم إماراتي', symbol: 'د.إ', country: 'الإمارات', flag: '🇦🇪', rateToUSD: 3.67 },
  { code: 'KWD', name: 'دينار كويتي', symbol: 'د.ك', country: 'الكويت', flag: '🇰🇼', rateToUSD: 0.31 },
  { code: 'BHD', name: 'دينار بحريني', symbol: 'د.ب', country: 'البحرين', flag: '🇧🇭', rateToUSD: 0.38 },
  { code: 'OMR', name: 'ريال عماني', symbol: 'ر.ع', country: 'عمان', flag: '🇴🇲', rateToUSD: 0.38 },
  { code: 'QAR', name: 'ريال قطري', symbol: 'ر.ق', country: 'قطر', flag: '🇶🇦', rateToUSD: 3.64 },
  { code: 'EGP', name: 'جنيه مصري', symbol: 'ج.م', country: 'مصر', flag: '🇪🇬', rateToUSD: 50 },
  { code: 'JOD', name: 'دينار أردني', symbol: 'د.أ', country: 'الأردن', flag: '🇯🇴', rateToUSD: 0.71 },
  { code: 'LBP', name: 'ليرة لبنانية', symbol: 'ل.ل', country: 'لبنان', flag: '🇱🇧', rateToUSD: 89500 },
  { code: 'IQD', name: 'دينار عراقي', symbol: 'د.ع', country: 'العراق', flag: '🇮🇶', rateToUSD: 1310 },
  { code: 'SYP', name: 'ليرة سورية', symbol: 'ل.س', country: 'سوريا', flag: '🇸🇾', rateToUSD: 13000 },
  { code: 'ILS', name: 'شيكل', symbol: '₪', country: 'فلسطين', flag: '🇵🇸', rateToUSD: 3.7 },
  { code: 'LYD', name: 'دينار ليبي', symbol: 'د.ل', country: 'ليبيا', flag: '🇱🇾', rateToUSD: 4.85 },
  { code: 'SDG', name: 'جنيه سوداني', symbol: 'ج.س', country: 'السودان', flag: '🇸🇩', rateToUSD: 600 },
  { code: 'MAD', name: 'درهم مغربي', symbol: 'د.م', country: 'المغرب', flag: '🇲🇦', rateToUSD: 10 },
  { code: 'TND', name: 'دينار تونسي', symbol: 'د.ت', country: 'تونس', flag: '🇹🇳', rateToUSD: 3.1 },
  { code: 'DZD', name: 'دينار جزائري', symbol: 'د.ج', country: 'الجزائر', flag: '🇩🇿', rateToUSD: 135 },
  { code: 'MRU', name: 'أوقية موريتانية', symbol: 'أ.م', country: 'موريتانيا', flag: '🇲🇷', rateToUSD: 40 },
  { code: 'DJF', name: 'فرنك جيبوتي', symbol: 'ف.ج', country: 'جيبوتي', flag: '🇩🇯', rateToUSD: 178 },
  { code: 'SOS', name: 'شلن صومالي', symbol: 'ش.ص', country: 'الصومال', flag: '🇸🇴', rateToUSD: 571 },
  { code: 'KMF', name: 'فرنك قمري', symbol: 'ف.ق', country: 'جزر القمر', flag: '🇰🇲', rateToUSD: 450 },
  { code: 'TRY', name: 'ليرة تركية', symbol: '₺', country: 'تركيا', flag: '🇹🇷', rateToUSD: 34 },
  { code: 'USD', name: 'دولار أمريكي', symbol: '$', country: 'دولي', flag: '🇺🇸', rateToUSD: 1 },
  { code: 'EUR', name: 'يورو', symbol: '€', country: 'أوروبا', flag: '🇪🇺', rateToUSD: 0.92 },
];

// العملة الافتراضية
export const DEFAULT_CURRENCY: Currency = CURRENCIES.find((c) => c.code === 'SAR') ?? CURRENCIES[0]!;

// الحصول على العملة بالكود
export function getCurrencyByCode(code: string): Currency {
  return CURRENCIES.find((c) => c.code === code) ?? DEFAULT_CURRENCY;
}

// تحويل السعر من عملة إلى أخرى
export function convertPrice(
  amount: number,
  fromCurrency = 'SAR',
  toCurrency = 'SAR'
): number {
  if (fromCurrency === toCurrency) return amount;

  const from = getCurrencyByCode(fromCurrency);
  const to = getCurrencyByCode(toCurrency);

  // تحويل إلى دولار أولاً ثم إلى العملة المطلوبة
  const amountInUSD = amount / from.rateToUSD;
  const convertedAmount = amountInUSD * to.rateToUSD;

  // تقريب ذكي حسب قيمة العملة
  if (to.rateToUSD > 100) {
    // عملات ذات قيمة منخفضة (مثل الريال اليمني، الليرة اللبنانية)
    return Math.round(convertedAmount / 100) * 100;
  } else if (to.rateToUSD > 10) {
    // عملات متوسطة
    return Math.round(convertedAmount / 10) * 10;
  } else if (to.rateToUSD > 1) {
    // عملات قوية نسبياً
    return Math.round(convertedAmount);
  } else {
    // عملات قوية جداً (دينار كويتي، بحريني، إلخ)
    return Math.round(convertedAmount * 10) / 10;
  }
}

// تنسيق السعر مع العملة
export function formatPrice(price: number, currencyCode = 'SAR'): string {
  const currency = getCurrencyByCode(currencyCode);
  // أرقام لاتينية داخل النص العربي: أوضح للقراءة وتطابق بقية العدّادات
  // (`tabular-nums`)، بعد أن كانت ar-SA تعرض ٨٩٩.
  // 3 منازل تغطي الدينار الكويتي/البحريني/العماني والأردني وغيرها؛
  // minimumFractionDigits=0 حتى لا تظهر أصفار زائدة للعملات ذات المنزلتين.
  const formattedNumber = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 3,
    minimumFractionDigits: 0,
  }).format(price);
  return `${formattedNumber} ${currency.symbol}`;
}

// تنسيق السعر المحول (من SAR إلى العملة المحددة)
export function formatConvertedPrice(priceInSAR: number, toCurrencyCode = 'SAR'): string {
  const convertedPrice = convertPrice(priceInSAR, 'SAR', toCurrencyCode);
  return formatPrice(convertedPrice, toCurrencyCode);
}
