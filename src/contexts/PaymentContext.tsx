/**
 * Payment Context
 * سياق مشترك لإدارة طرق الدفع في المتجر
 * متاح فقط للخطة السنوية
 * Type-safe implementation
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { useStore } from './StoreContext';
import { api } from '../services/api';
import type { PaymentMethod } from '../schemas';
import type { Store } from '../schemas/store';

// Payment context value interface
interface PaymentContextValue {
  paymentMethods: PaymentMethod[];
  loading: boolean;
  hasPaymentMethods: boolean;
  isAnnualPlan: boolean;
  refetch: () => Promise<void>;
}

// Create context
const PaymentContext = createContext<PaymentContextValue | null>(null);

// Props interface
interface PaymentProviderProps {
  children: ReactNode;
}

export function PaymentProvider({ children }: PaymentProviderProps): React.JSX.Element {
  const { store } = useStore();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  
  // منع الـ fetch المتكرر
  const hasFetched = useRef(false);
  const lastStoreId = useRef<string | null>(null);
  // يمنع استجابة متجر سابق من الكتابة فوق طرق دفع المتجر الحالي.
  const requestId = useRef(0);

  // التحقق من الخطة السنوية
  const storeData = store as (Store & { isAnnualPlan?: boolean }) | null;
  const isAnnualPlan = storeData?.isAnnualPlan === true;
  const storeSlug = storeData?.slug;
  const storeId = storeData?.id;
  const currentStoreIdentifier = storeSlug ?? storeId ?? null;

  // جلب طرق الدفع (فقط للخطة السنوية)
  const fetchPaymentMethods = useCallback(async (force = false): Promise<void> => {
    if (!currentStoreIdentifier) {
      setLoading(false);
      return;
    }

    // لا تجلب طرق الدفع إذا لم تكن الخطة سنوية
    if (!isAnnualPlan) {
      setPaymentMethods([]);
      setLoading(false);
      return;
    }

    // تجنب الـ fetch المتكرر إلا إذا تغير المتجر أو طُلب force
    if (!force && hasFetched.current && lastStoreId.current === currentStoreIdentifier) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const request = ++requestId.current;
      const methods = await api.publicPayments.getByStore(currentStoreIdentifier);
      if (request !== requestId.current) return;
      setPaymentMethods(Array.isArray(methods) ? methods : []);
      hasFetched.current = true;
      lastStoreId.current = currentStoreIdentifier;
    } catch (err) {
      console.error('Error fetching payment methods:', err);
      setPaymentMethods([]);
    } finally {
      setLoading(false);
    }
  }, [currentStoreIdentifier, isAnnualPlan]);

  // جلب طرق الدفع مرة واحدة عند تحميل المتجر
  useEffect(() => {
    if (store && currentStoreIdentifier && isAnnualPlan) {
      // فقط إذا تغير المتجر أو لم يتم الـ fetch بعد
      if (!hasFetched.current || lastStoreId.current !== currentStoreIdentifier) {
        void fetchPaymentMethods();
      }
    } else if (!isAnnualPlan) {
      // إذا لم تكن الخطة سنوية، امسح طرق الدفع وأبطل أي طلب جارٍ.
      requestId.current++;
      setPaymentMethods([]);
      hasFetched.current = false;
      setLoading(false);
    }
  }, [store, currentStoreIdentifier, isAnnualPlan, fetchPaymentMethods]);

  // التحقق من وجود طرق دفع (فقط للخطة السنوية)
  const hasPaymentMethods = isAnnualPlan && paymentMethods.length > 0;

  // دالة refetch تجبر إعادة الجلب
  const refetch = useCallback(async (): Promise<void> => {
    await fetchPaymentMethods(true);
  }, [fetchPaymentMethods]);

  const value: PaymentContextValue = {
    paymentMethods,
    loading,
    hasPaymentMethods,
    isAnnualPlan,
    refetch,
  };

  return <PaymentContext.Provider value={value}>{children}</PaymentContext.Provider>;
}

export function usePayment(): PaymentContextValue {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePayment must be used within PaymentProvider');
  }
  return context;
}

export default PaymentContext;
