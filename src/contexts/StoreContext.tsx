/**
 * StoreContext — بيانات المتجر العام عبر TanStack Query.
 *
 * المشكلة قبل هذا الملف: `setInterval` كل 5 ثوانٍ يعيد جلب المتجر والمنتجات
 * والتصنيفات، وأي فشل شبكة عابر كان يُنفّذ `setStore(null)` فيسقط المتجر إلى
 * شاشة "المتجر غير موجود" رغم أن البيانات معروضة بالفعل.
 *
 * الآن:
 *   - لا polling. Socket للقراءة فقط يحمل revisions، والتحديث يعيد جلب
 *     الموارد المتغيرة فقط دون إعادة تركيب السلة أو صفحة الدفع.
 *   - عند فشل التحديث تبقى آخر بيانات ناجحة معروضة؛ لا 404 كاذب.
 *   - نميّز "غير موجود" (فشل أولي نهائي) عن "خطأ شبكة" لتعرض الشاشة إعادة
 *     محاولة بدل رسالة 404.
 *   - ثيم التاجر يُعاد إلى القيم الافتراضية عند مغادرة المتجر، فلا تتسرّب
 *     ألوان تاجر إلى تاجر آخر أو إلى لوحة التحكم.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { demoStore, demoProducts, demoCategories } from '../data/demoData';
import { applyTheme, defaultTheme, resetTheme } from '../utils/themeUtils';
import { withDerivedPrices } from '../utils/productUtils';
import {
  getCurrencyByCode,
  formatPrice as formatPriceUtil,
  DEFAULT_CURRENCY,
  type Currency,
} from '../data/currencies';
import { usePublicCategories, usePublicProducts, usePublicStore } from '../hooks/usePublicStore';
import { useStoreRealtime } from '../hooks/useStoreRealtime';
import type { Store, Product, Category } from '../schemas';

interface StoreContextValue {
  store: Store | null;
  products: Product[];
  categories: Category[];
  loading: boolean;
  /** ما زالت قائمة المنتجات تُجلب (نميّزها عن متجر بلا منتجات فعلاً). */
  productsLoading: boolean;
  /** فشل شبكة/خادم مع عدم وجود بيانات سابقة. */
  error: Error | null;
  /** فشل أولي يعني أن المتجر غير موجود فعلاً (وليس خطأ عابراً). */
  notFound: boolean;
  /** فشل جلب المنتجات مع عدم وجود بيانات سابقة. */
  productsError: Error | null;
  isStoreActive: boolean;
  currency: Currency;
  formatPrice: (price: number) => string;
  refreshData: () => Promise<void>;
  lastFetch: Date | null;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

export function useStore(): StoreContextValue {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
}

interface StoreProviderProps {
  children: ReactNode;
  storeId?: string;
}

function isNotFoundError(error: Error | null): boolean {
  if (!error) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('not found') ||
    message.includes('غير موجود') ||
    message.includes('404') ||
    message.includes('not_found')
  );
}

export function StoreProvider({ children, storeId }: StoreProviderProps): React.JSX.Element {
  const isDemo = storeId === 'demo';
  const slug = isDemo ? undefined : storeId;

  const storeQuery = usePublicStore(slug);
  const productsQuery = usePublicProducts(slug);
  const categoriesQuery = usePublicCategories(slug);

  const realtime = useStoreRealtime(slug);
  // A confirmed deletion must hide stale successful data; network errors must not.
  const deleted = realtime?.deleted === true || (storeQuery.isError && isNotFoundError(storeQuery.error));
  const publicStore = useMemo(() => !deleted && storeQuery.data ? {
    ...storeQuery.data,
    ...(realtime?.storeId === storeQuery.data.id ? {
      isActive: realtime.isActive, isAnnualPlan: realtime.isAnnualPlan,
    } : {}),
  } : null, [deleted, storeQuery.data, realtime]);
  const store = isDemo ? demoStore : publicStore;
  const products = useMemo(
    () => (isDemo ? demoProducts : deleted ? [] : withDerivedPrices(productsQuery.data ?? [])),
    [isDemo, deleted, productsQuery.data],
  );
  const categories = isDemo ? demoCategories : deleted ? [] : (categoriesQuery.data ?? []);

  const hasData = Boolean(store);
  const initialLoading =
    !isDemo &&
    ((storeQuery.isLoading && !storeQuery.data) ||
      (Boolean(storeQuery.data) && productsQuery.isLoading && !productsQuery.data));
  const loading = initialLoading;
  const productsLoading = !isDemo && productsQuery.isLoading;
  const initialFailure = !isDemo && !loading && !hasData && storeQuery.isError;
  const missing = initialFailure && isNotFoundError(storeQuery.error);
  const notFound = !isDemo && (deleted || (!loading && !hasData && (!storeQuery.isError || missing)));
  const error = initialFailure && !missing ? storeQuery.error : null;
  const productsError =
    !isDemo && productsQuery.isError && !productsQuery.data ? productsQuery.error : null;
  const isStoreActive = (store as (Store & { isActive?: boolean }) | null)?.isActive !== false;

  const currency = useMemo(
    () => getCurrencyByCode(store?.currency ?? DEFAULT_CURRENCY.code),
    [store?.currency],
  );

  const formatPrice = useCallback(
    (price: number): string => formatPriceUtil(price, currency.code),
    [currency.code],
  );

  useEffect(() => {
    if (isDemo) {
      applyTheme(demoStore.theme ?? defaultTheme);
      return () => resetTheme();
    }
    if (store) {
      applyTheme(store.theme ?? defaultTheme);
      return () => resetTheme();
    }
    applyTheme(defaultTheme);
    return () => resetTheme();
  }, [isDemo, store]);

  const refreshData = useCallback(async (): Promise<void> => {
    if (isDemo) return;
    await Promise.all([storeQuery.refetch(), productsQuery.refetch(), categoriesQuery.refetch()]);
  }, [isDemo, storeQuery, productsQuery, categoriesQuery]);

  const lastFetch = isDemo
    ? null
    : storeQuery.dataUpdatedAt
      ? new Date(storeQuery.dataUpdatedAt)
      : null;

  const value: StoreContextValue = {
    store,
    products,
    categories,
    loading,
    productsLoading,
    error,
    notFound,
    productsError,
    isStoreActive,
    currency,
    formatPrice,
    refreshData,
    lastFetch,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export default StoreContext;
