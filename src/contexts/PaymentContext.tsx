/** Payment methods share the storefront query cache and realtime invalidation. */
import React, { createContext, useContext, useCallback, type ReactNode } from 'react';
import { useStore } from './StoreContext';
import { usePublicPaymentMethods } from '../hooks/usePublicStore';
import type { PaymentMethod } from '../schemas';

interface PaymentContextValue {
  paymentMethods: PaymentMethod[];
  loading: boolean;
  hasPaymentMethods: boolean;
  isAnnualPlan: boolean;
  refetch: () => Promise<void>;
}
const PaymentContext = createContext<PaymentContextValue | null>(null);
interface PaymentProviderProps { children: ReactNode }

export function PaymentProvider({ children }: PaymentProviderProps): React.JSX.Element {
  const { store } = useStore();
  const isAnnualPlan = store?.isAnnualPlan === true;
  const identifier = store?.slug ?? store?.id;
  const enabled = isAnnualPlan && store?.isActive !== false && identifier !== 'demo';
  const query = usePublicPaymentMethods(identifier, enabled);
  // Keep last successful methods on transient errors; never keep them on a real
  // downgrade/deletion or leak methods from a previously visited store.
  const paymentMethods = enabled ? query.data ?? [] : [];
  const refetch = useCallback(async (): Promise<void> => {
    if (enabled) await query.refetch();
  }, [enabled, query]);

  return <PaymentContext.Provider value={{
    paymentMethods,
    loading: enabled && query.isLoading,
    hasPaymentMethods: enabled && paymentMethods.length > 0,
    isAnnualPlan,
    refetch,
  }}>{children}</PaymentContext.Provider>;
}

export function usePayment(): PaymentContextValue {
  const context = useContext(PaymentContext);
  if (!context) throw new Error('usePayment must be used within PaymentProvider');
  return context;
}
export default PaymentContext;
