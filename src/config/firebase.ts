/**
 * Firebase Configuration - Auth + Cloud Messaging
 * Firestore has been removed, data is stored in Cloudflare D1
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence, type Auth } from 'firebase/auth';
import { getMessaging, getToken, onMessage, type Messaging, type MessagePayload } from 'firebase/messaging';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const firebaseConfig: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
};

const app: FirebaseApp = initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);

// حفظ تسجيل الدخول في المتصفح (localStorage)
void setPersistence(auth, browserLocalPersistence);

export const googleProvider: GoogleAuthProvider = new GoogleAuthProvider();

// Firebase Cloud Messaging
let messaging: Messaging | null = null;

/**
 * الحصول على FCM instance
 */
export function getFirebaseMessaging(): Messaging | null {
  if (typeof window === 'undefined') return null;
  if (!('Notification' in window)) return null;
  
  if (!messaging) {
    try {
      messaging = getMessaging(app);
    } catch (error) {
      console.error('Failed to initialize FCM:', error);
      return null;
    }
  }
  return messaging;
}

/**
 * الحصول على FCM Token
 */
export async function getFCMToken(): Promise<string | null> {
  try {
    const fcm = getFirebaseMessaging();
    if (!fcm) {
      console.log('FCM not available');
      return null;
    }

    // تسجيل Service Worker الخاص بـ FCM
    let swRegistration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    
    if (!swRegistration) {
      console.log('Registering FCM service worker...');
      swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      // انتظار تفعيل الـ SW
      await navigator.serviceWorker.ready;
    }

    // VAPID Key من Firebase Console
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    
    if (!vapidKey) {
      console.error('VAPID key not configured');
      return null;
    }
    
    console.log('Getting FCM token...');
    const token = await getToken(fcm, {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    });
    
    if (token) {
      console.log('FCM token obtained:', token.substring(0, 20) + '...');
    } else {
      console.log('No FCM token available');
    }
    
    return token || null;
  } catch (error) {
    console.error('Failed to get FCM token:', error);
    return null;
  }
}

/**
 * الاستماع للرسائل عندما التطبيق مفتوح
 */
export function onFCMMessage(callback: (payload: MessagePayload) => void): (() => void) | null {
  const fcm = getFirebaseMessaging();
  if (!fcm) return null;
  
  return onMessage(fcm, callback);
}

export default app;
