/**
 * Utils Index - Central export for all utilities
 */

export * from './themeUtils';
export * from './colorUtils';
export * from './numberUtils';
export { default as SlugService } from './slugService';

// Image compression
export * from './imageCompressor';

// Notifications - export from notifications.ts (local notifications)
export {
  isNotificationSupported,
  sendLocalNotification,
  notifyNewOrder,
  sendWhatsAppNotification,
  saveNotificationSettings,
  getNotificationSettings,
  type NotificationPermissionStatus,
  type LocalNotificationOptions as NotificationLocalOptions,
  type OrderNotificationData,
  type NotificationSettings,
} from './notifications';

// Push Notifications - export from pushNotifications.ts
export {
  getDeviceInfo,
  saveStoreNotificationConfig,
  getStoreNotificationConfig,
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  registerServiceWorker,
  subscribeToPush,
  unsubscribeFromPush,
  checkSubscriptionStatus,
  showLocalNotification,
  playNotificationSound,
  onServiceWorkerMessage,
  type DeviceInfo,
  type StoreNotificationConfig,
  type PermissionResult,
  type SubscribeResult,
  type SubscriptionStatus,
  type LocalNotificationOptions,
} from './pushNotifications';

// Order reminder
export * from './orderReminder';

// R2 Storage
export * from './r2Service';
