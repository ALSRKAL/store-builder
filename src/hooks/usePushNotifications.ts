/**
 * usePushNotifications - Type-safe hooks for push notifications
 * Uses TanStack Query v5
 */

import { useMutation } from '@tanstack/react-query';
import { api } from '../services/api';

/**
 * Hook to subscribe to push notifications
 */
export function useSubscribePush() {
  return useMutation({
    mutationFn: ({
      storeId,
      subscription,
    }: {
      storeId: string;
      subscription: PushSubscriptionJSON;
    }) => api.push.subscribe(storeId, subscription),
  });
}

/**
 * Hook to unsubscribe from push notifications
 */
export function useUnsubscribePush() {
  return useMutation({
    mutationFn: ({ storeId, endpoint }: { storeId: string; endpoint: string }) =>
      api.push.unsubscribe(storeId, endpoint),
  });
}

/**
 * Hook to send push notification
 */
export function useSendPushNotification() {
  return useMutation({
    mutationFn: ({
      storeId,
      title,
      body,
      data,
    }: {
      storeId: string;
      title: string;
      body: string;
      data?: Record<string, unknown>;
    }) => api.push.send(storeId, title, body, data),
  });
}

/**
 * Hook for all push notification mutations
 */
export function usePushNotificationMutations() {
  const subscribe = useSubscribePush();
  const unsubscribe = useUnsubscribePush();
  const send = useSendPushNotification();

  return {
    subscribe,
    unsubscribe,
    send,
    isLoading: subscribe.isPending || unsubscribe.isPending || send.isPending,
  };
}

/**
 * Helper function to check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Helper function to get push subscription
 */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

/**
 * Helper function to request push permission
 */
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.requestPermission();
}
