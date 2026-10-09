import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../firebase';

export interface AppNotification {
  id?: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  read: boolean;
  createdAt: number;
  targetRole?: 'Owner' | 'Staff' | 'All';
  link?: string;
}

const COLLECTION_NAME = 'notifications';

export const notificationService = {
  // Subscribe to unread notifications (real-time)
  subscribeToUnread(role: string, callback: (notifications: AppNotification[]) => void) {
    if (!db) return () => {};
    
    const notificationsRef = collection(db, COLLECTION_NAME);
    const q = query(
      notificationsRef,
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    return onSnapshot(q, (snapshot) => {
      const notifs: AppNotification[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as AppNotification;
        if (data.targetRole === 'All' || data.targetRole === role || (role === 'Owner')) {
          notifs.push({ ...data, id: doc.id });
        }
      });
      notifs.sort((a, b) => b.createdAt - a.createdAt);
      callback(notifs);
    });
  },

  async add(notification: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) {
    if (!db) return null;
    const notificationsRef = collection(db, COLLECTION_NAME);
    const newNotif: AppNotification = {
      ...notification,
      read: false,
      createdAt: Date.now(),
      targetRole: notification.targetRole || 'Owner',
    };
    const docRef = await addDoc(notificationsRef, newNotif);

    // Trigger FCM Push Notification
    try {
      fetch('/api/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newNotif.title,
          body: newNotif.message,
          targetRole: newNotif.targetRole,
          link: newNotif.link
        })
      }).catch(console.error); // Fire and forget
    } catch(e) {
      console.error('Failed to trigger push notification API', e);
    }

    return docRef.id;
  },

  async markAsRead(id: string) {
    if (!db) return;
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, { read: true });
  },

  async markAllAsRead(ids: string[]) {
    if (!db) return;
    const promises = ids.map(id => updateDoc(doc(db, COLLECTION_NAME, id), { read: true }));
    await Promise.all(promises);
  },

  async clearAll(ids: string[]) {
    if (!db) return;
    const promises = ids.map(id => deleteDoc(doc(db, COLLECTION_NAME, id)));
    await Promise.all(promises);
  },

  async delete(id: string) {
    if (!db) return;
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }
};
