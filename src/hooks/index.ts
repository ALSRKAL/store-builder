/**
 * Hooks Index - Central export for all custom hooks
 */

// Public Store Hooks
export {
  usePublicStore,
  usePublicProducts,
  usePublicCategories,
  usePublicPaymentMethods,
  usePublicStoreData,
} from './usePublicStore';

// Store Management Hooks
export {
  useStores,
  useStore,
  useCreateStore,
  useUpdateStore,
  useUpdateStoreTheme,
  useUpdateStoreAnnouncement,
  useUpdateStoreLocation,
  useUpdateStoreSocialLinks,
  useDeleteStore,
  useStoreMutations,
} from './useStores';

// Product Hooks
export {
  useProducts,
  useProduct,
  useProductMutations,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from './useProducts';

// Category Hooks
export {
  useCategories,
  useCategory,
  useCategoryMutations,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from './useCategories';

// Admin Profile Hooks
export {
  useAdminProfile,
  useAdminStats,
  useCreateAdminProfile,
  useUpdateAdminProfile,
  useUpdateLastLogin,
  useSubscribers,
  useGlobalStats,
  useSubscriberMutations,
} from './useAdminProfile';

// Order Hooks
export {
  useOrders,
  useOrder,
  useOrderStats,
  useCreatePublicOrder,
  useUpdateOrderStatus,
  useDeleteOrder,
  useOrderMutations,
} from './useOrders';

// Payment Method Hooks
export {
  usePaymentMethods,
  usePaymentReceipts,
  useCreatePaymentMethod,
  useUpdatePaymentMethod,
  useTogglePaymentMethod,
  useDeletePaymentMethod,
  useReorderPaymentMethods,
  useUpdateReceiptStatus,
  usePaymentMethodMutations,
  useSubmitReceipt,
} from './usePaymentMethods';

// Subscription Hooks
export {
  useSubscriptionStatus,
  useSubscriptionCodes,
  useVerifyCode,
  useStartTrial,
  useRenewSubscription,
  useGenerateCodes,
  useSubscriptionMutations,
  useIsSubscriptionActive,
} from './useSubscription';

// Push Notification Hooks
export {
  useSubscribePush,
  useUnsubscribePush,
  useSendPushNotification,
  usePushNotificationMutations,
  isPushSupported,
  getPushSubscription,
  requestPushPermission,
} from './usePushNotifications';
