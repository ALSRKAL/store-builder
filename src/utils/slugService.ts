/**
 * SlugService - URL slug generation from Arabic store names
 * Uses API for slug existence check
 */

import { api } from '../services/api';

const ENGLISH_WORDS_MAP: Record<string, string> = {
  'ستور': 'store',
  'ستورز': 'stores',
  'شوب': 'shop',
  'شوبس': 'shops',
  'ماركت': 'market',
  'مارت': 'mart',
  'مول': 'mall',
  'بلازا': 'plaza',
  'سنتر': 'center',
  'سنترال': 'central',
  'هاوس': 'house',
  'بوتيك': 'boutique',
  'جاليري': 'gallery',
  'اوتلت': 'outlet',
  'ديبو': 'depot',
  'وير هاوس': 'warehouse',
  'تك': 'tech',
  'تكنو': 'techno',
  'ديجيتال': 'digital',
  'سمارت': 'smart',
  'موبايل': 'mobile',
  'فون': 'phone',
  'آيفون': 'iphone',
  'لابتوب': 'laptop',
  'كمبيوتر': 'computer',
  'سوفت': 'soft',
  'هارد': 'hard',
  'اونلاين': 'online',
  'ويب': 'web',
  'نت': 'net',
  'كلاود': 'cloud',
  'اب': 'app',
  'ابس': 'apps',
  'فاشن': 'fashion',
  'ستايل': 'style',
  'بيوتي': 'beauty',
  'كوزمتكس': 'cosmetics',
  'لوكس': 'lux',
  'لكجري': 'luxury',
  'برايم': 'prime',
  'كلاسيك': 'classic',
  'مودرن': 'modern',
  'ترند': 'trend',
  'تريندي': 'trendy',
  'شيك': 'chic',
  'فود': 'food',
  'فودز': 'foods',
  'كافيه': 'cafe',
  'كوفي': 'coffee',
  'بيكري': 'bakery',
  'سويتس': 'sweets',
  'فريش': 'fresh',
  'اورجانيك': 'organic',
  'جروب': 'group',
  'تيم': 'team',
  'كورب': 'corp',
  'كومباني': 'company',
  'اكسبرس': 'express',
  'فاست': 'fast',
  'كويك': 'quick',
  'سبيد': 'speed',
  'جولد': 'gold',
  'جولدن': 'golden',
  'سيلفر': 'silver',
  'دايموند': 'diamond',
  'بيج': 'big',
  'ميجا': 'mega',
  'سوبر': 'super',
  'الترا': 'ultra',
  'ماكس': 'max',
  'ميني': 'mini',
  'بلس': 'plus',
  'برو': 'pro',
  'نيو': 'new',
  'هوم': 'home',
  'فاميلي': 'family',
  'كيدز': 'kids',
};

const ARABIC_TO_ENGLISH_MAP: Record<string, string> = {
  'ا': 'a',
  'أ': 'a',
  'إ': 'e',
  'آ': 'aa',
  'ء': '',
  'ب': 'b',
  'ت': 't',
  'ث': 'th',
  'ج': 'j',
  'ح': 'h',
  'خ': 'kh',
  'د': 'd',
  'ذ': 'th',
  'ر': 'r',
  'ز': 'z',
  'س': 's',
  'ش': 'sh',
  'ص': 's',
  'ض': 'd',
  'ط': 't',
  'ظ': 'z',
  'ع': 'a',
  'غ': 'gh',
  'ف': 'f',
  'ق': 'q',
  'ك': 'k',
  'ل': 'l',
  'م': 'm',
  'ن': 'n',
  'ه': 'h',
  'و': 'w',
  'ي': 'y',
  'ى': 'a',
  'ة': 'h',
  'لا': 'la',
  'لأ': 'la',
  'لإ': 'le',
  'لآ': 'laa',
};

class SlugService {
  static replaceEnglishWords(text: string): string {
    if (!text) return '';
    let result = text;
    const sortedWords = Object.keys(ENGLISH_WORDS_MAP).sort(
      (a, b) => b.length - a.length
    );
    for (const arabicWord of sortedWords) {
      const englishWord = ENGLISH_WORDS_MAP[arabicWord];
      if (englishWord) {
        const regex = new RegExp(arabicWord, 'g');
        result = result.replace(regex, ` ${englishWord} `);
      }
    }
    return result.replace(/\s+/g, ' ').trim();
  }

  static transliterate(text: string): string {
    if (!text) return '';
    const processedText = this.replaceEnglishWords(text);
    let result = '';
    const chars = processedText.split('');
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      const nextChar = chars[i + 1];
      if (char === 'ل' && nextChar && ['ا', 'أ', 'إ', 'آ'].includes(nextChar)) {
        const combined = char + nextChar;
        const mappedCombined = ARABIC_TO_ENGLISH_MAP[combined];
        if (mappedCombined) {
          result += mappedCombined;
          i++;
          continue;
        }
      }
      if (char && Object.prototype.hasOwnProperty.call(ARABIC_TO_ENGLISH_MAP, char)) {
        result += ARABIC_TO_ENGLISH_MAP[char] ?? '';
      } else if (char && /[a-zA-Z0-9]/.test(char)) {
        result += char.toLowerCase();
      } else if (char === ' ' || char === '-' || char === '_') {
        result += '-';
      }
    }
    return result;
  }

  static formatSlug(text: string): string {
    if (!text) return '';
    return text
      .toLowerCase()
      .trim()
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/[^a-z0-9-]/g, '');
  }

  static generateBaseSlug(storeName: string): string {
    const transliterated = this.transliterate(storeName);
    return this.formatSlug(transliterated);
  }

  static async slugExists(slug: string): Promise<boolean> {
    try {
      const store = await api.public.getStore(slug);
      return Boolean(store);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('not found') || errorMessage.includes('404')) {
        return false;
      }
      console.error('Error checking slug existence:', error);
      return false;
    }
  }

  static async generateUniqueSlug(storeName: string): Promise<string> {
    const baseSlug = this.generateBaseSlug(storeName);
    if (!baseSlug) return this.generateUniqueSlug('store');
    let slug = baseSlug;
    let counter = 0;
    while (await this.slugExists(slug)) {
      counter++;
      slug = `${baseSlug}-${counter}`;
    }
    return slug;
  }

  static isValidSlug(slug: string | null | undefined): boolean {
    if (!slug || typeof slug !== 'string') return false;
    return /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug);
  }
}

export default SlugService;
