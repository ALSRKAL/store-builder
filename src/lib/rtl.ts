/**
 * RTL Helpers
 *
 * الواجهة عربية RTL (`<html lang="ar" dir="rtl">`)، لكن بعض قيم framer-motion
 * و Radix تحتاج اتجاهاً صريحاً لأنها تعمل بقيم فيزيائية لا منطقية.
 *
 * القاعدة: في Tailwind استخدم دائماً `start-*` / `end-*` / `ms-*` / `me-*`
 * / `ps-*` / `pe-*` — ولا تستخدم `left-*` / `right-*` إلا عند التعامل مع
 * مكتبة خارجية لا تفهم الخصائص المنطقية.
 */

import { useEffect, useState } from 'react';

/** يقرأ اتجاه الصفحة الحالي من <html dir>. */
export function getDir(): 'rtl' | 'ltr' {
  if (typeof document === 'undefined') return 'rtl';
  return document.documentElement.getAttribute('dir') === 'ltr' ? 'ltr' : 'rtl';
}

export function getIsRTL(): boolean {
  return getDir() === 'rtl';
}

/**
 * يرجع true عندما تكون الواجهة RTL. يبقى متزامناً لو تغيّر `dir` لاحقاً
 * (مثلاً مبدّل لغة مستقبلي).
 */
export function useIsRTL(): boolean {
  const [isRTL, setIsRTL] = useState<boolean>(() => getIsRTL());

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsRTL(root.getAttribute('dir') !== 'ltr');

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['dir'] });
    return () => observer.disconnect();
  }, []);

  return isRTL;
}

/** خصائص جاهزة تُمرَّر لمكوّنات Radix التي تحتاج اتجاهاً صريحاً. */
export function dirProps(): { dir: 'rtl' | 'ltr' } {
  return { dir: getDir() };
}