/**
 * Payment Providers Registry
 * سجل مزودي خدمات الدفع حسب الدولة
 * Type-safe implementation
 */

// Field validation interface
export interface FieldValidation {
  pattern: string;
  message: string;
}

// Select option interface
export interface SelectOption {
  value: string;
  label: string;
}

// Provider field interface
export interface ProviderField {
  key: string;
  label: string;
  labelEn: string;
  type: 'text' | 'tel' | 'select' | 'textarea';
  placeholder?: string;
  required: boolean;
  validation?: FieldValidation;
  options?: SelectOption[];
}

// Payment provider interface
export interface PaymentProvider {
  id: string;
  name: string;
  nameEn: string;
  type: 'wallet' | 'bank' | 'card' | 'cod' | 'qr';
  countries: string[];
  color: string;
  fields: ProviderField[];
}

// Country interface
export interface Country {
  code: string;
  name: string;
  nameEn: string;
  flag: string;
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// Payment providers registry
export const PAYMENT_PROVIDERS: Record<string, PaymentProvider> = {
  // ===== اليمن (YE) =====
  onecash: {
    id: 'onecash',
    name: 'ون كاش',
    nameEn: 'OneCash',
    type: 'wallet',
    countries: ['YE'],
    color: '#FF6B00',
    fields: [
      {
        key: 'phone',
        label: 'رقم المحفظة',
        labelEn: 'Wallet Number',
        type: 'tel',
        placeholder: '777123456',
        required: true,
        validation: {
          pattern: '^7[0-9]{8}$',
          message: 'يجب أن يبدأ الرقم بـ 7 ويتكون من 9 أرقام',
        },
      },
      {
        key: 'accountName',
        label: 'اسم صاحب الحساب',
        labelEn: 'Account Holder Name',
        type: 'text',
        placeholder: 'محمد أحمد',
        required: true,
      },
    ],
  },

  kurimi: {
    id: 'kurimi',
    name: 'كريمي',
    nameEn: 'Kurimi',
    type: 'wallet',
    countries: ['YE'],
    color: '#00A651',
    fields: [
      {
        key: 'phone',
        label: 'رقم المحفظة',
        labelEn: 'Wallet Number',
        type: 'tel',
        placeholder: '711123456',
        required: true,
        validation: {
          pattern: '^7[0-9]{8}$',
          message: 'يجب أن يبدأ الرقم بـ 7 ويتكون من 9 أرقام',
        },
      },
      {
        key: 'accountName',
        label: 'اسم صاحب الحساب',
        labelEn: 'Account Holder Name',
        type: 'text',
        placeholder: 'محمد أحمد',
        required: true,
      },
    ],
  },

  floosak: {
    id: 'floosak',
    name: 'فلوسك',
    nameEn: 'Floosak',
    type: 'wallet',
    countries: ['YE'],
    color: '#1E88E5',
    fields: [
      {
        key: 'phone',
        label: 'رقم المحفظة',
        labelEn: 'Wallet Number',
        type: 'tel',
        placeholder: '733123456',
        required: true,
        validation: {
          pattern: '^7[0-9]{8}$',
          message: 'يجب أن يبدأ الرقم بـ 7 ويتكون من 9 أرقام',
        },
      },
      {
        key: 'accountName',
        label: 'اسم صاحب الحساب',
        labelEn: 'Account Holder Name',
        type: 'text',
        placeholder: 'محمد أحمد',
        required: true,
      },
    ],
  },

  jawal_pay: {
    id: 'jawal_pay',
    name: 'جوال باي',
    nameEn: 'Jawal Pay',
    type: 'wallet',
    countries: ['YE'],
    color: '#9C27B0',
    fields: [
      {
        key: 'phone',
        label: 'رقم المحفظة',
        labelEn: 'Wallet Number',
        type: 'tel',
        placeholder: '770123456',
        required: true,
        validation: {
          pattern: '^7[0-9]{8}$',
          message: 'يجب أن يبدأ الرقم بـ 7 ويتكون من 9 أرقام',
        },
      },
      {
        key: 'accountName',
        label: 'اسم صاحب الحساب',
        labelEn: 'Account Holder Name',
        type: 'text',
        placeholder: 'محمد أحمد',
        required: true,
      },
    ],
  },

  jeeb: {
    id: 'jeeb',
    name: 'جيب',
    nameEn: 'Jeeb',
    type: 'wallet',
    countries: ['YE'],
    color: '#00C853',
    fields: [
      {
        key: 'phone',
        label: 'رقم المحفظة',
        labelEn: 'Wallet Number',
        type: 'tel',
        placeholder: '77xxxxxxx',
        required: true,
        validation: {
          pattern: '^7[0-9]{8}$',
          message: 'يجب أن يبدأ الرقم بـ 7 ويتكون من 9 أرقام',
        },
      },
      {
        key: 'accountName',
        label: 'اسم صاحب الحساب',
        labelEn: 'Account Holder Name',
        type: 'text',
        placeholder: 'محمد أحمد',
        required: true,
      },
    ],
  },

  saba_cash: {
    id: 'saba_cash',
    name: 'سبأ كاش',
    nameEn: 'Saba Cash',
    type: 'wallet',
    countries: ['YE'],
    color: '#0066CC',
    fields: [
      {
        key: 'phone',
        label: 'رقم المحفظة',
        labelEn: 'Wallet Number',
        type: 'tel',
        placeholder: '77xxxxxxx',
        required: true,
        validation: {
          pattern: '^7[0-9]{8}$',
          message: 'يجب أن يبدأ الرقم بـ 7 ويتكون من 9 أرقام',
        },
      },
      {
        key: 'accountName',
        label: 'اسم صاحب الحساب',
        labelEn: 'Account Holder Name',
        type: 'text',
        placeholder: 'محمد أحمد',
        required: true,
      },
    ],
  },

  bank_transfer_ye: {
    id: 'bank_transfer_ye',
    name: 'تحويل بنكي',
    nameEn: 'Bank Transfer',
    type: 'bank',
    countries: ['YE'],
    color: '#2E7D32',
    fields: [
      {
        key: 'bankName',
        label: 'اسم البنك',
        labelEn: 'Bank Name',
        type: 'select',
        options: [
          { value: 'cac', label: 'كاك بنك' },
          { value: 'yemeni_bank', label: 'البنك اليمني للإنشاء والتعمير' },
          { value: 'tadhamon', label: 'بنك التضامن' },
          { value: 'shamil', label: 'بنك الشامل' },
          { value: 'alkuraimi', label: 'بنك الكريمي' },
          { value: 'other', label: 'بنك آخر' },
        ],
        required: true,
      },
      {
        key: 'accountNumber',
        label: 'رقم الحساب',
        labelEn: 'Account Number',
        type: 'text',
        placeholder: 'رقم الحساب البنكي',
        required: true,
      },
      {
        key: 'accountName',
        label: 'اسم صاحب الحساب',
        labelEn: 'Account Holder Name',
        type: 'text',
        placeholder: 'محمد أحمد',
        required: true,
      },
    ],
  },

  // ===== السعودية (SA) =====
  stc_pay: {
    id: 'stc_pay',
    name: 'STC Pay',
    nameEn: 'STC Pay',
    type: 'wallet',
    countries: ['SA'],
    color: '#4F2D7F',
    fields: [
      {
        key: 'phone',
        label: 'رقم الجوال',
        labelEn: 'Phone Number',
        type: 'tel',
        placeholder: '05xxxxxxxx',
        required: true,
        validation: {
          pattern: '^05[0-9]{8}$',
          message: 'يجب أن يبدأ الرقم بـ 05 ويتكون من 10 أرقام',
        },
      },
    ],
  },

  bank_transfer_sa: {
    id: 'bank_transfer_sa',
    name: 'تحويل بنكي',
    nameEn: 'Bank Transfer',
    type: 'bank',
    countries: ['SA'],
    color: '#2E7D32',
    fields: [
      {
        key: 'bankName',
        label: 'اسم البنك',
        labelEn: 'Bank Name',
        type: 'select',
        options: [
          { value: 'alrajhi', label: 'الراجحي' },
          { value: 'alinma', label: 'الإنماء' },
          { value: 'alahli', label: 'الأهلي' },
          { value: 'riyad', label: 'الرياض' },
          { value: 'sab', label: 'ساب' },
          { value: 'other', label: 'بنك آخر' },
        ],
        required: true,
      },
      {
        key: 'iban',
        label: 'رقم الآيبان',
        labelEn: 'IBAN',
        type: 'text',
        placeholder: 'SA...',
        required: true,
        validation: {
          pattern: '^SA[0-9]{22}$',
          message: 'يجب أن يبدأ الآيبان بـ SA ويتكون من 24 حرف',
        },
      },
      {
        key: 'accountName',
        label: 'اسم صاحب الحساب',
        labelEn: 'Account Holder Name',
        type: 'text',
        placeholder: 'محمد أحمد',
        required: true,
      },
    ],
  },

  // ===== الإمارات (AE) =====
  bank_transfer_ae: {
    id: 'bank_transfer_ae',
    name: 'تحويل بنكي',
    nameEn: 'Bank Transfer',
    type: 'bank',
    countries: ['AE'],
    color: '#2E7D32',
    fields: [
      {
        key: 'bankName',
        label: 'اسم البنك',
        labelEn: 'Bank Name',
        type: 'text',
        placeholder: 'بنك أبوظبي الأول',
        required: true,
      },
      {
        key: 'iban',
        label: 'رقم الآيبان',
        labelEn: 'IBAN',
        type: 'text',
        placeholder: 'AE...',
        required: true,
        validation: {
          pattern: '^AE[0-9]{21}$',
          message: 'يجب أن يبدأ الآيبان بـ AE ويتكون من 23 حرف',
        },
      },
      {
        key: 'accountName',
        label: 'اسم صاحب الحساب',
        labelEn: 'Account Holder Name',
        type: 'text',
        placeholder: 'محمد أحمد',
        required: true,
      },
    ],
  },

  // ===== مصر (EG) =====
  vodafone_cash: {
    id: 'vodafone_cash',
    name: 'فودافون كاش',
    nameEn: 'Vodafone Cash',
    type: 'wallet',
    countries: ['EG'],
    color: '#E60000',
    fields: [
      {
        key: 'phone',
        label: 'رقم المحفظة',
        labelEn: 'Wallet Number',
        type: 'tel',
        placeholder: '01xxxxxxxxx',
        required: true,
        validation: {
          pattern: '^01[0-9]{9}$',
          message: 'يجب أن يبدأ الرقم بـ 01 ويتكون من 11 رقم',
        },
      },
    ],
  },

  instapay_eg: {
    id: 'instapay_eg',
    name: 'انستاباي',
    nameEn: 'InstaPay',
    type: 'wallet',
    countries: ['EG'],
    color: '#FF5722',
    fields: [
      {
        key: 'phone',
        label: 'رقم الهاتف',
        labelEn: 'Phone Number',
        type: 'tel',
        placeholder: '01xxxxxxxxx',
        required: true,
        validation: {
          pattern: '^01[0-9]{9}$',
          message: 'يجب أن يبدأ الرقم بـ 01 ويتكون من 11 رقم',
        },
      },
      {
        key: 'accountName',
        label: 'اسم صاحب الحساب',
        labelEn: 'Account Holder Name',
        type: 'text',
        placeholder: 'محمد أحمد',
        required: true,
      },
    ],
  },

  // ===== عام (جميع الدول) =====
  cod: {
    id: 'cod',
    name: 'الدفع عند الاستلام',
    nameEn: 'Cash on Delivery',
    type: 'cod',
    countries: ['*'],
    color: '#4CAF50',
    fields: [
      {
        key: 'instructions',
        label: 'تعليمات للعميل',
        labelEn: 'Instructions for Customer',
        type: 'textarea',
        placeholder: 'يرجى تجهيز المبلغ المطلوب عند الاستلام',
        required: false,
      },
    ],
  },

  custom_qr: {
    id: 'custom_qr',
    name: 'دفع بـ QR Code',
    nameEn: 'QR Code Payment',
    type: 'qr',
    countries: ['*'],
    color: '#7C3AED',
    fields: [
      {
        key: 'walletName',
        label: 'اسم المحفظة/التطبيق',
        labelEn: 'Wallet/App Name',
        type: 'text',
        placeholder: 'مثال: محفظة جيب، STC Pay',
        required: true,
      },
      {
        key: 'accountName',
        label: 'اسم صاحب الحساب',
        labelEn: 'Account Holder Name',
        type: 'text',
        placeholder: 'محمد أحمد',
        required: false,
      },
      {
        key: 'instructions',
        label: 'تعليمات للعميل',
        labelEn: 'Instructions for Customer',
        type: 'textarea',
        placeholder: 'امسح الكود وأرسل المبلغ المطلوب',
        required: false,
      },
    ],
  },
};


// قائمة الدول المدعومة
export const SUPPORTED_COUNTRIES: Country[] = [
  { code: 'YE', name: 'اليمن', nameEn: 'Yemen', flag: '🇾🇪' },
  { code: 'SA', name: 'السعودية', nameEn: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'AE', name: 'الإمارات', nameEn: 'UAE', flag: '🇦🇪' },
  { code: 'EG', name: 'مصر', nameEn: 'Egypt', flag: '🇪🇬' },
  { code: 'KW', name: 'الكويت', nameEn: 'Kuwait', flag: '🇰🇼' },
  { code: 'QA', name: 'قطر', nameEn: 'Qatar', flag: '🇶🇦' },
  { code: 'BH', name: 'البحرين', nameEn: 'Bahrain', flag: '🇧🇭' },
  { code: 'OM', name: 'عُمان', nameEn: 'Oman', flag: '🇴🇲' },
  { code: 'JO', name: 'الأردن', nameEn: 'Jordan', flag: '🇯🇴' },
  { code: 'LB', name: 'لبنان', nameEn: 'Lebanon', flag: '🇱🇧' },
  { code: 'IQ', name: 'العراق', nameEn: 'Iraq', flag: '🇮🇶' },
  { code: 'SY', name: 'سوريا', nameEn: 'Syria', flag: '🇸🇾' },
  { code: 'PS', name: 'فلسطين', nameEn: 'Palestine', flag: '🇵🇸' },
  { code: 'SD', name: 'السودان', nameEn: 'Sudan', flag: '🇸🇩' },
  { code: 'LY', name: 'ليبيا', nameEn: 'Libya', flag: '🇱🇾' },
  { code: 'TN', name: 'تونس', nameEn: 'Tunisia', flag: '🇹🇳' },
  { code: 'DZ', name: 'الجزائر', nameEn: 'Algeria', flag: '🇩🇿' },
  { code: 'MA', name: 'المغرب', nameEn: 'Morocco', flag: '🇲🇦' },
];

/**
 * الحصول على مزودي الدفع حسب الدولة
 */
export function getProvidersByCountry(countryCode: string): PaymentProvider[] {
  return Object.values(PAYMENT_PROVIDERS).filter(
    (provider) => provider.countries.includes(countryCode) || provider.countries.includes('*')
  );
}

/**
 * الحصول على مزود دفع بالمعرف
 */
export function getProviderById(providerId: string | null | undefined): PaymentProvider | null {
  if (!providerId) return null;
  return PAYMENT_PROVIDERS[providerId] ?? null;
}

/**
 * الحصول على معلومات الدولة
 */
export function getCountryByCode(code: string): Country | null {
  return SUPPORTED_COUNTRIES.find((c) => c.code === code) ?? null;
}

/**
 * التحقق من صحة بيانات الإعدادات
 */
export function validateProviderConfig(
  providerId: string,
  config: Record<string, string>
): ValidationResult {
  const provider = getProviderById(providerId);
  if (!provider) {
    return { valid: false, errors: ['مزود الدفع غير موجود'] };
  }

  const errors: string[] = [];

  for (const field of provider.fields) {
    const value = config[field.key];

    // التحقق من الحقول المطلوبة
    if (field.required && (!value || value.trim() === '')) {
      errors.push(`${field.label} مطلوب`);
      continue;
    }

    // التحقق من النمط (pattern)
    if (value && field.validation?.pattern) {
      const regex = new RegExp(field.validation.pattern);
      if (!regex.test(value)) {
        errors.push(field.validation.message || `${field.label} غير صالح`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default PAYMENT_PROVIDERS;
