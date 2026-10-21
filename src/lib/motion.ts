/**
 * Motion Tokens
 *
 * مصدر واحد للأزمنة والمنحنيات والـ variants. قبل هذا الملف كانت الأزمنة
 * مكتوبة يدوياً في كل مكوّن (0.15 / 0.2 / 0.22 / 0.25 / 0.3 / 0.35 / 0.5)
 * بلا منحنيات محدّدة، فتباينت الحركة بين الشاشات.
 *
 * لا تكتب `duration` أو `ease` عددياً داخل أي مكوّن — استخدم هذه القيم.
 *
 * احترام "تقليل الحركة": نُفعّل <MotionConfig reducedMotion="user"> في جذر
 * التطبيق (App.tsx)، فيتكفّل framer-motion بتعطيل حركات الـ JS لمستخدمي
 * prefers-reduced-motion. لهذا تجنّب الأزمنة اليدوية واستخدم الـ variants.
 */

import type { Transition, Variants } from 'framer-motion';

/* ===== الأزمنة (بالثواني لأن framer-motion يستخدمها كذلك) ===== */
export const duration = {
  instant: 0.1,
  fast: 0.15,
  base: 0.2,
  medium: 0.3,
  slow: 0.4,
} as const;

/* ===== منحنيات التسارع ===== */
export const ease = {
  /** افتراضي للظهور: يبدأ سريعاً ويهدأ (الإحساس الأكثر طبيعية) */
  out: [0.16, 1, 0.3, 1] as [number, number, number, number],
  /** للحركات المتناوبة/المرتدّة */
  inOut: [0.4, 0, 0.2, 1] as [number, number, number, number],
  /** للحركة الخطية (تقدّم، شرائط) */
  linear: 'linear' as const,
} as const;

/* ===== انتقالات جاهزة ===== */
export const transition = {
  fast: { duration: duration.fast, ease: ease.out } satisfies Transition,
  base: { duration: duration.base, ease: ease.out } satisfies Transition,
  medium: { duration: duration.medium, ease: ease.out } satisfies Transition,
  /** نوافذ: نابض خفيف يعطي إحساساً ملموساً دون مبالغة */
  modal: { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 } satisfies Transition,
  /** أدراج: بلا نابض حتى لا تهتزّ الحواف عند توقّفها */
  sheet: { type: 'tween', duration: duration.medium, ease: ease.out } satisfies Transition,
} as const;

/* ===== Variants قياسية ===== */

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transition.base },
  exit: { opacity: 0, transition: transition.fast },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: transition.medium },
  exit: { opacity: 0, y: 8, transition: transition.fast },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: transition.modal },
  exit: { opacity: 0, scale: 0.98, y: 4, transition: transition.fast },
};

/** خلفية معتمة خلف أي overlay */
export const overlay: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transition.base },
  exit: { opacity: 0, transition: transition.fast },
};

export type SheetSide = 'end' | 'start' | 'bottom';

/**
 * variants الدرج/اللوحة الجانبية مع اتجاه صحيح للـ RTL.
 *
 * `side` منطقي (end/start) لا فيزيائي، لأن الواجهة عربية RTL:
 *   - end   → في RTL يقع على اليسار، فالدخول من اليسار
 *   - start → في RTL يقع على اليمين، فالدخول من اليمين
 * تمرير `isRTL = false` يعكس الاتجاه تلقائياً.
 */
export function sheetVariants(side: SheetSide, isRTL: boolean): Variants {
  if (side === 'bottom') {
    return {
      hidden: { y: '100%' },
      visible: { y: 0, transition: transition.sheet },
      exit: { y: '100%', transition: transition.sheet },
    };
  }
  // في RTL: end يقع على يسار الشاشة ⇒ يدخل بإزاحة سالبة
  const entersFromNegativeX = isRTL ? side === 'end' : side === 'start';
  const offset = entersFromNegativeX ? '-100%' : '100%';
  return {
    hidden: { x: offset },
    visible: { x: 0, transition: transition.sheet },
    exit: { x: offset, transition: transition.sheet },
  };
}

/** حاوية قائمة/شبكة مع ظهور متتالٍ للعناصر */
export function staggerContainer(stagger = 0.04, delayChildren = 0): Variants {
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren: stagger, delayChildren },
    },
  };
}

export const listItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: transition.base },
  exit: { opacity: 0, y: -4, transition: transition.fast },
};