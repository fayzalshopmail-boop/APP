import { getToken, getMessaging, isSupported } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getApp } from 'firebase/app';

export const requestNotificationPermission = async (userEmail: string) => {
  if (typeof window === 'undefined') return null;

  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn('FCM is not supported in this browser');
      return null;
    }

    const app = getApp();
    const messaging = getMessaging(app);

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Register service worker explicitly with query params if needed, 
      // but Next.js public/ folder or API route handles it.
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      
      const token = await getToken(messaging, { 
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration
      });
      
      if (token && db) {
        // Save the token to the user's document
        await setDoc(doc(db, 'users', userEmail), {
          fcmToken: token,
          fcmTokenUpdatedAt: new Date().toISOString()
        }, { merge: true });
        
        console.log('FCM Token saved for push notifications');
        return token;
      }
    } else {
      console.warn('Notification permission denied');
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
  }
  return null;
};
